'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Topbar from '@/components/layout/Topbar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { company, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !company) {
      router.replace('/login');
    }
  }, [company, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <p className="text-slate-500 text-sm">Laden…</p>
        </div>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="pt-14">{children}</main>
    </div>
  );
}
