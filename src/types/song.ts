// 이 파일은 Song 타입을 공통 정의합니다.
export interface Song {
  id: string
  title: string
  artist: string
  category: string
  videoUrl?: string
  videoUrl2?: string // 유할매 버전 영상 URL
  description?: string
  lyrics?: string
  likeCount: number
  isFirstVerseOnly?: boolean
  isHighDifficulty?: boolean
  isLoopStation?: boolean
  createdAt: string
  progress?: number // 진행도(게이지) 0~100
} 