// BGM 관련 API 함수들
import { BgmTrack, BgmGenre, BgmLibrary, BgmTag } from '@/types/bgm'

export const addBgmApi = async (data: {
  videoUrl: string
  genre: BgmGenre
  title?: string
  tags?: BgmTag[]
}): Promise<BgmTrack> => {
  const response = await fetch('/api/bgm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('BGM API error:', errorData)
    throw new Error(errorData.error || 'BGM 추가에 실패했습니다.')
  }

  return response.json()
}

export const getBgmLibraryApi = async (): Promise<BgmLibrary> => {
  const response = await fetch('/api/bgm')
  
  if (!response.ok) {
    throw new Error('BGM 라이브러리 로드에 실패했습니다.')
  }

  const data = await response.json()
  return data
}

export const updateBgmApi = async (id: string, data: Partial<BgmTrack>): Promise<BgmTrack> => {
  const response = await fetch(`/api/bgm/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('BGM update API error:', errorData)
    throw new Error('BGM 수정에 실패했습니다.')
  }

  return response.json()
}

export const updateBgmOrderApi = async (genre: BgmGenre, trackIds: string[]): Promise<void> => {
  const response = await fetch('/api/bgm/order', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ genre, trackIds }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('BGM order update API error:', errorData)
    throw new Error('BGM 순서 변경에 실패했습니다.')
  }
}

export const deleteBgmApi = async (id: string): Promise<void> => {
  const response = await fetch(`/api/bgm/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('BGM delete API error:', errorData)
    throw new Error('BGM 삭제에 실패했습니다.')
  }
} 