
import { useState, useCallback } from 'react'
import { Song } from '@/types/song'
import { fetchSongsApi } from '@/lib/song-api'

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

  const fetchSongs = useCallback(async (pageNum: number, reset = false, abortController?: AbortController) => {
    const controller = abortController || new AbortController()
    
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const data = await fetchSongsApi({
        category,
        search,
        pageNum,
        limit: songsPerPage,
        sort,
        signal: controller.signal
      })
      
      if (controller.signal.aborted) return
      
      if (!data.songs || !data.pagination) {
        if (reset) setSongs([])
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
      if (error instanceof Error && error.name === 'AbortError') return
      
      console.error('Error fetching songs:', error)
      if (reset) setSongs([])
      setHasMore(false)
      setPage(1)
    } finally {
      if (reset) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }, [category, search, sort, setSongs, setLoading, songsPerPage])

  const resetPagination = useCallback(() => {
    setPage(1)
    setHasMore(true)
  }, [])

  return {
    page,
    hasMore,
    loadingMore,
    fetchSongs,
    resetPagination
  }
}