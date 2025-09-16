// 악보 이미지 업로드 컨텐츠 컴포넌트
'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload, Trash2 } from 'lucide-react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

interface ScoreImage {
  id: string
  imageUrl: string
  order: number
}

export function ScoreUploadContent() {
  const searchParams = useSearchParams()
  const { isAdmin } = useAdminAuth()
  const songId = searchParams?.get('songId')
  const isPopup = searchParams?.get('popup') === 'true'

  const [images, setImages] = useState<ScoreImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [songTitle, setSongTitle] = useState('')

  // 팝업 모드일 때 스타일 적용
  useEffect(() => {
    if (isPopup) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isPopup])

  // 노래 정보 로드
  const loadSongInfo = useCallback(async () => {
    if (!songId) return
    
    try {
      const response = await fetch(`/api/songs/${songId}`)
      if (response.ok) {
        const song = await response.json()
        setSongTitle(song.title || '알 수 없는 노래')
      }
    } catch (error) {
      console.error('노래 정보 로드 실패:', error)
    }
  }, [songId])

  // 이미지 로드
  const loadImages = useCallback(async () => {
    if (!songId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/songs/${songId}/score-images`)
      if (response.ok) {
        const data = await response.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('이미지 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [songId])

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (songId) {
      loadSongInfo()
      loadImages()
    }
  }, [songId, loadSongInfo, loadImages])

  // 이미지 업로드
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!songId || !e.target.files) return
    
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // 파일 크기 확인 (30MB 제한)
    const maxSize = 30 * 1024 * 1024
    const oversizedFiles = files.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      alert('파일 크기는 30MB를 초과할 수 없습니다.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('songId', songId)
      files.forEach((file, index) => {
        formData.append('images', file)
        formData.append('orders', (images.length + index).toString())
      })

      const response = await fetch('/api/songs/score-images', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        await loadImages() // 이미지 목록 새로고침
      } else {
        const error = await response.json()
        alert(`업로드 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('업로드 실패:', error)
      alert('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }, [songId, images.length, loadImages])

  // 이미지 삭제
  const handleImageDelete = useCallback(async (imageId: string) => {
    if (!confirm('이미지를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/songs/score-images/${imageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadImages() // 이미지 목록 새로고침
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }, [loadImages])


  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground mb-4">관리자만 악보 이미지를 업로드할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  if (!songId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">노래 정보가 없습니다</h1>
          <p className="text-muted-foreground mb-4">올바른 노래를 선택해주세요.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${isPopup ? 'w-full h-screen flex flex-col' : ''}`}>
      {/* 헤더 - 축소된 크기 */}
      <div className="border-b border-border p-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground">
              그림일기 - {songTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* 업로드 버튼 */}
            <input
              type="file"
              id="score-upload"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="score-upload">
              <Button
                asChild
                variant="outline"
                disabled={uploading}
                size="sm"
              >
                <span>
                  <Upload className="w-4 h-4 mr-1" />
                  {uploading ? '업로드 중...' : '업로드'}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 - 전체 화면 이미지 표시 */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">등록된 악보가 없습니다.</div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {images
              .sort((a, b) => a.order - b.order)
              .map((image) => (
                <div key={image.id} className="relative group w-full h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                  <img
                    src={image.imageUrl}
                    alt={`악보 ${image.order + 1}`}
                    className="max-w-full max-h-full object-contain"
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleImageDelete(image.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
