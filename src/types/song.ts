// 이 파일은 Song 타입을 공통 정의합니다.
export type SongCategory = 'KPOP' | 'POP' | 'MISSION' | 'NEWSONG'

export interface Song {
  id: string
  title: string
  artist: string
  categories: SongCategory[]
  videoUrl?: string
  videoUrl2?: string // 유할매 버전 영상 URL
  description?: string
  lyrics?: string
  likeCount: number
  isFirstVerseOnly?: boolean
  isHighDifficulty?: boolean
  isLoopStation?: boolean
  isMr?: boolean
  createdAt: string
  progress?: number 
} 