// 이 파일은 노래 관련 API 통신 함수들을 모아둔 유틸 파일입니다.
import { Song } from '@/types/song'
import { getAnonymousId } from './anonymous'

// 곡 목록을 서버에서 가져오는 함수
export async function fetchSongsApi({ category, search, pageNum, limit = 50, sort = 'latest', signal }: { category?: string, search?: string, pageNum: number, limit?: number, sort?: string, signal?: AbortSignal }) {
  const params = new URLSearchParams()
  if (category) params.append('category', category)
  if (search) params.append('search', search)
  params.append('page', pageNum.toString())
  params.append('limit', limit.toString())
  params.append('sort', sort)
  
  const response = await fetch(`/api/songs?${params}`, {
    signal // AbortController signal 추가
  })
  if (!response.ok) throw new Error('곡 목록을 불러오지 못했습니다.')
  return response.json()
}

// 곡별 좋아요 상태를 서버에서 가져오는 함수
export async function fetchLikedSongsApi(songs: Song[]) {
  const likedStates: { [id: string]: boolean } = {}
  if (!songs || songs.length === 0) return likedStates
  const ids = songs.map(song => song.id)
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-anonymous-id': getAnonymousId()
  }
  const response = await fetch('/api/songs/like-states', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ids })
  })
  if (response.ok) {
    return await response.json()
  }
  return likedStates
}

// 곡 좋아요 상태를 서버에 반영하는 함수
export async function handleLikeApi(songId: string, liked: boolean) {
  const response = await fetch(`/api/songs/${songId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-anonymous-id': getAnonymousId()
    },
    body: JSON.stringify({ liked }),
  })
  if (!response.ok) throw new Error('좋아요 처리 실패')
  return response.json()
}

// 곡 진행도를 서버에 반영하는 함수
export async function handleProgressChangeApi(songId: string, value: number) {
  const response = await fetch(`/api/songs/${songId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ progress: value }),
  })
  if (!response.ok) throw new Error('진행도 변경 실패')
  return response.json()
}

// 곡을 서버에 추가하는 함수
export async function addSongApi(formData: Record<string, unknown>) {
  const response = await fetch('/api/songs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '노래 추가에 실패했습니다.')
  }
  return response.json()
}

// 곡을 서버에 수정하는 함수
export async function updateSongApi(songId: string, formData: Record<string, unknown>) {
  const response = await fetch(`/api/songs/${songId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData)
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '노래 수정에 실패했습니다.')
  }
  return response.json()
}

// 곡을 서버에서 삭제하는 함수
export async function deleteSongApi(songId: string) {
  const response = await fetch(`/api/songs/${songId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '노래 삭제에 실패했습니다.')
  }
  return true
} 