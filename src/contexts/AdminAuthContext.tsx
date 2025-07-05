// 관리자 인증 상태를 전역으로 관리하는 Context
import React, { createContext, useContext, useEffect, useState } from 'react';
import { isAdminAuthenticated } from '@/lib/auth';

interface AdminAuthContextType {
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  refreshAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  // 최초 마운트 시 API 기반 인증 상태 확인
  useEffect(() => {
    fetch('/api/auth', { method: 'GET' })
      .then(res => res.json())
      .then(data => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  // 인증 상태를 강제로 새로고침할 수 있는 함수
  const refreshAdmin = () => {
    fetch('/api/auth', { method: 'GET' })
      .then(res => res.json())
      .then(data => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false));
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, setIsAdmin, refreshAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
} 