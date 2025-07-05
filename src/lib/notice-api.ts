// 이 파일은 공지사항 관련 API 통신 함수들을 모아둔 유틸 파일입니다.
import { Notice } from '@/types/notice'

// 공지사항을 서버에서 가져오는 함수
export async function fetchNotice(): Promise<Notice> {
  const res = await fetch('/api/notice')
  if (!res.ok) throw new Error('공지사항을 불러오지 못했습니다.')
  return res.json()
}

// 공지사항 내용을 서버에 수정하는 함수 (관리자만)
export async function updateNotice(content: string) {
  const res = await fetch('/api/notice', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  if (!res.ok) throw new Error('공지사항 수정 실패')
  return res.json()
}

// 공지사항 ON/OFF를 서버에 반영하는 함수 (관리자만)
export async function toggleNotice(isVisible: boolean) {
  const res = await fetch('/api/notice', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isVisible })
  })
  if (!res.ok) throw new Error('공지사항 ON/OFF 실패')
  return res.json()
} 