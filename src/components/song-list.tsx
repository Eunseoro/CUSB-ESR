// 이 파일은 노래 목록을 보여주는 컴포넌트입니다. songList 상태를 songs로 통합하고, useEffect 중복 호출 및 불필요한 상태/함수를 정리하여 메모리 누수와 비효율을 방지합니다.
'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Heart, Copy, ArrowUp } from 'lucide-react'
import { AddSongDialog } from './add-song-dialog'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Song } from '@/types/song'
import { getAnonymousId } from '@/lib/anonymous'
import { onSongListRefresh, onSongUpdate, onSongDelete } from '@/lib/song-events'
import { isAdminAuthenticated, onAdminAuthChange } from '@/lib/auth'
// song 관련 API/유틸 함수, 아이콘 컴포넌트 import
import { fetchSongsApi, fetchLikedSongsApi, handleLikeApi, handleProgressChangeApi } from '@/lib/song-api'
import { formatDate, getCategoryColor, getCategoryLabel, getProgressColor, FirstVerseIcon, HighDifficultyIcon, LoopStationIcon, getKoreanSortKey } from '@/lib/song-utils'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

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

export const SongList = forwardRef<SongListRef, SongListProps>(function SongListImpl({ category, onSongSelect, selectedSong, songs, setSongs }, ref) {
  const { isAdmin } = useAdminAuth();
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sort, setSort] = useState<'artist' | 'title' | 'popular' | 'latest' | 'oldest' | 'first-verse' | 'high-difficulty' | 'loop-station'>(category === 'NEWSONG' ? 'latest' : (category === 'MISSION' ? 'oldest' : 'artist'))
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [localProgress, setLocalProgress] = useState<{[id: string]: number}>({})
  const [sliderDragging, setSliderDragging] = useState<{[id: string]: boolean}>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isUpdatingLike, setIsUpdatingLike] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [showTopBtn, setShowTopBtn] = useState(false)

  // localStorage에서 좋아요 상태 안전하게 로드
  const loadLikedSongsFromStorage = () => {
    try {
      const stored = localStorage.getItem('likedSongs')
      if (!stored) {
        setLikedSongs(new Set())
        return
      }
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setLikedSongs(new Set(parsed))
      } else {
        localStorage.removeItem('likedSongs')
        setLikedSongs(new Set())
      }
    } catch (error) {
      console.error('Error loading likedSongs from localStorage:', error)
      localStorage.removeItem('likedSongs')
      setLikedSongs(new Set())
    }
  }

  // 곡 목록을 서버에서 가져오는 함수
  const fetchSongs = useCallback(async (pageNum: number, reset = false) => {
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const data = await fetchSongsApi({
        category,
        search: debouncedSearch,
        pageNum,
        limit: 50,  // 50곡씩 로드로 증가하여 DB 쿼리 수 최적화
        sort // 정렬 파라미터 추가
      })
      if (!data.songs || !data.pagination) {
        if (reset) {
          setSongs([])
        }
        setHasMore(false)
        setPage(1)
        return
      }
      if (reset) {
        setSongs(data.songs)
      } else {
        setSongs((prev: Song[]) => [...prev, ...data.songs])
      }
      setHasMore(pageNum < data.pagination.totalPages)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching songs:', error)
      // 무한스크롤 시 에러가 발생해도 기존 목록은 유지
      if (reset) {
        setSongs([])
      }
      setHasMore(false)
      setPage(1)
    } finally {
      if (reset) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }, [category, debouncedSearch, sort, setSongs])

  const refresh = useCallback(() => {
    fetchSongs(1, true)
  }, [fetchSongs])

  useImperativeHandle(ref, () => ({ refresh }))

  // 곡 목록, 검색, 카테고리, 정렬 변경 시 fetch
  useEffect(() => {
    setPage(1) // 정렬 변경 시 페이지 리셋
    setHasMore(true) // 정렬 변경 시 hasMore 리셋
    fetchSongs(1, true)
  }, [category, debouncedSearch, sort, fetchSongs])

  // 최초 마운트 시 localStorage에서 좋아요 상태 로드
  useEffect(() => {
    loadLikedSongsFromStorage()
  }, [])

  // 초기 로드 시에만 전체 좋아요 상태 fetch
  useEffect(() => {
    if (songs && songs.length > 0 && !isUpdatingLike) {
      fetchInitialLikedSongs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 빈 의존성 배열로 최초 1회만 실행

  // 곡 목록이 바뀔 때만 좋아요 상태 fetch (무한스크롤 시 새로 추가된 곡들만)
  useEffect(() => {
    if (songs && songs.length > 0 && !isUpdatingLike && songs.length > 50) {
      // 무한스크롤 시에는 새로 추가된 곡들만 좋아요 상태를 fetch
      const existingLikedSongIds = Array.from(likedSongs)
      const newSongs = songs.filter(song => !existingLikedSongIds.includes(song.id))
      
      if (newSongs.length > 0) {
        fetchLikedSongsForNewSongs(newSongs)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, isUpdatingLike])

  // 무한스크롤: 분할 영역 내 스크롤 이벤트 리스너
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const handleScroll = () => {
      const scrollTop = el.scrollTop
      const clientHeight = el.clientHeight
      const scrollHeight = el.scrollHeight
      // 스크롤이 하단 80% 지점에 도달했을 때 다음 페이지 로드
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        if (!loading && !loadingMore && hasMore) {
          fetchSongs(page + 1)
        }
      }
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [loading, loadingMore, hasMore, page, fetchSongs])

  // 이벤트 리스너 등록 및 정리
  useEffect(() => {
    const refreshCleanup = onSongListRefresh(() => {
      // 무한스크롤 중이 아닐 때만 목록 새로고침 (첫 페이지 로드 시에만)
      if (page === 1) {
        fetchSongs(1, true)
      }
    })
    const updateCleanup = onSongUpdate((songId, updatedSong) => {
      setSongs(prev => prev.map(song => song.id === songId ? (updatedSong as Song) : song))
    })
    const deleteCleanup = onSongDelete((songId) => {
      setSongs(prev => prev.filter(song => song.id !== songId))
    })
    return () => {
      refreshCleanup()
      updateCleanup()
      deleteCleanup()
    }
  }, [setSongs, page, fetchSongs])

  useEffect(() => {
    const cleanup = onAdminAuthChange((auth) => {
      // This effect is now empty as the isAdmin state is managed by useAdminAuth
    })
    return cleanup
  }, [])

  // 곡별 좋아요 상태를 서버에서 가져오는 함수
  const fetchLikedSongs = async () => {
    try {
      if (!songs || songs.length === 0) return
      const likedStates = await fetchLikedSongsApi(songs)
      setLikedSongs(new Set(Object.keys(likedStates).filter(id => likedStates[id])))
    } catch (error) {
      console.error('Error fetching liked songs:', error)
    }
  }

  // 좋아요 상태를 서버에서 가져오는 함수 (초기 로드용)
  const fetchInitialLikedSongs = async () => {
    try {
      if (!songs || songs.length === 0) return
      const likedStates = await fetchLikedSongsApi(songs)
      setLikedSongs(new Set(Object.keys(likedStates).filter(id => likedStates[id])))
    } catch (error) {
      console.error('Error fetching liked songs:', error)
    }
  }

  // 새로 추가된 곡들만 좋아요 상태를 fetch하는 함수
  const fetchLikedSongsForNewSongs = async (newSongs: Song[]) => {
    try {
      if (!newSongs || newSongs.length === 0) return
      const likedStates = await fetchLikedSongsApi(newSongs)
      setLikedSongs(prev => {
        const newSet = new Set(prev)
        Object.keys(likedStates).forEach(id => {
          if (likedStates[id]) {
            newSet.add(id)
          }
        })
        return newSet
      })
    } catch (error) {
      console.error('Error fetching liked songs for new songs:', error)
    }
  }

  // 날짜를 YYYY.MM.DD 고정 포맷으로 반환
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getDate().toString().padStart(2,'0')}`;
  }

  // 서버에서 정렬된 데이터를 클라이언트에서 추가 정렬하여 사용
  const displaySongs = useMemo(() => {
    if (!songs || songs.length === 0) return []
    
    // 특별 조건 필터인 경우 클라이언트 사이드 정렬 적용
    if (sort === 'first-verse' || sort === 'high-difficulty' || sort === 'loop-station') {
      return [...songs].sort((a, b) => {
        // 해당 조건이 체크된 곡을 우선적으로 정렬
        const aHasCondition = sort === 'first-verse' ? a.isFirstVerseOnly : 
                             sort === 'high-difficulty' ? a.isHighDifficulty : 
                             a.isLoopStation
        const bHasCondition = sort === 'first-verse' ? b.isFirstVerseOnly : 
                             sort === 'high-difficulty' ? b.isHighDifficulty : 
                             b.isLoopStation
        
        // 조건이 다르면 조건이 체크된 곡을 앞으로
        if (aHasCondition !== bHasCondition) {
          return aHasCondition ? -1 : 1
        }
        
        // 조건이 같으면 아티스트순으로 2차 정렬
        const aKey = getKoreanSortKey(a.artist)
        const bKey = getKoreanSortKey(b.artist)
        return aKey.localeCompare(bKey)
      })
    }
    
    // 아티스트순이나 제목순인 경우에만 클라이언트 사이드 정렬 적용
    if (sort === 'artist' || sort === 'title') {
      return [...songs].sort((a, b) => {
        const aKey = getKoreanSortKey(sort === 'artist' ? a.artist : a.title)
        const bKey = getKoreanSortKey(sort === 'artist' ? b.artist : b.title)
        
        if (aKey !== bKey) {
          return aKey.localeCompare(bKey)
        }
        
        // 첫 번째 기준이 같으면 두 번째 기준으로 정렬
        const aKey2 = getKoreanSortKey(sort === 'artist' ? a.title : a.artist)
        const bKey2 = getKoreanSortKey(sort === 'artist' ? b.title : b.artist)
        return aKey2.localeCompare(bKey2)
      })
    }
    
    // 다른 정렬은 서버에서 받은 순서 그대로 사용
    return songs
  }, [songs, sort])

  // 곡 좋아요 상태를 서버에 반영하는 함수
  const handleLike = async (songId: string) => {
    setIsUpdatingLike(true)
    const likedSongsSet = new Set(likedSongs)
    const isLiked = likedSongsSet.has(songId)
    
    // 즉시 UI 업데이트 (낙관적 업데이트)
    if (isLiked) {
      likedSongsSet.delete(songId)
    } else {
      likedSongsSet.add(songId)
    }
    setLikedSongs(likedSongsSet)
    
    // 즉시 카운트 업데이트 (낙관적 업데이트)
    setSongs((prev: Song[]) => prev.map((song: Song) => {
      if (song.id === songId) {
        return {
          ...song,
          likeCount: isLiked ? (song.likeCount || 1) - 1 : (song.likeCount || 0) + 1
        }
      }
      return song
    }))
    
    try {
      localStorage.setItem('likedSongs', JSON.stringify([...likedSongsSet]))
    } catch (error) {
      console.error('Error saving likedSongs to localStorage:', error)
    }
    
    try {
      const result = await handleLikeApi(songId, !isLiked)
      // 서버 응답 후 실제 값으로 동기화 (좋아요 상태는 이미 올바르게 설정되어 있으므로 카운트만 업데이트)
      setSongs((prev: Song[]) => prev.map((song: Song) => {
        if (song.id === songId) {
          return {
            ...song,
            likeCount: result.likeCount
          }
        }
        return song
      }))
    } catch (error) {
      console.error('Error toggling like:', error)
      // 에러 시 원래 상태로 되돌리기
      if (isLiked) {
        likedSongsSet.add(songId)
      } else {
        likedSongsSet.delete(songId)
      }
      setLikedSongs(likedSongsSet)
      
      // 카운트도 원래대로 되돌리기
      setSongs((prev: Song[]) => prev.map((song: Song) => {
        if (song.id === songId) {
          return {
            ...song,
            likeCount: isLiked ? (song.likeCount || 0) + 1 : (song.likeCount || 1) - 1
          }
        }
        return song
      }))
      
      try {
        localStorage.setItem('likedSongs', JSON.stringify([...likedSongsSet]))
      } catch (localStorageError) {
        console.error('Error reverting likedSongs in localStorage:', localStorageError)
      }
    } finally {
      setIsUpdatingLike(false)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'KPOP': return 'bg-pink-100 text-pink-700'
      case 'POP': return 'bg-blue-100 text-blue-700'
      case 'MISSION': return 'bg-purple-100 text-purple-700'
      case 'NEWSONG': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // 카테고리 표시 이름 매핑 함수
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'KPOP': return 'K-POP'
      case 'POP': return 'POP'
      case 'MISSION': return 'MISSION'
      case 'NEWSONG': return 'NEWSONG'
      default: return category
    }
  }

  // 특별 조건 아이콘들을 렌더링하는 함수
  const renderSpecialIcons = (song: Song) => {
    const icons = []
    
    if (song.isFirstVerseOnly) {
      icons.push(
        <span key="first-verse" className="inline-flex items-center text-m" title="1절만">
          <img 
            src="/icons/1st-verse.png" 
            alt="노래 썸네일" 
            className="h-5 w-5 mr-1"
          />
        </span>
      )
    }
    
    if (song.isHighDifficulty) {
      icons.push(
        <span key="high-difficulty" className="inline-flex items-center text-m" title="고난이도">
          🔥
        </span>
      )
    }
    
    if (song.isLoopStation) {
      icons.push(
        <span key="loop-station" className="inline-flex items-center text-m" title="루프 스테이션">
          ⚡
        </span>
      )
    }
    
    return icons
  }

  // 진행도 색상 반환 함수
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-400'
    if (progress >= 70) return 'bg-yellow-300'
    if (progress >= 40) return 'bg-orange-400'
    return 'bg-red-400'
  }

  // 곡 진행도를 서버에 반영하는 함수 (관리자만)
  const handleProgressChange = async (song: Song, value: number) => {
    if (!isAdmin) return
    try {
      await handleProgressChangeApi(song.id, value)
      setSongs((prev: Song[]) => prev.map((s) => s.id === song.id ? { ...s, progress: value } : s))
    } catch (e) {
      // 실패 시 무시
    }
  }

  const handleSliderChange = (song: Song, value: number) => {
    setLocalProgress(prev => ({ ...prev, [song.id]: value }));
    setSliderDragging(prev => ({ ...prev, [song.id]: true }));
  };

  const handleSliderCommit = (song: Song) => {
    const value = localProgress[song.id] ?? song.progress ?? 0;
    setSliderDragging(prev => ({ ...prev, [song.id]: false }));
    if (value !== song.progress) {
      handleProgressChange(song, value);
    }
  };

  // 소괄호와 그 안의 내용을 제거하는 함수
  const removeParentheses = (text: string) => {
    return text.replace(/\s*\([^)]*\)/g, '').trim()
  }

  // 노래 정보 복사 함수
  const handleCopy = (artist: string, title: string, e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    // 소괄호 제거 후 복사
    const cleanArtist = removeParentheses(artist);
    const cleanTitle = removeParentheses(title);
    const text = `${cleanArtist} - ${cleanTitle}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(songId);
  };

  // 복사 성공 표시를 1초 후에 원래대로 복귀
  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  // 그룹 구분선 컴포넌트: ---ㄱ--- 형태로 가운데 정렬
  const GroupDivider = ({ label }: { label: string }) => (
    <div className="flex items-center my-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="mx-3 text-base font-bold text-gray-400 select-none">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );

  // 검색어 디바운스 적용 (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // 정렬 변경 시 즉시 반영
  const handleSortChange = (value: 'artist' | 'title' | 'popular' | 'latest' | 'oldest' | 'first-verse' | 'high-difficulty' | 'loop-station') => {
    setSort(value);
    // 정렬 변경 시 즉시 페이지 리셋 및 데이터 새로고침
    setPage(1);
    setHasMore(true);
    setSongs([]); // 기존 목록 초기화
  };

  // TOP 버튼 노출 여부 (스크롤 200px 이상 시 노출)
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => {
      setShowTopBtn(el.scrollTop > 200)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // TOP 버튼 클릭 시 스크롤 최상단 이동
  const handleScrollTop = () => {
    const el = listRef.current
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="w-full h-full p-4 flex flex-col min-w-0" style={{ position: 'relative' }}>
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
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="artist">아티스트순</SelectItem>
            <SelectItem value="title">제목순</SelectItem>
            <SelectItem value="popular">인기순</SelectItem>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="oldest">과거순</SelectItem>
            <SelectItem value="first-verse" className="flex items-center gap-2">
              <img src="/icons/1st-verse.png" alt="1절만 아이콘" className="h-4 w-4" />
              1절만
            </SelectItem>
            <SelectItem value="high-difficulty">🔥 고난이도</SelectItem>
            <SelectItem value="loop-station">⚡ 루프 스테이션</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2">
        {loading && page === 1 ? (
          <div className="w-full text-center py-8 text-gray-500 text-sm">로딩 중...</div>
        ) : displaySongs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">노래가 없습니다.</p>
          </div>
        ) : (
          <>
            {displaySongs.map((song, idx) => {
              // 그룹 구분선 표시 조건: 정렬 기준별로 다르게 처리
              let showDivider = false;
              let dividerLabel = '';
              if (sort === 'title' || sort === 'artist') {
                const getInitial = (str: string) => {
                  // 한글 초성 추출
                  const ch = str.trim().charAt(0);
                  const code = ch.charCodeAt(0) - 44032;
                  if (code >= 0 && code < 11172) {
                    const cho = Math.floor(code / 588);
                    return 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[cho];
                  }
                  // 알파벳 대문자/숫자/기타
                  return ch.toUpperCase();
                };
                const currInitial = getInitial(sort === 'title' ? song.title : song.artist);
                const prevInitial = idx > 0 ? getInitial(sort === 'title' ? displaySongs[idx-1].title : displaySongs[idx-1].artist) : null;
                if (idx === 0 || currInitial !== prevInitial) {
                  showDivider = true;
                  dividerLabel = currInitial;
                }
              } else if (sort === 'latest' || sort === 'oldest') {
                const getMonth = (dateString: string) => {
                  const d = new Date(dateString);
                  return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
                };
                const currMonth = getMonth(song.createdAt);
                const prevMonth = idx > 0 ? getMonth(displaySongs[idx-1].createdAt) : null;
                if (idx === 0 || currMonth !== prevMonth) {
                  showDivider = true;
                  dividerLabel = currMonth;
                }
              } else if (sort === 'popular') {
                const getLikeGroup = (likeCount: number) => {
                  const base = Math.floor((likeCount || 0) / 10) * 10;
                  return `${base}~${base+9}`;
                };
                const currGroup = getLikeGroup(song.likeCount || 0);
                const prevGroup = idx > 0 ? getLikeGroup(displaySongs[idx-1].likeCount || 0) : null;
                if (idx === 0 || currGroup !== prevGroup) {
                  showDivider = true;
                  dividerLabel = currGroup;
                }
              } else if (sort === 'first-verse' || sort === 'high-difficulty' || sort === 'loop-station') {
                // 특별 조건 필터의 경우 조건이 체크된 곡과 안된 곡을 구분
                const getConditionStatus = (song: Song) => {
                  if (sort === 'first-verse') return song.isFirstVerseOnly ? '1절만' : '일반'
                  if (sort === 'high-difficulty') return song.isHighDifficulty ? '🔥' : '일반'
                  return song.isLoopStation ? '⚡' : '일반'
                };
                const currStatus = getConditionStatus(song);
                const prevStatus = idx > 0 ? getConditionStatus(displaySongs[idx-1]) : null;
                if (idx === 0 || currStatus !== prevStatus) {
                  showDivider = true;
                  dividerLabel = currStatus;
                }
              }
              return (
                <div key={song.id}>
                  {showDivider && <GroupDivider label={dividerLabel} />}
                  <Card
                    className={`cursor-pointer hover:shadow-md transition-all ${
                      selectedSong?.id === song.id ? 'bg-primary/5 border-primary/20' : ''
                    } mt-2`}
                    onClick={() => onSongSelect(song)}
                  >
                    <CardHeader className="pb-0 pt-2 -my-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg leading-tight flex items-center gap-1">
                            {/* 특별 조건 아이콘 렌더링 */}
                            {song.isFirstVerseOnly && <FirstVerseIcon />}
                            {song.isHighDifficulty && <HighDifficultyIcon />}
                            {song.isLoopStation && <LoopStationIcon />}
                            {song.title}
                          </CardTitle>
                          <p className="text-muted-foreground mt-0">
                            {song.artist}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 복사 버튼: 좋아요 버튼의 좌측 */}
                          <button
                            onClick={(e) => handleCopy(song.artist, song.title, e, song.id)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {copiedId === song.id ? (
                              <span className="font-bold text-xs text-black dark:text-white">Copy!</span>
                            ) : (
                              <Copy className="h-4 w-5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleLike(song.id)
                            }}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            {likedSongs.has(song.id) ? (
                              <Heart className="h-4 w-4 fill-current text-red-500" />
                            ) : (
                              <Heart className="h-4 w-4" />
                            )}
                            <span>{song.likeCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    {category === 'MISSION' && (
                      <div className={`px-4 ${isAdmin ? 'pt-2 pb-0' : 'pt-2 pb-2'} mt-0 mb-[-8px]`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">진행도</span>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="w-full h-3 rounded bg-gray-200 relative">
                              <div
                                className={`h-3 rounded ${getProgressColor(song.progress ?? 0)}`}
                                style={{ width: `${song.progress ?? 0}%`, transition: 'width 0.3s' }}
                              />
                            </div>
                            <span className="text-xs font-bold w-10 text-right">{song.progress ?? 0}%</span>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 mr-1">수정</span>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={10}
                                value={localProgress[song.id] ?? song.progress ?? 0}
                                onChange={e => handleSliderChange(song, Number(e.target.value))}
                                onMouseUp={() => handleSliderCommit(song)}
                                onTouchEnd={() => handleSliderCommit(song)}
                                className="w-full accent-blue-500"
                                onClick={e => e.stopPropagation()}
                                style={{ touchAction: 'none' }}
                              />
                              <span className="text-xs font-bold text-blue-600 min-w-[2.5rem] text-right">{localProgress[song.id] ?? song.progress ?? 0}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              )
            })}
            {loadingMore && (
              <div className="w-full text-center py-4 text-gray-500 text-sm">노래를 불러오는 중...</div>
            )}
          </>
        )}
      </div>
      {/* TOP 버튼 */}
      {showTopBtn && (
        <button
          onClick={handleScrollTop}
          className="fixed right-6 bottom-6 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-md transition-all duration-200"
          style={{ width: 36, height: 36, fontSize: 18, opacity: 0.7 }}
          aria-label="맨 위로"
        >
          <ArrowUp className="w-5 h-5 mx-auto" />
        </button>
      )}
    </div>
  )
})

SongList.displayName = 'SongList' 