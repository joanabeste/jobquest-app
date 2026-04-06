'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Company, WorkspaceMember, WorkspaceRole, Permission, can as canRole } from '@/lib/types';
import { apiFetch } from '@/lib/api-fetch';

interface AuthContextType {
  company: Company | null;
  currentMember: WorkspaceMember | null;
  isLoading: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateCompany: (company: Company) => Promise<void>;
  register: (data: Omit<Company, 'id' | 'createdAt'> & { password: string }) => Promise<Company>;
  deleteAccount: () => Promise<void>;
  can: (permission: Permission) => boolean;
  startImpersonation: (companyId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [currentMember, setCurrentMember] = useState<WorkspaceMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.member && data.company) {
          setCurrentMember(data.member);
          setCompany(data.company);
          setIsImpersonating(data.isImpersonating ?? false);
          return;
        }
      }
    } catch { /* no session */ }
    setCompany(null);
    setCurrentMember(null);
    setIsImpersonating(false);
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setIsLoading(false));
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return data?.error ?? 'Anmeldung fehlgeschlagen.';
      setCurrentMember(data.member);
      setCompany(data.company);
      return null;
    } catch (err) {
      console.error('[auth] login error', err);
      return 'Netzwerkfehler. Bitte versuche es erneut.';
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[auth] logout error', err);
    } finally {
      setCompany(null);
      setCurrentMember(null);
      setIsImpersonating(false);
    }
  }, []);

  const updateCompany = useCallback(async (updated: Company) => {
    const data = await apiFetch<Company>('/api/companies/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setCompany(data);
  }, []);

  const register = useCallback(async (data: Omit<Company, 'id' | 'createdAt'> & { password: string }): Promise<Company> => {
    const result = await apiFetch<{ company: Company; member: WorkspaceMember }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setCompany(result.company);
    setCurrentMember(result.member);
    return result.company;
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!company) return;
    await apiFetch('/api/companies/me/delete', { method: 'POST' });
    setCompany(null);
    setCurrentMember(null);
  }, [company]);

  const checkCan = useCallback((permission: Permission): boolean =>
    canRole(currentMember?.role as WorkspaceRole | undefined, permission), [currentMember]);

  const startImpersonation = useCallback(async (companyId: string) => {
    await apiFetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId }),
    });
    await refreshSession();
  }, [refreshSession]);

  const stopImpersonation = useCallback(async () => {
    await apiFetch('/api/admin/impersonate', { method: 'DELETE' });
    await refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider value={{
      company,
      currentMember,
      isLoading,
      isImpersonating,
      login,
      logout,
      updateCompany,
      register,
      deleteAccount,
      can: checkCan,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
