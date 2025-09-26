// 이 파일은 사이트 상단 헤더 컴포넌트입니다. 불필요한 상태, dead code, 중복/비효율 useEffect, 메모리 누수 위험이 있는 부분을 정리합니다.
'use client'

import { Button } from '@/components/ui/button'
import { Sun, Moon, Settings, ListMusic } from 'lucide-react'
import { useState, useEffect } from 'react'
import { AddSongDialog } from './add-song-dialog'
import { LoginDialog } from './login-dialog'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'

export function Header() {
  const [dark, setDark] = useState<boolean>(false)
  const { isAdmin, isStaff, isVisitor, refreshAdmin } = useAdminAuth();
  const searchParams = useSearchParams()
  const isPopup = searchParams?.get('popup') === 'true'

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
    refreshAdmin();
  };

  const handleLogout = async () => {
    try {
      // 서버에 로그아웃 요청 (쿠키 삭제)
      await fetch('/api/login', { method: 'DELETE' });
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
    } finally {
      // 프론트엔드 상태 업데이트
      refreshAdmin();
    }
  };

  const openSongRequestWindow = () => {
    const currentWindow = window;
    const currentWidth = currentWindow.innerWidth;
    const currentHeight = Math.floor(currentWindow.innerHeight / 2);
    const currentX = currentWindow.screenX;
    const currentY = currentWindow.screenY + currentWindow.innerHeight;
    
    // 선곡표 창을 더 넓게 설정 (현재 창 너비의 1.1배)
    const songListWidth = Math.floor(currentWidth * 1.1);
    
    window.open(
      '/songlist?popup=true',
      '유할매 선곡표',
      `width=${songListWidth},height=${currentHeight},left=${currentX},top=${currentY},scrollbars=yes,resizable=yes`
    );
  };

  // 팝업 모드일 때 헤더 숨기기
  if (isPopup) {
    return null
  }

  return (
    <header className="border-b sticky top-0 z-100 bg-background">
      <div className="w-full px-4 py-2 flex items-center">
        <div className="flex items-center">
          <Link href="/" className="focus:outline-none">
            <h1 className="text-2xl font-bold text-black dark:text-white italic flex items-center gap-2 md:ml-16 ml-10 cursor-pointer hover:text-primary transition-colors">
              U_GrandMother
              <Image src="/icons/ugm.webp" alt="" className="h-11 w-8" width={32} height={44} />
            </h1>
          </Link>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          {/* 다크모드 토글 버튼 */}
          <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="다크모드 전환">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          {/* 선곡표 버튼 */}
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={openSongRequestWindow} aria-label="선곡표">
              <ListMusic className="h-5 w-5" />
            </Button>
          )}
          
          {/* 로그인 상태 표시 및 로그아웃 */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md border border-red-200 dark:border-red-700">
                유할매
              </span>
              <Button variant="outline" onClick={handleLogout}>
                그럼, 수고!
              </Button>
            </div>
          ) : isStaff ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-md border border-blue-200 dark:border-blue-700">
                할동부
              </span>
              <Button variant="outline" onClick={handleLogout}>
                퇴근체크
              </Button>
            </div>
          ) : isVisitor ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md border border-green-200 dark:border-green-700">
                연주자
              </span>
              <Button variant="outline" onClick={handleLogout}>
                안녕히가세요
              </Button>
            </div>
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