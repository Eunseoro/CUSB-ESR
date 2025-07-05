// 이 파일은 앱 전체에 필요한 Provider들을 적용하는 컴포넌트입니다.
'use client'

import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
} 