'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, ArrowUp } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Song } from '@/types/song'
import { onSongListRefresh, onSongUpdate, onSongDelete } from '@/lib/song-events'
import { onAdminAuthChange } from '@/lib/auth'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { SongItem } from './songItem'

// 커스텀 훅들 분리
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLikedSongs } from '@/hooks/useLikedSongs'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { useSongData } from '@/hooks/useSongData'

interface SongListProps {
  category?: string
  onSongSelect: (song: Song) => void
  selectedSong?: Song | null
  songs: Song[]
  setSongs: (songs: Song[] | ((prev: Song[]) => Song[])) => void
}

export interface SongListRef {
  refresh: () => void
}

// 상수들을 파일 상단으로 이동
const SONGS_PER_PAGE = 30
const DEBOUNCE_DELAY = 300
const SCROLL_THRESHOLD = 0.8
const SCROLL_TOP_THRESHOLD = 200

type SortType = 'my-likes' | 'artist' | 'title' | 'popular' | 'latest' | 'oldest' | 'first-verse' | 'high-difficulty' | 'loop-station' | 'mr'

export const SongList = forwardRef<SongListRef, SongListProps>(function SongListImpl({ 
  category, 
  onSongSelect, 
  selectedSong, 
  songs, 
  setSongs 
}, ref) {
  const { isAdmin } = useAdminAuth()
  
  // 기본 상태들
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortType>(
    category === 'NEWSONG' ? 'latest' : 
    category === 'MISSION' ? 'oldest' : 'my-likes'
  )
  
  // 초기 정렬 상태를 전역으로 설정
  useEffect(() => {
    ;(window as any).currentSort = sort
  }, [sort])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showTopBtn, setShowTopBtn] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  
  // 커스텀 훅 사용
  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_DELAY)
  const {
    likedSongs,
    isUpdatingLike,
    handleLike,
    initializeLikedSongs
  } = useLikedSongs(songs, setSongs)
  
  const {
    page,
    hasMore,
    loadingMore,
    fetchSongs,
    loadMoreSongs,
    resetPagination
  } = useInfiniteScroll({
        category,
        search: debouncedSearch,
    sort,
    setSongs,
    setLoading,
    songsPerPage: SONGS_PER_PAGE,
    likedSongs
  })
  
  // 메인 데이터 관리 훅
  const { displaySongs, refresh } = useSongData({
    songs,
    sort,
    category,
    search: debouncedSearch,
    fetchSongs,
    resetPagination,
    likedSongs
  })

  // ref 노출
  useImperativeHandle(ref, () => ({ refresh }))

  // 무한 스크롤 처리
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    
    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = el
      
      // TOP 버튼 표시 여부
      setShowTopBtn(scrollTop > SCROLL_TOP_THRESHOLD)
      
      // 무한 스크롤 트리거 - 더 정확한 조건
      if (scrollTop + clientHeight >= scrollHeight * SCROLL_THRESHOLD) {
        if (!loading && !loadingMore && hasMore && displaySongs.length > 0) {
          loadMoreSongs()
        }
      }
    }
    
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [loading, loadingMore, hasMore, page, fetchSongs, displaySongs.length])

  // 초기 데이터 로드
  useEffect(() => {
    resetPagination()
        fetchSongs(1, true)
  }, [category, debouncedSearch, sort])

  // 좋아요 상태 초기화
  useEffect(() => {
    initializeLikedSongs()
  }, [])

  // 이벤트 리스너들
  useEffect(() => {
    const cleanupFunctions = [
      onSongListRefresh(() => {
        if (page === 1) fetchSongs(1, true)
      }),
      onSongUpdate((songId, updatedSong) => {
        setSongs(prev => prev.map(song => 
          song.id === songId ? (updatedSong as Song) : song
        ))
      }),
      onSongDelete((songId) => {
        setSongs(prev => prev.filter(song => song.id !== songId))
      }),
      onAdminAuthChange(() => {
        // Admin auth changes handled by useAdminAuth context
      })
    ]
    
    return () => cleanupFunctions.forEach(cleanup => cleanup())
  }, [setSongs, page, fetchSongs])

  // 복사 기능
  const handleCopy = useCallback((artist: string, title: string, e: React.MouseEvent, songId: string) => {
    e.stopPropagation()
    const removeParentheses = (text: string) => text.replace(/\s*\([^)]*\)/g, '').trim()
    const text = `${removeParentheses(artist)} - ${removeParentheses(title)}`
    
    // 클립보드에 복사
    navigator.clipboard?.writeText(text).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    })
    
    // 선곡표 팝업 창에 노래 정보 전달
    try {
      // 부모 창이 있으면 부모 창에 메시지 전달 (팝업에서 열린 경우)
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'ADD_TO_SONGLIST',
          artistTitle: text
        }, '*')
      }
      
      // localStorage를 통해 간접적으로 통신
      const songlistData = {
        type: 'ADD_TO_SONGLIST',
        artistTitle: text,
        timestamp: Date.now()
      }
      localStorage.setItem('songlist_add_request', JSON.stringify(songlistData))
      
      // localStorage 이벤트를 트리거
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'songlist_add_request',
        newValue: JSON.stringify(songlistData)
      }))
      
    } catch (error) {
      console.log('선곡표 팝업 창에 메시지 전달 실패:', error)
    }
    
    setCopiedId(songId)
  }, [])

  // 복사 상태 리셋
  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 1000)
      return () => clearTimeout(timer)
    }
  }, [copiedId])

  // 정렬 변경 핸들러
  const handleSortChange = useCallback((value: SortType) => {
    setSort(value)
    // 현재 정렬 상태를 전역으로 설정 (스크롤 위치 유지를 위해)
    ;(window as any).currentSort = value
    resetPagination()
    setSongs([])
  }, [resetPagination, setSongs])

  // TOP 버튼 클릭
  const handleScrollTop = useCallback(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="w-full h-full p-4 flex flex-col min-w-0" style={{ position: 'relative' }}>
      {/* 검색 및 정렬 컨트롤 */}
      <SearchAndSortControls
        search={search}
        setSearch={setSearch}
        sort={sort}
        onSortChange={handleSortChange}
      />

      {/* 곡 목록 */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 scrollbar-custom pb-20">
        <SongListContent
          loading={loading}
          loadingMore={loadingMore}
          page={page}
          displaySongs={displaySongs}
          selectedSong={selectedSong}
          onSongSelect={onSongSelect}
          sort={sort}
          category={category}
          isAdmin={isAdmin}
          likedSongs={likedSongs}
          handleLike={handleLike}
          handleCopy={handleCopy}
          copiedId={copiedId}
          setSongs={setSongs}
          isUpdatingLike={isUpdatingLike}
        />
      </div>

      {/* TOP 버튼 */}
      {showTopBtn && (
        <ScrollToTopButton onClick={handleScrollTop} />
      )}
    </div>
  )
})

// 검색 및 정렬 컨트롤 컴포넌트
interface SearchAndSortControlsProps {
  search: string
  setSearch: (search: string) => void
  sort: SortType
  onSortChange: (sort: SortType) => void
}

const SearchAndSortControls = ({ search, setSearch, sort, onSortChange }: SearchAndSortControlsProps) => (
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="노래 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
    <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="my-likes">💕나의 좋아요</SelectItem>
            <SelectItem value="popular">💖 인기순</SelectItem>
            <SelectItem value="artist">아티스트순</SelectItem>
            <SelectItem value="title">제목순</SelectItem>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="oldest">과거순</SelectItem>
        <SelectItem value="first-verse">
          <img src="/icons/1st-verse.webp" className="h-4 w-4 inline mr-0" />
              1절만
            </SelectItem>
            <SelectItem value="mr">
              <img src="/icons/mr.webp" className="h-4 w-4 inline mr-0" />
              MR
            </SelectItem>
            <SelectItem value="high-difficulty">🔥 고난이도</SelectItem>
            <SelectItem value="loop-station">⚡ 루프 스테이션</SelectItem>
          </SelectContent>
        </Select>
      </div>
)

// 곡 목록 콘텐츠 컴포넌트
interface SongListContentProps {
  loading: boolean
  loadingMore: boolean
  page: number
  displaySongs: Song[]
  selectedSong?: Song | null
  onSongSelect: (song: Song) => void
  sort: string
  category?: string
  isAdmin: boolean
  likedSongs: Set<string>
  handleLike: (songId: string) => void
  handleCopy: (artist: string, title: string, e: React.MouseEvent, songId: string) => void
  copiedId: string | null
  setSongs: (songs: Song[] | ((prev: Song[]) => Song[])) => void
  isUpdatingLike: (songId: string) => boolean
}

const SongListContent = ({ 
  loading, 
  loadingMore, 
  page, 
  displaySongs, 
  selectedSong,
  onSongSelect, 
  sort, 
  category, 
  isAdmin, 
  likedSongs, 
  handleLike, 
  handleCopy, 
  copiedId, 
  setSongs, 
  isUpdatingLike 
}: SongListContentProps) => {
  if (loading && page === 1) {
    return <div className="w-full text-center py-8 text-gray-500 text-sm">로딩 중...</div>
  }

  if (displaySongs.length === 0) {
    return (
          <div className="text-center py-8">
            <p className="text-gray-500">노래가 없습니다.</p>
          </div>
    )
  }

              return (
    <>
      {displaySongs.map((song, idx) => (
        <SongItem
          key={song.id}
          song={song}
          index={idx}
          songs={displaySongs}
          selectedSong={selectedSong}
          onSongSelect={onSongSelect}
          sort={sort}
          category={category}
          isAdmin={isAdmin}
          likedSongs={likedSongs}
          handleLike={handleLike}
          handleCopy={handleCopy}
          copiedId={copiedId}
          setSongs={setSongs}
          isUpdatingLike={isUpdatingLike(song.id)}
        />
      ))}
            {loadingMore && (
              <div className="w-full text-center py-4 text-gray-500 text-sm">노래를 불러오는 중...</div>
            )}
          </>
  )
}

// TOP 버튼 컴포넌트
interface ScrollToTopButtonProps {
  onClick: () => void
}

const ScrollToTopButton = ({ onClick }: ScrollToTopButtonProps) => (
        <button
    onClick={onClick}
          className="fixed right-6 bottom-20 z-18 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-md transition-all duration-200"
          style={{ width: 36, height: 36, fontSize: 18, opacity: 0.7 }}
          aria-label="맨 위로"
        >
          <ArrowUp className="w-5 h-5 mx-auto" />
        </button>
  )

SongList.displayName = 'SongList' 