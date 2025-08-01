// 이 파일은 사이트 상단 헤더 컴포넌트입니다. 불필요한 상태, dead code, 중복/비효율 useEffect, 메모리 누수 위험이 있는 부분을 정리합니다.
'use client'

import { Button } from '@/components/ui/button'
import { Sun, Moon, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { AddSongDialog } from './add-song-dialog'
import { LoginDialog } from './login-dialog'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import Link from 'next/link'

export function Header() {
  const [dark, setDark] = useState<boolean>(false)
  const { isAdmin, setIsAdmin, refreshAdmin } = useAdminAuth();

  useEffect(() => {
    // 다크모드 설정
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setDark(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDark(false)
    }
  }, [])

  const toggleDark = () => {
    if (dark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setDark(true)
    }
  }

  const handleAdminSuccess = () => {
    setIsAdmin(true);
  };

  const handleLogout = async () => {
    try {
      // 서버에 로그아웃 요청 (쿠키 삭제)
      await fetch('/api/login', { method: 'DELETE' });
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    } finally {
      // 프론트엔드 상태 업데이트
      setIsAdmin(false);
    }
  };

  return (
    <header className="border-b sticky top-0 z-100 bg-background">
      <div className="w-full px-4 py-2 flex items-center">
        <div className="flex items-center">
          <Link href="/" className="focus:outline-none">
            <h1 className="text-2xl font-bold text-black dark:text-white italic flex items-center gap-2 md:ml-16 ml-10 cursor-pointer hover:text-primary transition-colors">
              U_GrandMother
              <img src="/icons/ugm.webp" className="h-11 w-8" />
            </h1>
          </Link>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          {/* 다크모드 토글 버튼 */}
          <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="다크모드 전환">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          {/* 관리자 인증/로그아웃 */}
          {isAdmin ? (
            <Button variant="outline" onClick={handleLogout}>
              Sign Out
            </Button>
          ) : (
            <LoginDialog onSuccess={handleAdminSuccess}>
              <Button variant="ghost">
              <Settings className="h-5 w-5"></Settings>
              </Button>
            </LoginDialog>
          )}
          
          {/* 노래 추가 버튼 */}
          {isAdmin && <AddSongDialog onSongAdded={() => {}} />}
        </div>
      </div>
    </header>
  )
} 