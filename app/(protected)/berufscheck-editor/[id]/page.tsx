'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { careerCheckStorage } from '@/lib/storage';
import { CareerCheck, Dimension } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { slugify } from '@/lib/utils';

const FunnelEditor = dynamic(() => import('@/components/funnel-editor/FunnelEditor'), { ssr: false });

export default function BerufsCheckEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useAuth();
  const router = useRouter();
  const [check, setCheck] = useState<CareerCheck | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!company || !id) return;
    async function load() {
      const found = await careerCheckStorage.getById(id);
      if (!found || found.companyId !== company!.id) { setNotFound(true); return; }
      setCheck(found);
    }
    load();
  }, [id, company]);

  if (notFound) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600 font-medium">Berufscheck nicht gefunden.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary">Zurück</button>
      </div>
    );
  }

  if (!check) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleTitleChange(title: string) {
    if (!check) return;
    const existingSuffix = check.slug.match(/-([a-z0-9]{6})$/)?.[1];
    const newBase = slugify(title) || 'check';
    const newSlug = existingSuffix ? `${newBase}-${existingSuffix}` : `${newBase}-${Math.random().toString(36).slice(2, 8)}`;
    const updated = { ...check, title, slug: newSlug, updatedAt: new Date().toISOString() };
    await careerCheckStorage.save(updated);
    setCheck(updated);
  }

  async function handleAIGenerated(dimensions: Dimension[], title?: string) {
    if (!check) return;
    const updated: CareerCheck = {
      ...check,
      dimensions,
      title: title || check.title,
      updatedAt: new Date().toISOString(),
    };
    await careerCheckStorage.save(updated);
    setCheck(updated);
  }

  async function handlePublish() {
    if (!check) return;
    const newStatus = check.status === 'published' ? 'draft' : 'published';
    const updated: CareerCheck = {
      ...check, status: newStatus,
      publishedAt: newStatus === 'published' ? new Date().toISOString() : check.publishedAt,
      updatedAt: new Date().toISOString(),
    };
    await careerCheckStorage.save(updated);
    setCheck(updated);
  }

  return (
    <FunnelEditor
      contentId={check.id}
      contentType="check"
      title={check.title}
      onTitleChange={handleTitleChange}
      slug={check.slug}
      previewHref={`/berufscheck/${check.slug}`}
      status={check.status}
      onPublish={handlePublish}
      onBack={() => router.push('/dashboard')}
      onAIGeneratedDimensions={handleAIGenerated}
    />
  );
}
