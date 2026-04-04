'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types';
import {
  LayoutDashboard, Users, LogOut, ChevronDown,
  Building2, KeyRound, ChevronRight,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Topbar() {
  const { company, currentMember, logout, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    router.push('/login');
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Kontakte', icon: Users },
  ];

  const role = currentMember?.role;
  const isPlatformAdmin = role === 'platform_admin';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-slate-200 grid grid-cols-3 items-center px-4 md:px-6">
      {/* Logo – left */}
      <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
        {company?.logo ? (
          <img src={company.logo} alt={company.name}
            className="h-8 w-8 rounded-lg object-contain border border-slate-200 flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">J</span>
          </div>
        )}
        <span className="font-semibold text-slate-900 truncate">
          {company?.name || 'JobQuest'}
        </span>
      </Link>

      {/* Nav – center */}
      <nav className="flex items-center justify-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <Icon size={15} />
              <span className="hidden sm:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User menu trigger – right */}
      <div className="flex justify-end">
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-violet-700 text-xs font-semibold">
              {currentMember?.name?.charAt(0).toUpperCase() || company?.contactName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <span className="hidden sm:block font-medium">
            {currentMember?.name || company?.contactName || 'Account'}
          </span>
          <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 overflow-hidden">

            {/* Account info */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-violet-700 text-sm font-bold">
                    {currentMember?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {currentMember?.name || company?.contactName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {currentMember?.email || company?.contactEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Settings section */}
            {!isPlatformAdmin && (
              <div className="py-1">
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Einstellungen</p>
                  <Link href="/settings" onClick={() => setMenuOpen(false)}
                    className="text-[10px] text-violet-600 hover:text-violet-700 font-medium flex items-center gap-0.5">
                    Alle <ChevronRight size={10} />
                  </Link>
                </div>

                {can('edit_company') && (
                  <Link href="/settings/company" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                      <Building2 size={13} className="text-violet-600" />
                    </div>
                    <span className="font-medium">Firmenprofil</span>
                  </Link>
                )}

                {can('view_team') && (
                  <Link href="/settings/team" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <Users size={13} className="text-blue-600" />
                    </div>
                    <span className="font-medium">Team</span>
                  </Link>
                )}

                <Link href="/settings/account" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                    <KeyRound size={13} className="text-slate-500" />
                  </div>
                  <span className="font-medium">Mein Konto</span>
                </Link>
              </div>
            )}

            {/* Logout */}
            <div className="border-t border-slate-100 mt-1 py-1">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                  <LogOut size={15} className="text-slate-500" />
                </div>
                <span className="font-medium">Abmelden</span>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
