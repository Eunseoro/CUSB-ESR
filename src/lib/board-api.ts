// 이 파일은 게시판(Board) 관련 API 통신 함수들을 모아둔 유틸 파일입니다.
import { Board } from '@/types/board'

// 게시판 목록을 서버에서 50개씩 페이지네이션하여 가져오는 함수
export async function fetchBoardList(page: number = 1, limit: number = 50): Promise<Board[]> {
  const res = await fetch(`/api/board?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error('게시글 목록을 불러오지 못했습니다.')
  return res.json()
}

// 게시글 추가
export async function addBoard(author: string, content: string, userKey: string) {
  const res = await fetch('/api/board', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, content, userKey })
  })
  if (!res.ok) throw new Error('게시글 등록 실패')
  return res.json()
}

// 게시글 삭제
export async function deleteBoard(id: string, userKey: string) {
  const res = await fetch(`/api/board/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userKey })
  })
  if (!res.ok) throw new Error('게시글 삭제 실패')
  return res.json()
} 