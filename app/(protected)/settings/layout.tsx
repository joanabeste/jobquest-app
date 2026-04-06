'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Users, KeyRound, Settings, BarChart2 } from 'lucide-react';
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
    href: '/settings/plan',
    label: 'Kontingent',
    desc: 'Plan & Nutzung',
    icon: BarChart2,
    permission: null,
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
  const { can, currentMember, isImpersonating } = useAuth();
  const isPlatformAdmin = currentMember?.role === 'platform_admin';

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar – horizontal tabs on mobile, vertical sidebar on desktop */}
      <aside className="md:w-60 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white">
        <div className="hidden md:block p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Einstellungen</h2>
          </div>
        </div>

        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 md:p-3 gap-1 md:gap-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, permission }) => {
            if (isPlatformAdmin && !isImpersonating) return null;
            if (permission && !can(permission)) return null;
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl transition-colors group whitespace-nowrap ${
                  active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  active ? 'bg-violet-100' : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  <Icon size={15} className={active ? 'text-violet-600' : 'text-slate-500'} />
                </div>
                <span className="text-sm font-medium">{label}</span>
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
