// 확장된 플레이어 패널 컴포넌트
'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Play, Trash2, Edit2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BgmPlayerState, BgmTrack, PlaybackMode, BgmGenre } from '@/types/bgm'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { deleteBgmApi, updateBgmApi, updateBgmOrderApi } from '@/lib/bgm-api'
import { getBgmTagColor } from '@/lib/song-utils'
import { BgmEditDialog } from './BgmEditDialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ExpandedPlayerProps {
  playerState: BgmPlayerState
  library: { [genre: string]: BgmTrack[] } | null
  onPlayTrack: (track: BgmTrack) => void
  onTogglePlayPause: () => void
  onNextTrack: () => void
  onPreviousTrack: () => void
  onSetPlaybackMode: (mode: PlaybackMode) => void
  onSetQueue: (tracks: BgmTrack[]) => void
  onClose: () => void
  onInitializePlayer: (iframeElement: HTMLIFrameElement) => void
  youtubePlayer: any
  isPlayerReady: boolean
}

// 드래그 가능한 트랙 아이템 컴포넌트
function SortableTrackItem({ 
  track, 
  isActive, 
  onPlayTrack, 
  onDeleteTrack, 
  isAdmin,
  deletingTrackId
}: {
  track: BgmTrack
  isActive: boolean
  onPlayTrack: (track: BgmTrack) => void
  onDeleteTrack: (trackId: string, e: React.MouseEvent) => void
  isAdmin: boolean
  deletingTrackId: string | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'bg-muted hover:bg-muted/80'
      } ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onPlayTrack(track)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div>
            {/* 태그 표시 */}
            {track.tags && track.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {track.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getBgmTagColor(tag as any)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm font-medium text-foreground truncate">
              {track.title || 'Unknown Track'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onPlayTrack(track)
            }}
            className="p-1"
          >
            <Play className="h-3 w-3" />
          </Button>
          {isAdmin && (
            <>
              <div onClick={(e) => e.stopPropagation()}>
                <BgmEditDialog track={track} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteTrack(track.id, e)
                }}
                disabled={deletingTrackId === track.id}
                className="p-1 text-destructive hover:text-destructive"
              >
                {deletingTrackId === track.id ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive"></div>
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
              <div
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="h-3 w-3" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ExpandedPlayer({
  playerState,
  library,
  onPlayTrack,
  onTogglePlayPause,
  onNextTrack,
  onPreviousTrack,
  onSetPlaybackMode,
  onSetQueue,
  onClose,
  onInitializePlayer,
  youtubePlayer,
  isPlayerReady
}: ExpandedPlayerProps) {
  const [activeTab, setActiveTab] = useState<BgmGenre>('INST')
  const [iframeLoading, setIframeLoading] = useState(false)
  const [iframeStarted, setIframeStarted] = useState(false)
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<BgmTrack[]>([])
  const [pendingOrderUpdate, setPendingOrderUpdate] = useState<NodeJS.Timeout | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { isAdmin } = useAdminAuth()

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (pendingOrderUpdate) {
        clearTimeout(pendingOrderUpdate)
      }
    }
  }, [pendingOrderUpdate])

  // 확장 패널 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const expandedPanel = document.querySelector('[data-expanded-panel]')
      const footer = document.querySelector('[data-footer-player]')
      
      // 모달들도 제외
      const modals = document.querySelectorAll('[role="dialog"]')
      const isInModal = Array.from(modals).some(modal => modal.contains(target))
      
      // 푸터와 모달 클릭은 무시하고, 확장 패널 외부 클릭만 감지
      if (expandedPanel && !expandedPanel.contains(target) && !footer?.contains(target) && !isInModal) {
        onClose()
      }
    }

    if (playerState.isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [playerState.isExpanded, onClose])

  // 현재 탭의 트랙 목록 업데이트
  useEffect(() => {
    if (library && library[activeTab]) {
      const currentTracks = library[activeTab]
      setTracks(currentTracks)
      
      // 현재 탭의 모든 곡을 큐로 설정
      onSetQueue(currentTracks)
    } else {
      setTracks([])
      onSetQueue([])
    }
  }, [library, activeTab])

  // YouTube URL에서 비디오 ID 추출
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }
    return null
  }

  // iframe 로드 핸들러
  const handleIframeLoad = () => {
    setIframeLoading(false)
    // iframe이 로드되면 YouTube Player 초기화
    if (iframeRef.current && playerState.currentTrack) {
      onInitializePlayer(iframeRef.current)
    }
  }

  // 트랙 변경 시 iframe 로딩 상태 리셋
  useEffect(() => {
    if (playerState.currentTrack) {
      setIframeLoading(true)
      setIframeStarted(false) // 새로운 트랙이 로드되면 재생 상태 리셋
    }
  }, [playerState.currentTrack])

  // YouTube Player 상태 변경 감지 (자동 재생)
  useEffect(() => {
    if (youtubePlayer && isPlayerReady) {
      const handleStateChange = (event: any) => {
        // 영상이 끝났을 때 (ended = 0)이고 큐에 곡이 있을 때만 다음 곡 재생
        if (event.data === 0 && playerState.queue.length > 1) {
          const currentIndex = playerState.queue.findIndex(track => track.id === playerState.currentTrack?.id)
          if (currentIndex !== -1 && currentIndex < playerState.queue.length - 1) {
            // 다음 곡으로 자동 재생
            const nextTrack = playerState.queue[currentIndex + 1]
            onPlayTrack(nextTrack)
          }
        }
      }

      // YouTube Player 이벤트 리스너 추가
      youtubePlayer.addEventListener('onStateChange', handleStateChange)

      return () => {
        youtubePlayer.removeEventListener('onStateChange', handleStateChange)
      }
    }
  }, [youtubePlayer, isPlayerReady])

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldTracks = [...tracks]
      
      // 즉시 UI 업데이트
      setTracks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })

      // 서버에 순서 업데이트 (디바운싱 적용)
      if (isAdmin) {
        // 이전 대기 중인 업데이트 취소
        if (pendingOrderUpdate) {
          clearTimeout(pendingOrderUpdate)
        }

        // 새로운 업데이트 예약 (2초 후 실행)
        const newTimeout = setTimeout(async () => {
          try {
            const newTracks = arrayMove(oldTracks, 
              oldTracks.findIndex((item) => item.id === active.id),
              oldTracks.findIndex((item) => item.id === over?.id)
            )
            
            await updateBgmOrderApi(activeTab, newTracks.map(track => track.id))
            
            // 성공 시 라이브러리 새로고침 이벤트 발생
            window.dispatchEvent(new Event('bgmLibraryRefresh'))
            console.log('순서 변경 성공')
          } catch (error) {
            console.error('순서 변경 실패:', error)
            // 실패 시 원래 순서로 되돌리기
            setTracks(oldTracks)
            alert('순서 변경에 실패했습니다.')
          }
          setPendingOrderUpdate(null)
        }, 2000) // 2초 지연

        setPendingOrderUpdate(newTimeout)
      }
    }
  }

  // BGM 삭제 함수
  const handleDeleteTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('정말 삭제하시겠습니까?')) {
      return
    }

    try {
      setDeletingTrackId(trackId)
      await deleteBgmApi(trackId)
      
      // 라이브러리 새로고침 이벤트 발생
      window.dispatchEvent(new Event('bgmLibraryRefresh'))
      
      // 현재 재생 중인 곡이 삭제된 경우 재생 중지
      if (playerState.currentTrack?.id === trackId) {
        // 재생 중지 로직 추가 필요
      }
    } catch (error) {
      console.error('삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    } finally {
      setDeletingTrackId(null)
    }
  }

  // 곡 재생 핸들러
  const handlePlayTrack = (track: BgmTrack) => {
    // 현재 곡부터 큐를 재설정
    const currentIndex = tracks.findIndex(t => t.id === track.id)
    if (currentIndex !== -1) {
      const newQueue = tracks.slice(currentIndex)
      onSetQueue(newQueue)
    }
    
    onPlayTrack(track)
  }

  // 장르 목록
  const genres: BgmGenre[] = ['INST', 'K-POP', 'J-POP', 'POP', '탑골가요', 'ETC']

  return (
    <>
      {/* 통합된 확장 패널 컨테이너 */}
      <div 
        className={`fixed bottom-16 left-0 right-0 h-[70vh] bg-background border-t border-border shadow-lg overflow-hidden z-20 transition-opacity duration-300 md:left-16 ${
          playerState.isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        data-expanded-panel
      >
        <div className="flex flex-col h-full md:flex-row">
          {/* 상단: YouTube iframe - 모바일에서는 작은 크기 */}
          <div className="w-full h-1/3 md:h-full md:w-1/2 p-2 md:p-4 border-b md:border-b-0 md:border-r border-border">
            <div className="h-full bg-muted rounded-lg overflow-hidden relative">
              {playerState.currentTrack ? (
                <>
                  {iframeLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    src={`https://www.youtube.com/embed/${extractVideoId(playerState.currentTrack.videoUrl)}?enablejsapi=1&controls=1&modestbranding=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&playsinline=1&autoplay=1&mute=0`}
                    title="YouTube Player"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <div className="text-sm md:text-lg font-medium mb-2">플레이리스트를 선택해주세요</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단: 탭 리스트 - 모바일에서는 전체 너비 */}
          <div className="w-full h-2/3 md:h-full md:w-1/2 flex flex-col">

            {/* 탭 헤더 - 가로 스크롤 가능 */}
            <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setActiveTab(genre)}
                  className={`flex-shrink-0 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === genre
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* 곡 리스트 */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-custom">
              {tracks.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={tracks.map(track => track.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {tracks.map((track) => (
                        <SortableTrackItem
                          key={track.id}
                          track={track}
                          isActive={playerState.currentTrack?.id === track.id}
                          onPlayTrack={handlePlayTrack}
                          onDeleteTrack={handleDeleteTrack}
                          isAdmin={isAdmin}
                          deletingTrackId={deletingTrackId}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-sm">등록된 BGM이 없습니다</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 