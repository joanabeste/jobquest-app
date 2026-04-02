'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Company, WorkspaceMember, WorkspaceRole, Permission, can as canRole } from '@/lib/types';
import { apiFetch } from '@/lib/api-fetch';

interface AuthContextType {
  company: Company | null;
  currentMember: WorkspaceMember | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateCompany: (company: Company) => Promise<void>;
  register: (data: Omit<Company, 'id' | 'createdAt'> & { password: string }) => Promise<Company>;
  deleteAccount: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [currentMember, setCurrentMember] = useState<WorkspaceMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.member && data.company) {
            setCurrentMember(data.member);
            setCompany(data.company);
          }
        }
      } catch {
        // No session
      }
      setIsLoading(false);
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setCurrentMember(data.member);
      setCompany(data.company);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCompany(null);
    setCurrentMember(null);
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

  return (
    <AuthContext.Provider value={{
      company,
      currentMember,
      isLoading,
      login,
      logout,
      updateCompany,
      register,
      deleteAccount,
      can: checkCan,
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
