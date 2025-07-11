// 이 파일은 비디오 플레이어 및 노래 상세 정보 컴포넌트입니다. 불필요한 상태, dead code, 중복/비효율 useEffect, 메모리 누수 위험이 있는 부분을 정리합니다.
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Music, Trash2 } from 'lucide-react'
import { AddSongDialog } from './add-song-dialog'
import { Button } from '@/components/ui/button'
import { Song } from '@/types/song'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { triggerSongDelete } from '@/lib/song-events'
import { Switch } from '@/components/ui/switch'
// song 관련 유틸 함수 import
import { formatDate, getCategoryColor, getCategoryLabel } from '@/lib/song-utils'
import { deleteSongApi } from '@/lib/song-api'

interface VideoPlayerProps {
  song: Song | null
  onSongUpdate?: (song: Song) => void
  onSongDelete?: (songId: string) => void
}

export function VideoPlayer({ song, onSongUpdate, onSongDelete }: VideoPlayerProps) {
  const { isAdmin } = useAdminAuth();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [showLyrics, setShowLyrics] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [useAltUrl, setUseAltUrl] = useState(false)

  useEffect(() => {
    if (!song) {
      setEmbedUrl(null)
      return
    }
    if (useAltUrl && song.videoUrl2) {
      setEmbedUrl(convertToEmbedUrl(song.videoUrl2))
    } else if (song.videoUrl) {
      setEmbedUrl(convertToEmbedUrl(song.videoUrl))
    } else {
      setEmbedUrl(null)
    }
  }, [song, useAltUrl])

  const convertToEmbedUrl = (url: string): string | null => {
    // YouTube URL 변환
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const youtubeMatch = url.match(youtubeRegex)
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0&modestbranding=1`
    }

    // Vimeo URL 변환
    const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/
    const vimeoMatch = url.match(vimeoRegex)
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`
    }
    
    return null
  }

  const handleDelete = async () => {
    if (!song) {
      return
    }
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteSongApi(song.id)
      triggerSongDelete(song.id)
      if (onSongDelete) onSongDelete(song.id)
    } catch (error) {
      console.error('Error deleting song:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSongUpdate = (updatedSong: Song) => {
    // 노래 수정 완료 시 콜백 호출
    if (onSongUpdate) onSongUpdate(updatedSong)
    setEditOpen(false)
  }

  // 스위치 상태 초기화: 노래가 바뀔 때마다 URL2가 있으면 true, 없으면 false로 초기화
  useEffect(() => {
    setUseAltUrl(!!song?.videoUrl2)
  }, [song])

  return (
    <div className="w-full h-full p-4 flex flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* 비디오 플레이어 */}
        <Card className="py-0">
          <CardContent className="p-0">
            <div className="aspect-video relative w-full bg-muted rounded-lg overflow-hidden">
              {song && embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={song.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                  <div className="text-center">
                    <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      {song ? '등록된 URL이 없거나, 지원하지 않는 형식입니다' : '노래를 선택해주세요'}
                    </p>
                    {song && !embedUrl && (
                      <p className="text-sm text-muted-foreground mt-2">
                        올바른 Youtube URL을 등록해 주세요
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 노래 정보 */}
        {song && (
          <Card className="mt-4">
            <CardHeader className="pb-3 pt-6 -my-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{song.title}</CardTitle>
                  <p className="text-lg text-muted-foreground mt-1">{song.artist}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(song.category)}`}>
                      {getCategoryLabel(song.category)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(song.createdAt)}
                    </span>
                  </div>
                </div>
                {/* URL 스위치: 우상단 */}
                {song.videoUrl2 && (
                  <div className="flex flex-col items-center gap-1 border border-gray-300 rounded-md p-2 bg-white/70 dark:bg-[#171717] shadow-sm">
                    <span className="text-xs font-semibold text-black dark:text-white">Cover</span>
                    <Switch checked={useAltUrl} onCheckedChange={setUseAltUrl} />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {song.description && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">설명</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {song.description}
                  </p>
                </div>
              )}
              
              {song.lyrics && (
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className="font-medium">가사</h4>
                    <button
                      onClick={() => setShowLyrics(!showLyrics)}
                      className="text-sm text-primary hover:underline"
                    >
                      {showLyrics ? '접기' : '펼치기'}
                    </button>
                  </div>
                  {showLyrics && (
                    <ScrollArea className="h-60 border rounded-md p-3">
                      <p className="text-sm whitespace-pre-wrap">{song.lyrics}</p>
                    </ScrollArea>
                  )}
                </div>
              )}
              
              {/* 수정/삭제 버튼 - 관리자만 표시 */}
              {isAdmin && (
                <div className="flex gap-2 justify-start mt-4">
                  <AddSongDialog
                    mode="edit"
                    song={song}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    onSongUpdated={handleSongUpdate}
                  />
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-0" />
                    삭제
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 