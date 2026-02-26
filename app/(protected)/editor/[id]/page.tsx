'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { questStorage } from '@/lib/storage';
import { JobQuest } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { slugify } from '@/lib/utils';
import FunnelEditor from '@/components/funnel-editor/FunnelEditor';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useAuth();
  const router = useRouter();
  const [quest, setQuest] = useState<JobQuest | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!company || !id) return;
    async function load() {
      const found = await questStorage.getById(id);
      if (!found || found.companyId !== company!.id) { setNotFound(true); return; }
      setQuest(found);
    }
    load();
  }, [id, company]);

  if (notFound) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600 font-medium">JobQuest nicht gefunden.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary">Zurück</button>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleTitleChange(title: string) {
    if (!quest) return;
    const updated = { ...quest, title, slug: slugify(title), updatedAt: new Date().toISOString() };
    await questStorage.save(updated);
    setQuest(updated);
  }

  async function handlePublish() {
    if (!quest) return;
    const newStatus = quest.status === 'published' ? 'draft' : 'published';
    const updated: JobQuest = {
      ...quest, status: newStatus,
      publishedAt: newStatus === 'published' ? new Date().toISOString() : quest.publishedAt,
      updatedAt: new Date().toISOString(),
    };
    await questStorage.save(updated);
    setQuest(updated);
  }

  return (
    <FunnelEditor
      contentId={quest.id}
      contentType="quest"
      title={quest.title}
      onTitleChange={handleTitleChange}
      slug={quest.slug}
      previewHref={`/jobquest/${quest.slug}`}
      status={quest.status}
      onPublish={handlePublish}
      onBack={() => router.push('/dashboard')}
    />
  );
}
