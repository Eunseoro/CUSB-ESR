
import { useState, useCallback } from 'react'
import { Song } from '@/types/song'
import { fetchSongsApi } from '@/lib/song-api'
import { filterSongsByCategory } from '@/lib/song-utils'

interface UseInfiniteScrollProps {
  category?: string
  search: string
  sort: string
  setSongs: (songs: Song[] | ((prev: Song[]) => Song[])) => void
  setLoading: (loading: boolean) => void
  songsPerPage: number
}

export const useInfiniteScroll = ({ 
  category, 
  search, 
  sort, 
  setSongs, 
  setLoading, 
  songsPerPage 
}: UseInfiniteScrollProps) => {
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [allSongs, setAllSongs] = useState<Song[]>([]) // 모든 곡을 저장
  const [displayedCount, setDisplayedCount] = useState(songsPerPage) // 현재 표시된 곡 수

  const fetchSongs = useCallback(async (pageNum: number, reset = false, abortController?: AbortController) => {
    const controller = abortController || new AbortController()
    
    try {
      if (reset) {
        setLoading(true)
        setDisplayedCount(songsPerPage) // 초기화 시 표시 곡 수 리셋
        
        // 초기 로딩 시 1000곡을 한번에 가져옴 (검색 시에는 더 많은 데이터)
        const limit = search ? 2000 : 1000
        
        const data = await fetchSongsApi({
          category: undefined, // 서버에서는 카테고리 필터링하지 않음
          search,
          pageNum: 1,
          limit,
          sort,
          signal: controller.signal
        })
        
        if (controller.signal.aborted) return
        
        if (!data.songs || !data.pagination) {
          setSongs([])
          setAllSongs([])
          setHasMore(false)
          setPage(1)
          return
        }

        // 카테고리 필터링 적용 (검색 시에는 카테고리 제한 없음)
        let filteredSongs = data.songs
        if (category && !search) {
          filteredSongs = filterSongsByCategory(data.songs, category as any)
        }

        // 초기 로딩 시 모든 곡을 저장하고 첫 30곡만 표시
        setAllSongs(filteredSongs)
        setSongs(filteredSongs.slice(0, songsPerPage))
        setHasMore(filteredSongs.length > songsPerPage)
        setPage(1)
      } else {
        // 스크롤 시에는 API 호출 없이 메모리에서 다음 30곡을 표시
        setLoadingMore(true)
        
        const nextCount = displayedCount + songsPerPage
        const nextSongs = allSongs.slice(0, nextCount)
        setSongs(nextSongs)
        setDisplayedCount(nextCount)
        setHasMore(nextCount < allSongs.length)
        setPage(pageNum)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      
      console.error('Error fetching songs:', error)
      if (reset) {
        setSongs([])
        setAllSongs([])
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
  }, [category, search, sort, setSongs, setLoading, songsPerPage, allSongs, displayedCount])

  const loadMoreSongs = useCallback(() => {
    if (!hasMore || loadingMore) return
    
    setLoadingMore(true)
    
    const nextCount = displayedCount + songsPerPage
    const nextSongs = allSongs.slice(0, nextCount)
    setSongs(nextSongs)
    setDisplayedCount(nextCount)
    setHasMore(nextCount < allSongs.length)
    setPage(page + 1)
    
    setLoadingMore(false)
  }, [hasMore, loadingMore, displayedCount, songsPerPage, allSongs, setSongs, page])

  const resetPagination = useCallback(() => {
    setPage(1)
    setHasMore(true)
    setDisplayedCount(songsPerPage)
    setAllSongs([])
  }, [songsPerPage])

  return {
    page,
    hasMore,
    loadingMore,
    fetchSongs,
    loadMoreSongs,
    resetPagination
  }
}