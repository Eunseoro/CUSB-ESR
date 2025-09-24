import { useState, useEffect, useRef, useCallback } from 'react'
import { Song } from '@/types/song'
import { fetchLikedSongsApi, handleLikeApi } from '@/lib/song-api'
import { getKoreanSortKey } from '@/lib/song-utils'

export const useLikedSongs = (
  songs: Song[], 
  setSongs: (songs: Song[] | ((prev: Song[]) => Song[])) => void, 
  listRef?: React.RefObject<HTMLDivElement | null>,
  allSongs?: Song[],
  setAllSongs?: (songs: Song[] | ((prev: Song[]) => Song[])) => void,
  sortedSongs?: Song[],
  setSortedSongs?: (songs: Song[] | ((prev: Song[]) => Song[])) => void,
  currentSort?: string
) => {
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [updatingLikes, setUpdatingLikes] = useState<Set<string>>(new Set())

  // localStorage에서 좋아요 상태 로드
  const loadLikedSongsFromStorage = useCallback(() => {
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
  }, [])

  // 초기 좋아요 상태 fetch
  const fetchInitialLikedSongs = useCallback(async () => {
    try {
      if (!songs || songs.length === 0) return
      const likedStates = await fetchLikedSongsApi(songs)
      const likedSongIds = Object.keys(likedStates).filter(id => likedStates[id])
      setLikedSongs(new Set(likedSongIds))
      
      // localStorage 업데이트
      try {
        localStorage.setItem('likedSongs', JSON.stringify(likedSongIds))
      } catch (error) {
        console.error('Error saving likedSongs to localStorage:', error)
      }
    } catch (error) {
      console.error('Error fetching liked songs:', error)
    }
  }, [songs])

  // 상태 업데이트 헬퍼 함수
  const updateAllStates = useCallback((updateFn: (prev: Song[]) => Song[]) => {
    setSongs(updateFn)
    if (setAllSongs && allSongs) {
      setAllSongs(updateFn)
    }
    if (setSortedSongs && sortedSongs) {
      setSortedSongs(updateFn)
    }
  }, [setSongs, setAllSongs, allSongs, setSortedSongs, sortedSongs])

  // 좋아요 토글 핸들러
  const handleLike = async (songId: string) => {
    // 이미 업데이트 중인 곡인지 확인
    if (updatingLikes.has(songId)) return

    // 업데이트 중인 곡에 추가
    setUpdatingLikes(prev => new Set(prev).add(songId))
    
    const currentLikedSongs = new Set(likedSongs)
    const isLiked = currentLikedSongs.has(songId)
    
    // 낙관적 업데이트 - 즉시 UI 반영
    const optimisticLikedSongs = new Set(likedSongs)
    if (isLiked) {
      optimisticLikedSongs.delete(songId)
    } else {
      optimisticLikedSongs.add(songId)
    }
    setLikedSongs(optimisticLikedSongs)
    
    // 스크롤 위치 저장 (my-likes 정렬일 때만)
    const currentSort = (window as { currentSort?: string }).currentSort || ''
    const shouldPreserveScroll = currentSort === 'my-likes'
    let savedScrollTop = 0
    if (shouldPreserveScroll && listRef?.current) {
      savedScrollTop = listRef.current.scrollTop
    }

    // 낙관적 카운트 업데이트 - 모든 상태 업데이트
    const updateLikeCount = (prev: Song[]) => {
      return prev.map((song: Song) => {
        if (song.id === songId) {
          return {
            ...song,
            likeCount: isLiked ? Math.max(0, (song.likeCount || 1) - 1) : (song.likeCount || 0) + 1
          }
        }
        return song
      })
    }
    
    // 모든 관련 상태 업데이트 (최적화)
    updateAllStates(updateLikeCount)
    
    // 스크롤 위치 복원 (다음 렌더링 사이클에서)
    if (shouldPreserveScroll && listRef?.current) {
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = savedScrollTop
        }
      }, 0)
    }
    
    // 즉시 API 호출 (디바운스 제거)
    try {
      const result = await handleLikeApi(songId, !isLiked)
      
      // 서버 응답에 따라 최종 상태 업데이트 (최신 상태 기반)
      setLikedSongs(prevLikedSongs => {
        const finalLikedSongs = new Set(prevLikedSongs)
        if (result.liked) {
          finalLikedSongs.add(songId)
        } else {
          finalLikedSongs.delete(songId)
        }
        
        // localStorage 업데이트
        try {
          localStorage.setItem('likedSongs', JSON.stringify([...finalLikedSongs]))
        } catch (error) {
          console.error('Error saving likedSongs to localStorage:', error)
        }
        
        return finalLikedSongs
      })
      
      // 서버에서 받은 정확한 likeCount로 최종 업데이트 - 모든 상태 업데이트 (최적화)
      const updateWithServerCount = (prev: Song[]) => prev.map((song: Song) => {
        if (song.id === songId) {
          return { ...song, likeCount: result.likeCount }
        }
        return song
      })
      
      updateAllStates(updateWithServerCount)
    } catch (error) {
      console.error('Error toggling like:', error)
      // 에러 시 낙관적 업데이트 롤백 (최신 상태 기반)
      setLikedSongs(prevLikedSongs => {
        const rollbackLikedSongs = new Set(prevLikedSongs)
        if (isLiked) {
          rollbackLikedSongs.add(songId)
        } else {
          rollbackLikedSongs.delete(songId)
        }
        
        // localStorage 롤백
        try {
          localStorage.setItem('likedSongs', JSON.stringify([...rollbackLikedSongs]))
        } catch (localStorageError) {
          console.error('Error reverting likedSongs in localStorage:', localStorageError)
        }
        
        return rollbackLikedSongs
      })
      
      // 에러 시 롤백 - 모든 상태 업데이트 (최적화)
      const rollbackLikeCount = (prev: Song[]) => prev.map((song: Song) => {
        if (song.id === songId) {
          return {
            ...song,
            likeCount: isLiked ? (song.likeCount || 0) + 1 : Math.max(0, (song.likeCount || 1) - 1)
          }
        }
        return song
      })
      
      updateAllStates(rollbackLikeCount)
    } finally {
      // 업데이트 완료 시 해당 곡 제거
      setUpdatingLikes(prev => {
        const newSet = new Set(prev)
        newSet.delete(songId)
        return newSet
      })
    }
  }

  // 초기화 함수
  const initializeLikedSongs = useCallback(async () => {
    if (songs && songs.length > 0) {
      // 서버에서 최신 상태를 가져옴
      await fetchInitialLikedSongs()
    } else {
      // 곡이 없으면 localStorage에서 임시로 로드
      loadLikedSongsFromStorage()
    }
  }, [songs, fetchInitialLikedSongs, loadLikedSongsFromStorage])

  // '나의 좋아요' 정렬 처리 - 최적화된 전체 정렬
  useEffect(() => {
    if (currentSort === 'my-likes' && allSongs && setSortedSongs && setSongs) {
      const newSortedSongs = [...allSongs].sort((a, b) => {
        const aIsLiked = likedSongs.has(a.id)
        const bIsLiked = likedSongs.has(b.id)
        
        // 좋아요를 누른 곡을 상위에 표시
        if (aIsLiked !== bIsLiked) {
          return aIsLiked ? -1 : 1
        }
        
        // 좋아요 상태가 같으면 좋아요순으로 정렬
        return (b.likeCount || 0) - (a.likeCount || 0)
      })
      
      setSortedSongs(newSortedSongs)
      setSongs(newSortedSongs.slice(0, songs.length))
    }
  }, [likedSongs, currentSort, allSongs, setSortedSongs, setSongs, songs.length])

  // 정렬 필터 변경 시 allSongs의 likeCount 동기화
  useEffect(() => {
    if (allSongs && setAllSongs && songs.length > 0) {
      // songs 배열의 최신 likeCount를 allSongs에 반영
      const updatedAllSongs = allSongs.map(allSong => {
        const updatedSong = songs.find(song => song.id === allSong.id)
        return updatedSong ? { ...allSong, likeCount: updatedSong.likeCount } : allSong
      })
      
      // 변경사항이 있는 경우에만 업데이트
      const hasChanges = updatedAllSongs.some((song, index) => 
        song.likeCount !== allSongs[index].likeCount
      )
      
      if (hasChanges) {
        setAllSongs(updatedAllSongs)
      }
    }
  }, [songs, allSongs, setAllSongs])


  return {
    likedSongs,
    isUpdatingLike: (songId: string) => updatingLikes.has(songId),
    handleLike,
    initializeLikedSongs
  }
}