// OOTD 페이지 공통 타입 정의
export interface LookBookPost {
  id: string
  title: string
  content: string
  uploader: string
  viewCount?: number
  createdAt: string
  updatedAt: string
  images: { id: string; imageUrl: string; order: number }[]
}

export interface ImageFile {
  id: string
  file: File
  order: number
  preview?: string
}
