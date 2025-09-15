// 이 파일은 관리자 인증을 위한 유틸리티 함수들입니다.

// 관리자 등급 정의
export enum AdminRole {
  ADMIN = 'admin',           // 1등급: 최고 관리자 (ADMIN_PASSWORD)
  STAFF = 'staff',           // 2등급: 스탭 (STAFF_PASSWORD)
  VISITOR = 'visitor',       // 3등급: 비지터 (VISITOR_PASSWORD)
  GUEST = 'guest'            // 4등급: 게스트 (비로그인)
}

// 관리자 비밀번호 확인 및 등급 반환
export function verifyAdminPassword(password: string): { role: AdminRole } | null {
  // 환경변수에서 각 등급별 패스워드 가져오기
  const adminPassword = process.env.ADMIN_PASSWORD;
  const staffPassword = process.env.STAFF_PASSWORD;
  const visitorPassword = process.env.VISITOR_PASSWORD;
  
  if (password === adminPassword) return { role: AdminRole.ADMIN };
  if (password === staffPassword) return { role: AdminRole.STAFF };
  if (password === visitorPassword) return { role: AdminRole.VISITOR };
  
  return null; // 인증 실패
}

// 관리자 세션 키
export const ADMIN_SESSION_KEY = 'admin_authenticated'


export function isAdminAuthenticated(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(cookie => cookie.trim().startsWith('admin_session=admin'));
}


export function setAdminAuthenticated(authenticated: boolean): void {
  if (typeof document === 'undefined') return;
  if (!authenticated) {

    document.cookie = 'admin_session=; Max-Age=0; path=/;';
  }

  window.dispatchEvent(new CustomEvent('adminAuthChanged', { 
    detail: { isAuthenticated: authenticated } 
  }))
}


export function onAdminAuthChange(callback: (isAuthenticated: boolean) => void): () => void {
  const handleAuthChange = (event: CustomEvent) => {
    callback(event.detail.isAuthenticated)
  }
  window.addEventListener('adminAuthChanged', handleAuthChange as EventListener)
  return () => {
    window.removeEventListener('adminAuthChanged', handleAuthChange as EventListener)
  }
} 