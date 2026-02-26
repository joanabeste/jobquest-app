'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, WorkspaceMember, WorkspaceRole, Permission, can as canRole } from '@/lib/types';
import { companyStorage, authSession, memberStorage, questStorage, careerCheckStorage, formPageStorage, leadStorage, careerCheckLeadStorage, formSubmissionStorage } from '@/lib/storage';
import { funnelStorage } from '@/lib/funnel-storage';

interface AuthContextType {
  company: Company | null;
  currentMember: WorkspaceMember | null;
  isLoading: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateCompany: (company: Company) => void;
  register: (data: Omit<Company, 'id' | 'createdAt'>) => Company;
  deleteAccount: () => void;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Ensure a company has at least one superadmin member. Creates one from legacy data if missing. */
function ensureSuperAdmin(company: Company): WorkspaceMember {
  const existing = memberStorage.getByCompany(company.id).find((m) => m.role === 'superadmin');
  if (existing) return existing;

  const member: WorkspaceMember = {
    id: crypto.randomUUID(),
    companyId: company.id,
    name: company.contactName,
    email: company.contactEmail,
    password: company.password,
    role: 'superadmin',
    createdAt: company.createdAt,
    status: 'active',
  };
  memberStorage.save(member);
  return member;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [currentMember, setCurrentMember] = useState<WorkspaceMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to restore session from stored member ID
    const memberId = authSession.getCurrentMemberId();
    if (memberId) {
      const member = memberStorage.getById(memberId);
      if (member) {
        const comp = companyStorage.getById(member.companyId);
        if (comp) {
          setCurrentMember(member);
          setCompany(comp);
          setIsLoading(false);
          return;
        }
      }
    }

    // Legacy migration: old session stored companyId directly
    const companyId = authSession.getCurrentCompanyId();
    if (companyId) {
      const comp = companyStorage.getById(companyId);
      if (comp) {
        const member = ensureSuperAdmin(comp);
        authSession.setCurrentMemberId(member.id);
        setCurrentMember(member);
        setCompany(comp);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
  }, []);

  const login = (email: string, password: string): boolean => {
    // 1. Try members table first
    const member = memberStorage.getByEmail(email);
    if (member && member.password === password) {
      const comp = companyStorage.getById(member.companyId);
      if (comp) {
        setCurrentMember(member);
        setCompany(comp);
        authSession.setCurrentMemberId(member.id);
        return true;
      }
    }

    // 2. Legacy fallback: Company.contactEmail + Company.password
    const comp = companyStorage.getByEmail(email);
    if (comp && comp.password === password) {
      const superAdmin = ensureSuperAdmin(comp);
      setCurrentMember(superAdmin);
      setCompany(comp);
      authSession.setCurrentMemberId(superAdmin.id);
      return true;
    }

    return false;
  };

  const logout = () => {
    setCompany(null);
    setCurrentMember(null);
    authSession.clear();
  };

  const updateCompany = (updated: Company) => {
    companyStorage.save(updated);
    setCompany(updated);
  };

  const register = (data: Omit<Company, 'id' | 'createdAt'>): Company => {
    const newCompany: Company = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    companyStorage.save(newCompany);

    // Create the superadmin member for the registering user
    const member: WorkspaceMember = {
      id: crypto.randomUUID(),
      companyId: newCompany.id,
      name: data.contactName,
      email: data.contactEmail,
      password: data.password,
      role: 'superadmin',
      createdAt: newCompany.createdAt,
      status: 'active',
    };
    memberStorage.save(member);

    setCompany(newCompany);
    setCurrentMember(member);
    authSession.setCurrentMemberId(member.id);
    return newCompany;
  };

  const deleteAccount = () => {
    if (!company) return;
    const companyId = company.id;

    // Collect all content IDs first (for funnel doc cleanup)
    const quests = questStorage.getByCompany(companyId);
    const checks = careerCheckStorage.getByCompany(companyId);
    const forms = formPageStorage.getByCompany(companyId);
    const contentIds = [
      ...quests.map((q) => q.id),
      ...checks.map((c) => c.id),
      ...forms.map((f) => f.id),
    ];

    // Delete all content
    quests.forEach((q) => questStorage.delete(q.id));
    checks.forEach((c) => careerCheckStorage.delete(c.id));
    forms.forEach((f) => formPageStorage.delete(f.id));

    // Delete leads and submissions
    leadStorage.deleteByCompany(companyId);
    careerCheckLeadStorage.deleteByCompany(companyId);
    formSubmissionStorage.deleteByCompany(companyId);

    // Delete funnel docs
    funnelStorage.deleteForContentIds(contentIds);

    // Delete members
    memberStorage.getByCompany(companyId).forEach((m) => memberStorage.delete(m.id));

    // Delete company
    companyStorage.delete(companyId);

    // Clear session + state
    authSession.clear();
    setCompany(null);
    setCurrentMember(null);
  };

  const checkCan = (permission: Permission): boolean =>
    canRole(currentMember?.role as WorkspaceRole | undefined, permission);

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
