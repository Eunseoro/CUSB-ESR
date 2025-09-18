// 이 파일은 좌측 사이드바 컴포넌트입니다. 
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Music, Music2, Star, Info, Menu, Trophy, SquarePen, ChartNoAxesColumn, Shirt, Shuffle, CircleDashed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import Image from 'next/image'
import { getCategoryLabel } from '@/lib/song-utils'

const menuItems = [
  { href: '/', label: '이용안내', icon: Info },
  { href: '/kpop', label: getCategoryLabel('KPOP'), icon: Music2, category: 'KPOP' },
  { href: '/pop', label: getCategoryLabel('POP'), icon: Music, category: 'POP' },
  { href: '/mission', label: getCategoryLabel('MISSION'), icon: Trophy, category: 'MISSION' },
  { href: '/newsong', label: getCategoryLabel('NEWSONG'), icon: Star, category: 'NEWSONG' },
  { href: '/roulette', label: '신청곡 룰렛', icon: Shuffle },
  { href: '/Spinner', label: '돌림판', icon: CircleDashed },
  { href: '/board', label: '쥐수게시판', icon: SquarePen },
  { href: '/lookbook', label: 'OOTD', icon: Shirt },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isPopup = searchParams?.get('popup') === 'true'
  const { isAdmin } = useAdminAuth();

  // 팝업 모드일 때 사이드바 숨기기
  if (isPopup) {
    return null
  }

  return (
    <>
      {/* Mobile menu button */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-[105] md:hidden"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 z-110 h-full w-64 bg-card border-r transform transition-transform duration-300 ease-in-out group/sidebar",
        "md:translate-x-0 md:w-16 md:flex-shrink-0 md:hover:w-64 md:hover:translate-x-0 md:transition-all",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full overflow-hidden relative border-r-0 md:border-r">
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3 mt-2">
              <h2 className="text-xl font-bold text-black dark:text-white whitespace-nowrap md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity text-left pl-1">
                유할매 노래책
              </h2>
            </div>

            <nav className="space-y-1 flex-1">
              {menuItems.slice(0, 1).map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary before:rounded-r"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className={cn(
                      "flex items-center justify-center",
                      isActive && "text-primary"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="whitespace-nowrap md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
              <div className="border-t p-0 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity" />
              {menuItems.slice(1, 5).map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary before:rounded-r"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className={cn(
                      "flex items-center justify-center",
                      isActive && "text-primary"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="whitespace-nowrap md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
              <div className="border-t p-0 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity" />
              {menuItems.slice(5, 7).map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary before:rounded-r"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className={cn(
                      "flex items-center justify-center",
                      isActive && "text-primary"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="whitespace-nowrap md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
              <div className="border-t p-0 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity" />
              {menuItems.slice(7, 9).map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-8 before:w-1 before:bg-primary before:rounded-r"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className={cn(
                      "flex items-center justify-center",
                      isActive && "text-primary"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="whitespace-nowrap md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
              <div className="border-t p-0 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity" />
              {/* 관리자 인증 시에만 '통계' 탭 노출 */}
              {isAdmin && (
                <Link
                  href="/admin/statistics"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative text-muted-foreground hover:bg-accent hover:text-accent-foreground md:flex"
                  )}
                  onClick={() => setIsOpen(false)}
                  style={{ minHeight: 40 }}
                >
                  <ChartNoAxesColumn className="h-5 w-5 shrink-0" />
                  <span className="whitespace-nowrap transition-opacity md:opacity-0 md:group-hover/sidebar:opacity-100">
                    관리 도구
                  </span>
                </Link>
              )}
            </nav>

            {/* 하단 아이콘 영역 */}
            <div className="flex flex-row gap-4 mb-4 justify-center md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity">
              <a href="https://chzzk.naver.com/2c0c0ff859f6cb8045a3cdf99b3b9b54" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                <Image src="/icons/chzzk.webp" alt="치지직" className="h-7 w-7" width={28} height={28} />
              </a>
              <a href="https://youtube.com/@u_grandmother?si=XOVQqg6fS8yMOcpX" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                <Image src="/icons/youtube.webp" alt="유튜브" className="h-7 w-7" width={28} height={28} />
              </a>
              <a href="https://cafe.naver.com/ugrandmother" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                <Image src="/icons/cafe.webp" alt="팬카페" className="h-7 w-7" width={28} height={28} />
              </a>
            </div>
            <div className="border-t pt-4 mt-auto">
              <p className="text-sm font-bold text-muted-foreground whitespace-nowrap md:opacity-0 md:group-hover/sidebar:opacity-100 transition-opacity">
                @ 치지직 유할매
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
} 