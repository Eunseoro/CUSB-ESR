// 이 파일은 노래 추가/수정 다이얼로그 컴포넌트입니다. 불필요한 상태, dead code, 중복/비효율 useEffect, 메모리 누수 위험이 있는 부분을 정리합니다.
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Edit } from 'lucide-react'
import { Song } from '@/types/song'
import { triggerSongListRefresh, triggerSongUpdate } from '@/lib/song-events'
import { addSongApi, updateSongApi } from '@/lib/song-api'
import { getCategoryLabel, FirstVerseIcon, HighDifficultyIcon, LoopStationIcon } from '@/lib/song-utils'

interface AddSongDialogProps {
  onSongAdded?: () => void
  onSongUpdated?: (song: Song) => void
  song?: Song | null
  mode?: 'add' | 'edit'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddSongDialog({ 
  onSongAdded, 
  onSongUpdated, 
  song, 
  mode = 'add',
  open: controlledOpen,
  onOpenChange
}: AddSongDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    category: '',
    videoUrl: '',
    videoUrl2: '',
    description: '',
    lyrics: '',
    isFirstVerseOnly: false,
    isHighDifficulty: false,
    isLoopStation: false
  })
  const [error, setError] = useState('')

  // 외부에서 open 제어 가능
  const dialogOpen = controlledOpen !== undefined ? controlledOpen : open
  const setDialogOpen = onOpenChange || setOpen

  // 수정 모드일 때 기존 노래 정보로 폼 초기화
  useEffect(() => {
    if (mode === 'edit' && song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        category: song.category || '',
        videoUrl: song.videoUrl || '',
        videoUrl2: song.videoUrl2 || '',
        description: song.description || '',
        lyrics: song.lyrics || '',
        isFirstVerseOnly: song.isFirstVerseOnly || false,
        isHighDifficulty: song.isHighDifficulty || false,
        isLoopStation: song.isLoopStation || false
      })
    } else if (mode === 'add') {
      // 추가 모드일 때 폼 초기화
      setFormData({
        title: '',
        artist: '',
        category: 'KPOP',
        videoUrl: '',
        videoUrl2: '',
        description: '',
        lyrics: '',
        isFirstVerseOnly: false,
        isHighDifficulty: false,
        isLoopStation: false
      })
    }
  }, [mode, song])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let resultSong
      if (mode === 'edit' && song) {
        // 수정 API 호출
        resultSong = await updateSongApi(song.id, formData)
      } else {
        // 추가 API 호출
        resultSong = await addSongApi(formData)
      }

      if (!resultSong) {
        throw new Error(`${mode === 'edit' ? '노래 수정' : '노래 추가'}에 실패했습니다.`)
      }

      console.log(`${mode === 'edit' ? 'Song updated' : 'Song added'}:`, resultSong)
      
      setDialogOpen(false)
      setFormData({
        title: '',
        artist: '',
        category: '',
        videoUrl: '',
        videoUrl2: '',
        description: '',
        lyrics: '',
        isFirstVerseOnly: false,
        isHighDifficulty: false,
        isLoopStation: false
      })
      setError('')
      
      if (mode === 'edit') {
        // 노래 수정 완료 시 이벤트 발생
        if (song) {
          triggerSongUpdate(song.id, resultSong)
        }
        onSongUpdated?.(resultSong)
      } else {
        // 노래 추가 완료 시 목록 새로고침 이벤트 발생
        triggerSongListRefresh()
        onSongAdded?.()
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} song:`, error)
      setError(error instanceof Error ? error.message : `${mode === 'edit' ? '노래 수정' : '노래 추가'} 중 오류가 발생했습니다.`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getDialogTitle = () => {
    return mode === 'edit' ? '노래 수정' : '새 노래 추가'
  }

  const getSubmitButtonText = () => {
    return mode === 'edit' ? '수정' : '추가'
  }

  const getTriggerIcon = () => {
    return mode === 'edit' ? <Edit className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-0" />
  }

  const getTriggerText = () => {
    return mode === 'edit' ? '수정' : '노래 추가'
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {mode === 'edit' ? (
          <Button variant="outline" size="sm">
            {getTriggerIcon()}
            {getTriggerText()}
          </Button>
        ) : (
          <Button>
            {getTriggerIcon()}
            {getTriggerText()}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="videoUrl">YouTube URL</Label>
            <Input
              id="videoUrl"
              value={formData.videoUrl}
              onChange={(e) => handleInputChange('videoUrl', e.target.value)}
              placeholder="https://www.youtube.com/watch?..."
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="videoUrl2">유할매 Cover URL</Label>
            <Input
              id="videoUrl2"
              value={formData.videoUrl2 || ''}
              onChange={(e) => handleInputChange('videoUrl2', e.target.value)}
              placeholder="(선택) 유할매 버전만 등록해 주세요"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">          
          <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="노래 제목"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">아티스트</Label>
              <Input
                id="artist"
                value={formData.artist}
                onChange={(e) => handleInputChange('artist', e.target.value)}
                placeholder="아티스트명"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">카테고리 *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KPOP">{getCategoryLabel('KPOP')}</SelectItem>
                <SelectItem value="POP">{getCategoryLabel('POP')}</SelectItem>
                <SelectItem value="MISSION">{getCategoryLabel('MISSION')}</SelectItem>
                <SelectItem value="NEWSONG">{getCategoryLabel('NEWSONG')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="(선택) 노래에 대한 설명"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lyrics">가사</Label>
            <Textarea
              id="lyrics"
              value={formData.lyrics}
              onChange={(e) => handleInputChange('lyrics', e.target.value)}
              placeholder="(선택) 노래 가사"
              rows={6}
              disabled={loading}
            />
          </div>

          {/* 특별 조건 체크박스들 */}
          <div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isFirstVerseOnly"
                  checked={formData.isFirstVerseOnly}
                  onChange={(e) => handleInputChange('isFirstVerseOnly', e.target.checked)}
                  disabled={loading}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isFirstVerseOnly" className="text-sm font-normal flex items-center gap-1">
                  <FirstVerseIcon /> 1절만
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isHighDifficulty"
                  checked={formData.isHighDifficulty}
                  onChange={(e) => handleInputChange('isHighDifficulty', e.target.checked)}
                  disabled={loading}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isHighDifficulty" className="text-sm font-normal flex items-center gap-1">
                  <HighDifficultyIcon /> 고난이도
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isLoopStation"
                  checked={formData.isLoopStation}
                  onChange={(e) => handleInputChange('isLoopStation', e.target.checked)}
                  disabled={loading}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isLoopStation" className="text-sm font-normal flex items-center gap-1">
                  <LoopStationIcon /> 루프 스테이션
                </Label>
              </div>
            </div>
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
              {getSubmitButtonText()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 