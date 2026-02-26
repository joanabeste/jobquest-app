'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { questStorage } from '@/lib/storage';
import { JobQuest } from '@/lib/types';
import { generateSlug } from '@/lib/utils';

export default function NewEditorPage() {
  const { company } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!company) return;
    const id = crypto.randomUUID();
    const newQuest: JobQuest = {
      id,
      companyId: company.id,
      title: 'Neue JobQuest',
      slug: generateSlug('neue-jobquest'),
      status: 'draft',
      modules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    questStorage.save(newQuest);
    router.replace(`/editor/${id}`);
  }, [company, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 text-sm">Erstelle neue JobQuest…</div>
    </div>
  );
}
