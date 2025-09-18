import { useState, useEffect, useRef, useCallback } from 'react'
import { Song } from '@/types/song'
import { fetchLikedSongsApi, handleLikeApi } from '@/lib/song-api'

export const useLikedSongs = (songs: Song[], setSongs: (songs: Song[] | ((prev: Song[]) => Song[])) => void, listRef?: React.RefObject<HTMLDivElement | null>) => {
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set())
  const [updatingLikes, setUpdatingLikes] = useState<Set<string>>(new Set())
  const likeRequestTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

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

  // 좋아요 토글 핸들러
  const handleLike = async (songId: string) => {
    // 이미 업데이트 중인 곡인지 확인
    if (updatingLikes.has(songId)) return

    // 기존 타임아웃이 있다면 취소
    const existingTimeout = likeRequestTimeouts.current.get(songId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

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

    // 낙관적 카운트 업데이트
    setSongs((prev: Song[]) => {
      const updatedSongs = prev.map((song: Song) => {
        if (song.id === songId) {
          return {
            ...song,
            likeCount: isLiked ? Math.max(0, (song.likeCount || 1) - 1) : (song.likeCount || 0) + 1
          }
        }
        return song
      })
      
      // 스크롤 위치 복원 (다음 렌더링 사이클에서)
      if (shouldPreserveScroll && listRef?.current) {
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = savedScrollTop
          }
        }, 0)
      }
      
      return updatedSongs
    })
    
    // 디바운싱 적용 (각 곡별로 독립적)
    const timeout = setTimeout(async () => {
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
        
        // 서버에서 받은 정확한 likeCount로 최종 업데이트
        setSongs((prev: Song[]) => prev.map((song: Song) => {
          if (song.id === songId) {
            return { ...song, likeCount: result.likeCount }
          }
          return song
        }))
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
        
        setSongs((prev: Song[]) => prev.map((song: Song) => {
          if (song.id === songId) {
            return {
              ...song,
              likeCount: isLiked ? (song.likeCount || 0) + 1 : Math.max(0, (song.likeCount || 1) - 1)
            }
          }
          return song
        }))
      } finally {
        // 업데이트 완료 시 해당 곡 제거
        setUpdatingLikes(prev => {
          const newSet = new Set(prev)
          newSet.delete(songId)
          return newSet
        })
        likeRequestTimeouts.current.delete(songId)
      }
    }, 100)
    
    likeRequestTimeouts.current.set(songId, timeout)
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

  // 클린업
  useEffect(() => {
    return () => {
      // 모든 타임아웃 정리
      likeRequestTimeouts.current.forEach(timeout => {
        clearTimeout(timeout)
      })
      likeRequestTimeouts.current.clear()
    }
  }, [])

  return {
    likedSongs,
    isUpdatingLike: (songId: string) => updatingLikes.has(songId),
    handleLike,
    initializeLikedSongs
  }
}