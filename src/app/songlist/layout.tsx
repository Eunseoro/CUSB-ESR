// 선곡표 페이지 전용 레이아웃 - 제목을 '유할매 선곡표'로 설정
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '유할매 선곡표',
  description: '음악 스트리머 유할매가 오늘 부를 송리스트입니다.',
}

export default function SongListLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
