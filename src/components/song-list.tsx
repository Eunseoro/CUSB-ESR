// 이 파일은 노래 목록을 보여주는 컴포넌트입니다. songList 상태를 songs로 통합하고, useEffect 중복 호출 및 불필요한 상태/함수를 정리하여 메모리 누수와 비효율을 방지합니다.
'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Heart, Copy } from 'lucide-react'
import { AddSongDialog } from './add-song-dialog'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Song } from '@/types/song'
import { getAnonymousId } from '@/lib/anonymous'
import { onSongListRefresh, onSongUpdate, onSongDelete } from '@/lib/song-events'
import { isAdminAuthenticated, onAdminAuthChange } from '@/lib/auth'
// song 관련 API/유틸 함수, 아이콘 컴포넌트 import
import { fetchSongsApi, fetchLikedSongsApi, handleLikeApi, handleProgressChangeApi } from '@/lib/song-api'
import { formatDate, getCategoryColor, getCategoryLabel, getProgressColor, FirstVerseIcon, HighDifficultyIcon, LoopStationIcon } from '@/lib/song-utils'
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

export const SongList = forwardRef<SongListRef, SongListProps>(({ category, onSongSelect, selectedSong, songs, setSongs }, ref) => {
  const { isAdmin } = useAdminAuth();
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sort, setSort] = useState<'artist' | 'title' | 'popular' | 'latest' | 'oldest'>(category === 'MISSION' ? 'oldest' : 'artist')
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [localProgress, setLocalProgress] = useState<{[id: string]: number}>({})
  const [sliderDragging, setSliderDragging] = useState<{[id: string]: boolean}>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isUpdatingLike, setIsUpdatingLike] = useState(false)

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
  const fetchSongs = async (pageNum: number, reset = false) => {
    try {
      setLoading(true)
      const data = await fetchSongsApi({
        category,
        search: debouncedSearch,
        pageNum,
        limit: 50  // 한 번에 50곡 로드
      })
      if (!data.songs || !data.pagination) {
        setSongs([])
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
      setSongs([])
      setHasMore(false)
      setPage(1)
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchSongs(1, true)
  }

  useImperativeHandle(ref, () => ({ refresh }))

  // 곡 목록, 검색, 카테고리 변경 시 fetch
  useEffect(() => {
    fetchSongs(1, true)
  }, [category, debouncedSearch])

  // 최초 마운트 시 localStorage에서 좋아요 상태 로드
  useEffect(() => {
    loadLikedSongsFromStorage()
  }, [])

  // 곡 목록이 바뀔 때만 좋아요 상태 fetch (최초 1회 또는 곡 목록 변경 시, 하지만 좋아요 클릭 후에는 제외)
  useEffect(() => {
    if (songs && songs.length > 0 && !isUpdatingLike) {
      fetchInitialLikedSongs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, isUpdatingLike])

  // 무한스크롤: 스크롤 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // 스크롤이 하단 80% 지점에 도달했을 때 다음 페이지 로드
      if (scrollTop + windowHeight >= documentHeight * 0.8) {
        if (!loading && hasMore) {
          fetchSongs(page + 1)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loading, hasMore, page, category, debouncedSearch])

  // 이벤트 리스너 등록 및 정리
  useEffect(() => {
    const refreshCleanup = onSongListRefresh(() => {
      window.location.reload()
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
  }, [setSongs])

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

  // 날짜를 YYYY.MM.DD 고정 포맷으로 반환
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getDate().toString().padStart(2,'0')}`;
  }

  const sortedSongs = [...(songs || [])].sort((a, b) => {
    if (sort === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    if (sort === 'popular') return (b.likeCount ?? 0) - (a.likeCount ?? 0)
    if (sort === 'title') {
      // 제목순 정렬 시 2차 정렬로 아티스트순 적용
      const titleCompare = a.title.localeCompare(b.title)
      return titleCompare !== 0 ? titleCompare : a.artist.localeCompare(b.artist)
    }
    if (sort === 'artist') {
      // 아티스트순 정렬 시 2차 정렬로 제목순 적용
      const artistCompare = a.artist.localeCompare(b.artist)
      return artistCompare !== 0 ? artistCompare : a.title.localeCompare(b.title)
    }
    return 0
  })

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

  // 검색어 디바운스 적용 (500ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  return (
    <div className="w-full p-4 flex flex-col min-w-0">
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
        <Select value={sort} onValueChange={(value: 'artist' | 'title' | 'popular' | 'latest' | 'oldest') => setSort(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="artist">아티스트순</SelectItem>
            <SelectItem value="title">제목순</SelectItem>
            <SelectItem value="popular">인기순</SelectItem>
            <SelectItem value="latest">최신순</SelectItem>
            <SelectItem value="oldest">과거순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && page === 1 ? (
          <div className="w-full text-center py-8 text-gray-500 text-sm">로딩 중...</div>
        ) : sortedSongs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">노래가 없습니다.</p>
          </div>
        ) : (
          sortedSongs.map((song, idx) => {
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
              const prevInitial = idx > 0 ? getInitial(sort === 'title' ? sortedSongs[idx-1].title : sortedSongs[idx-1].artist) : null;
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
              const prevMonth = idx > 0 ? getMonth(sortedSongs[idx-1].createdAt) : null;
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
              const prevGroup = idx > 0 ? getLikeGroup(sortedSongs[idx-1].likeCount || 0) : null;
              if (idx === 0 || currGroup !== prevGroup) {
                showDivider = true;
                dividerLabel = currGroup;
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
          })
        )}
      </div>
    </div>
  )
})

SongList.displayName = 'SongList' 