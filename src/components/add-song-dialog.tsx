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
import { Song, SongCategory } from '@/types/song'
import { BgmTrack, BgmGenre, BgmTag } from '@/types/bgm'
import { triggerSongListRefresh, triggerSongUpdate } from '@/lib/song-events'
import { addSongApi, updateSongApi } from '@/lib/song-api'
import { addBgmApi } from '@/lib/bgm-api'
import { FirstVerseIcon, HighDifficultyIcon, LoopStationIcon, MrIcon } from '@/lib/song-utils'
import { TagSelector } from '@/components/ui/tag-selector'
import { CategorySelector } from '@/components/ui/category-selector'

interface AddSongDialogProps {
  onSongAdded?: () => void
  onSongUpdated?: (song: Song) => void
  onBgmAdded?: (bgm: BgmTrack) => void
  song?: Song | null
  mode?: 'add' | 'edit'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultTab?: 'song' | 'bgm'
}

export function AddSongDialog({ 
  onSongAdded, 
  onSongUpdated, 
  onBgmAdded,
  song, 
  mode = 'add',
  open: controlledOpen,
  onOpenChange,
  defaultTab = 'song'
}: AddSongDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'song' | 'bgm'>(defaultTab)
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    categories: [] as SongCategory[],
    videoUrl: '',
    videoUrl2: '',
    description: '',
    lyrics: '',
    isFirstVerseOnly: false,
    isHighDifficulty: false,
    isLoopStation: false,
    isMr: false
  })
  const [bgmFormData, setBgmFormData] = useState({
    videoUrl: '',
    title: '',
    genre: 'J-POP' as BgmGenre,
    tags: [] as BgmTag[]
  })
  const [error, setError] = useState('')

  // 외부에서 open 제어 가능
  const dialogOpen = controlledOpen !== undefined ? controlledOpen : open
  const setDialogOpen = onOpenChange || setOpen

  // BGM 장르 옵션
  const bgmGenres: { value: BgmGenre; label: string }[] = [
    { value: 'INST', label: 'Inst.' },
    { value: 'K_POP', label: 'K-POP' },
    { value: 'J_POP', label: 'J-POP' },
    { value: 'POP', label: 'POP' },
    { value: 'TOPGOL', label: '탑골가요' },
    { value: 'ETC', label: 'ETC' }
  ]

  // 수정 모드일 때 기존 노래 정보로 폼 초기화
  useEffect(() => {
    if (mode === 'edit' && song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        categories: song.categories || [],
        videoUrl: song.videoUrl || '',
        videoUrl2: song.videoUrl2 || '',
        description: song.description || '',
        lyrics: song.lyrics || '',
        isFirstVerseOnly: song.isFirstVerseOnly || false,
        isHighDifficulty: song.isHighDifficulty || false,
        isLoopStation: song.isLoopStation || false,
        isMr: song.isMr || false
      })
    } else if (mode === 'add') {
      // 추가 모드일 때 폼 초기화
      setFormData({
        title: '',
        artist: '',
        categories: ['KPOP'],
        videoUrl: '',
        videoUrl2: '',
        description: '',
        lyrics: '',
        isFirstVerseOnly: false,
        isHighDifficulty: false,
        isLoopStation: false,
        isMr: false
      })
    }
  }, [mode, song])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (activeTab === 'bgm') {
        // BGM 추가 로직
        const resultBgm = await addBgmApi(bgmFormData)
        onBgmAdded?.(resultBgm)
        // BGM 라이브러리 새로고침 이벤트 발생
        window.dispatchEvent(new CustomEvent('bgmLibraryRefresh'))
      } else {
        // 기존 노래 추가/수정 로직
        let resultSong
        if (mode === 'edit' && song) {
          // 수정 API 호출
          resultSong = await updateSongApi(song.id, formData)
          onSongUpdated?.(resultSong)
          triggerSongUpdate(resultSong)
        } else {
          // 추가 API 호출
          resultSong = await addSongApi(formData)
          onSongAdded?.()
          triggerSongListRefresh()
        }
      }
      
      setDialogOpen(false)
      // 폼 초기화
      if (activeTab === 'bgm') {
        setBgmFormData({
          videoUrl: '',
          title: '',
          genre: 'INST',
          tags: []
        })
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCategoriesChange = (categories: SongCategory[]) => {
    setFormData(prev => ({ ...prev, categories }))
  }

  const handleBgmInputChange = (field: string, value: string) => {
    setBgmFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBgmTagsChange = (tags: BgmTag[]) => {
    setBgmFormData(prev => ({ ...prev, tags }))
  }

  const getDialogTitle = () => {
    if (activeTab === 'bgm') {
      return 'BGM 추가'
    }
    return mode === 'edit' ? '노래 수정' : '노래 추가'
  }

  const getSubmitButtonText = () => {
    if (activeTab === 'bgm') {
      return 'BGM 추가'
    }
    return mode === 'edit' ? '수정' : '추가'
  }

  const getTriggerIcon = () => {
    return mode === 'edit' ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />
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
        
        {/* 탭 UI */}
        <div className="flex border-b mb-1">
          <button
            type="button"
            className={`px-3 py-2 ${activeTab === 'song' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
            onClick={() => setActiveTab('song')}
          >
            노래 추가
          </button>
          <button
            type="button"
            className={`px-3 py-2 ${activeTab === 'bgm' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
            onClick={() => setActiveTab('bgm')}
          >
            BGM 추가
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'song' ? (
            // 기존 노래 폼
            <>
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
                  <Label htmlFor="title">제목 *</Label>
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
                  <Label htmlFor="artist">아티스트 *</Label>
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
                <Label>카테고리 선택 *</Label>
                <CategorySelector
                  selectedCategories={formData.categories}
                  onCategoriesChange={handleCategoriesChange}
                  maxCategories={4}
                />
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
                  <Label>특별 조건</Label>
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
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isMr"
                      checked={formData.isMr}
                      onChange={(e) => handleInputChange('isMr', e.target.checked)}
                      disabled={loading}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="isMr" className="text-sm font-normal flex items-center gap-1">
                      <MrIcon /> MR
                    </Label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // BGM 폼
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bgmVideoUrl">YouTube URL *</Label>
                <Input
                  id="bgmVideoUrl"
                  value={bgmFormData.videoUrl}
                  onChange={(e) => handleBgmInputChange('videoUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?..."
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bgmTitle">제목</Label>
                <Input
                  id="bgmTitle"
                  value={bgmFormData.title}
                  onChange={(e) => handleBgmInputChange('title', e.target.value)}
                  placeholder="(선택) 비워두면 영상 제목으로 등록돼요"
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bgmGenre">카테고리 *</Label>
                <Select
                  value={bgmFormData.genre}
                  onValueChange={(value: BgmGenre) => handleBgmInputChange('genre', value)}
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
                  selectedTags={bgmFormData.tags}
                  onTagsChange={handleBgmTagsChange}
                  maxTags={3}
                />
              </div>
            </div>
          )}

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