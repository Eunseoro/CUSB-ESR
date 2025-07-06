// 이 파일은 앱 전체 레이아웃을 정의합니다.
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { TopButton } from '@/components/top-button'
import { isAdminAuthenticated } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '유할매 노래책',
  description: '치지직 음악 스트리머 유할매의 신청곡 리스트',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 flex flex-col md:flex-row md:ml-16">
                {children}
              </main>
            </div>
            {typeof window !== 'undefined' && isAdminAuthenticated() && (
              <a href="/admin/statistics" style={{ marginLeft: 16, color: '#0070f3', fontWeight: 'bold' }}>방문자 통계</a>
            )}
            <TopButton />
          </div>
        </Providers>
      </body>
    </html>
  )
}
