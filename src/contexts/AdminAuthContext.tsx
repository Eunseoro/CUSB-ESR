// 관리자 인증 상태를 전역으로 관리하는 Context
import React, { createContext, useContext, useEffect, useState } from 'react';
import { isAdminAuthenticated, AdminRole } from '@/lib/auth';

interface AdminAuthContextType {
  isAdmin: boolean;
  role: AdminRole;
  isStaff: boolean;
  isVisitor: boolean;
  isGuest: boolean;
  setIsAdmin: (v: boolean) => void;  // 기존 호환성을 위해 유지
  setRole: (role: AdminRole) => void;
  refreshAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(AdminRole.GUEST);

  // 최초 마운트 시 API 기반 인증 상태 확인
  useEffect(() => {
    fetch('/api/auth', { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        const role = data.role || AdminRole.GUEST;
        setIsAdmin(role === AdminRole.ADMIN);
        setRole(role);
      })
      .catch(() => {
        setIsAdmin(false);
        setRole(AdminRole.GUEST);
      });
  }, []);

  // 인증 상태를 강제로 새로고침할 수 있는 함수
  const refreshAdmin = () => {
    fetch('/api/auth', { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        const role = data.role || AdminRole.GUEST;
        setIsAdmin(role === AdminRole.ADMIN);
        setRole(role);
      })
      .catch(() => {
        setIsAdmin(false);
        setRole(AdminRole.GUEST);
      });
  };

  return (
    <AdminAuthContext.Provider value={{ 
      isAdmin: role === AdminRole.ADMIN,  // ADMIN 등급만 true
      role, 
      isStaff: role === AdminRole.STAFF,
      isVisitor: role === AdminRole.VISITOR,
      isGuest: role === AdminRole.GUEST,
      setIsAdmin, 
      setRole,
      refreshAdmin 
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
} 