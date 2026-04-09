'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { formPageStorage } from '@/lib/storage';
import { FormPage } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';

const FunnelEditor = dynamic(() => import('@/components/funnel-editor/FunnelEditor'), { ssr: false });

export default function FormularEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { company } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [formPage, setFormPage] = useState<FormPage | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!company || !id) return;
    async function load() {
      const found = await formPageStorage.getById(id);
      if (!found || found.companyId !== company!.id) { setNotFound(true); return; }
      setFormPage(found);
    }
    load();
  }, [id, company]);

  if (notFound) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600 font-medium">Formular nicht gefunden.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-secondary">Zurück</button>
      </div>
    );
  }

  if (!formPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleTitleChange(title: string) {
    if (!formPage) return;
    const updated = { ...formPage, title, updatedAt: new Date().toISOString() };
    try {
      await formPageStorage.save(updated);
      setFormPage(updated);
    } catch {
      toast.error('Titel konnte nicht gespeichert werden.');
    }
  }

  function handleSlugChange(newSlug: string) {
    if (!formPage) return;
    setFormPage({ ...formPage, slug: newSlug });
  }

  async function handleUseCustomDomainChange(v: boolean) {
    if (!formPage) return;
    const updated = { ...formPage, useCustomDomain: v, updatedAt: new Date().toISOString() };
    try {
      await formPageStorage.save(updated);
      setFormPage(updated);
    } catch {
      toast.error('Domain-Einstellung konnte nicht gespeichert werden.');
    }
  }

  async function handlePublish() {
    if (!formPage) return;
    const newStatus = formPage.status === 'published' ? 'draft' : 'published';
    const updated: FormPage = {
      ...formPage, status: newStatus,
      publishedAt: newStatus === 'published' ? new Date().toISOString() : formPage.publishedAt,
      updatedAt: new Date().toISOString(),
    };
    try {
      await formPageStorage.save(updated);
      setFormPage(updated);
      toast.success(newStatus === 'published' ? 'Formular veröffentlicht.' : 'Formular auf Entwurf gesetzt.');
    } catch {
      toast.error('Status konnte nicht geändert werden.');
    }
  }

  return (
    <FunnelEditor
      contentId={formPage.id}
      contentType="form"
      title={formPage.title}
      onTitleChange={handleTitleChange}
      slug={formPage.slug}
      onSlugChange={handleSlugChange}
      useCustomDomain={formPage.useCustomDomain}
      onUseCustomDomainChange={handleUseCustomDomainChange}
      previewHref={`/formular/${formPage.slug}`}
      status={formPage.status}
      onPublish={handlePublish}
      onBack={() => router.push('/dashboard')}
    />
  );
}
