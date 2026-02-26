'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Users, KeyRound, Settings } from 'lucide-react';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  {
    href: '/settings/company',
    label: 'Firmenprofil',
    desc: 'Logo, Branche, Design',
    icon: Building2,
    permission: 'edit_company' as const,
  },
  {
    href: '/settings/team',
    label: 'Team',
    desc: 'Mitglieder & Rollen',
    icon: Users,
    permission: 'view_team' as const,
  },
  {
    href: '/settings/account',
    label: 'Mein Konto',
    desc: 'Passwort & Account',
    icon: KeyRound,
    permission: null,
  },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { can, currentMember } = useAuth();
  const isPlatformAdmin = currentMember?.role === 'platform_admin';

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Einstellungen</h2>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, desc, icon: Icon, permission }) => {
            if (isPlatformAdmin) return null;
            if (permission && !can(permission)) return null;
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
                  active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  active ? 'bg-violet-100' : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  <Icon size={15} className={active ? 'text-violet-600' : 'text-slate-500'} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{label}</p>
                  <p className={`text-xs mt-0.5 ${active ? 'text-violet-500' : 'text-slate-400'}`}>{desc}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </div>
    </div>
  );
}
