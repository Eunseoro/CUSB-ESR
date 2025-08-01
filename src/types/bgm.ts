// BGM 관련 타입 정의
export interface BgmTrack {
  id: string
  title?: string              // 자동 추출 또는 수동 입력
  videoUrl: string
  genre: BgmGenre
  tags: string[]              // 태그 배열
  duration?: number
  thumbnail?: string
  createdAt: Date
}

export type BgmGenre = 'INST' | 'K-POP' | 'J-POP' | 'POP' | '탑골가요' | 'ETC'

// 태그 타입 정의
export type BgmTag = '신나는' | '잔잔한' | '멋있는' | '감성적인' | '재밌는' | '애니메이션'

export const BGM_TAGS: BgmTag[] = ['신나는', '잔잔한', '멋있는', '감성적인', '재밌는', '애니메이션']

export interface BgmLibrary {
  [genre: string]: BgmTrack[]
}

export enum PlaybackMode {
  NORMAL = 'normal',           // 순차 재생
  SHUFFLE = 'shuffle',         // 랜덤 재생
  REPEAT_ALL = 'repeat_all',   // 전체 반복
  REPEAT_ONE = 'repeat_one'    // 한 곡 반복
}

export interface BgmPlayerState {
  currentTrack: BgmTrack | null
  currentGenre: BgmGenre | null
  isPlaying: boolean
  isExpanded: boolean
  playbackMode: PlaybackMode
  queue: BgmTrack[]
  volume: number
} 