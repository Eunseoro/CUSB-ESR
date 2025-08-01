// BGM 수정 다이얼로그 컴포넌트
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Edit2 } from 'lucide-react'
import { BgmTrack, BgmGenre, BgmTag } from '@/types/bgm'
import { updateBgmApi } from '@/lib/bgm-api'
import { TagSelector } from '@/components/ui/tag-selector'

interface BgmEditDialogProps {
  track: BgmTrack
  onBgmUpdated?: (track: BgmTrack) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BgmEditDialog({ 
  track, 
  onBgmUpdated,
  open: controlledOpen,
  onOpenChange
}: BgmEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: track.title || '',
    genre: track.genre,
    tags: (track.tags || []) as BgmTag[]
  })
  const [error, setError] = useState('')

  // 외부에서 open 제어 가능
  const dialogOpen = controlledOpen !== undefined ? controlledOpen : open
  const setDialogOpen = onOpenChange || setOpen

  // BGM 장르 옵션
  const bgmGenres: { value: BgmGenre; label: string }[] = [
    { value: 'INST', label: 'Inst.' },
    { value: 'K-POP', label: 'K-POP' },
    { value: 'J-POP', label: 'J-POP' },
    { value: 'POP', label: 'POP' },
    { value: '탑골가요', label: '탑골가요' },
    { value: 'ETC', label: 'ETC' }
  ]

  // 트랙이 변경될 때 폼 초기화
  useEffect(() => {
    setFormData({
      title: track.title || '',
      genre: track.genre,
      tags: (track.tags || []) as BgmTag[]
    })
  }, [track])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const updatedTrack = await updateBgmApi(track.id, formData)
      onBgmUpdated?.(updatedTrack)
      // BGM 라이브러리 새로고침 이벤트 발생
      window.dispatchEvent(new CustomEvent('bgmLibraryRefresh'))
      setDialogOpen(false)
    } catch (error) {
      console.error('Error updating BGM:', error)
      setError(error instanceof Error ? error.message : 'BGM 수정에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTagsChange = (tags: BgmTag[]) => {
    setFormData(prev => ({ ...prev, tags }))
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-1">
          <Edit2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>BGM 수정</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="BGM 제목"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="genre">카테고리</Label>
            <Select
              value={formData.genre}
              onValueChange={(value: BgmGenre) => handleInputChange('genre', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="장르를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {bgmGenres.map(genre => (
                  <SelectItem key={genre.value} value={genre.value}>
                    {genre.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>태그 선택 (최대 3개)</Label>
            <TagSelector
              selectedTags={formData.tags}
              onTagsChange={handleTagsChange}
              maxTags={3}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              수정
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 