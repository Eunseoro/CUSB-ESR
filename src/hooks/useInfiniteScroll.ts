
import { useState, useCallback, useEffect } from 'react'
import { Song } from '@/types/song'
import { fetchSongsApi } from '@/lib/song-api'
import { filterSongsByCategory, getKoreanSortKey } from '@/lib/song-utils'

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
  const [sortedSongs, setSortedSongs] = useState<Song[]>([]) // 정렬된 곡들 저장
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
          sort: sort === 'my-likes' ? 'likeCount' : sort, // my-likes는 좋아요순으로 서버에서 정렬
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
          filteredSongs = filterSongsByCategory(data.songs, category as 'KPOP' | 'POP' | 'MISSION' | 'NEWSONG')
        }

        // 클라이언트 사이드 정렬이 필요한 경우 정렬 적용
        let finalSongs = filteredSongs
        if (sort === 'artist' || sort === 'title') {
          finalSongs = [...filteredSongs].sort((a, b) => {
            const aKey = getKoreanSortKey(sort === 'artist' ? a.artist : a.title)
            const bKey = getKoreanSortKey(sort === 'artist' ? b.artist : b.title)
            
            if (aKey !== bKey) {
              return aKey.localeCompare(bKey)
            }
            
            const aKey2 = getKoreanSortKey(sort === 'artist' ? a.title : a.artist)
            const bKey2 = getKoreanSortKey(sort === 'artist' ? b.title : b.artist)
            return aKey2.localeCompare(bKey2)
          })
        } else if (sort === 'my-likes') {
          // 나의 좋아요 필터는 useLikedSongs에서 처리하므로 여기서는 기본 정렬만 적용
          finalSongs = [...filteredSongs].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
        } else if (sort === 'first-verse' || sort === 'high-difficulty' || sort === 'loop-station' || sort === 'mr') {
          // 특별 조건 필터: 해당 조건을 만족하는 곡을 상단에 표시
          finalSongs = [...filteredSongs].sort((a, b) => {
            const aHasCondition = sort === 'first-verse' ? a.isFirstVerseOnly : 
                                 sort === 'high-difficulty' ? a.isHighDifficulty : 
                                 sort === 'loop-station' ? a.isLoopStation :
                                 a.isMr
            const bHasCondition = sort === 'first-verse' ? b.isFirstVerseOnly : 
                                 sort === 'high-difficulty' ? b.isHighDifficulty : 
                                 sort === 'loop-station' ? b.isLoopStation :
                                 b.isMr
            
            if (aHasCondition !== bHasCondition) {
              return aHasCondition ? -1 : 1
            }
            
            const aKey = getKoreanSortKey(a.artist)
            const bKey = getKoreanSortKey(b.artist)
            return aKey.localeCompare(bKey)
          })
        }
        
        // 초기 로딩 시 모든 곡을 저장하고 첫 30곡만 표시
        setAllSongs(filteredSongs)
        setSortedSongs(finalSongs)
        setSongs(finalSongs.slice(0, songsPerPage))
        setHasMore(finalSongs.length > songsPerPage)
        setPage(1)
      } else {
        // 스크롤 시에는 API 호출 없이 메모리에서 다음 30곡을 표시
        setLoadingMore(true)
        
        const nextCount = displayedCount + songsPerPage
        const nextSongs = sortedSongs.slice(0, nextCount)
        setSongs(nextSongs)
        setDisplayedCount(nextCount)
        setHasMore(nextCount < sortedSongs.length)
        setPage(pageNum)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      
      console.error('Error fetching songs:', error)
      if (reset) {
        setSongs([])
        setAllSongs([])
        setSortedSongs([])
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
  }, [category, search, sort, songsPerPage])

  // 정렬이 변경될 때마다 모든 곡을 다시 정렬
  useEffect(() => {
    if (allSongs.length === 0) return
    
    let newSortedSongs = allSongs
    
    if (sort === 'artist' || sort === 'title') {
      newSortedSongs = [...allSongs].sort((a, b) => {
        const aKey = getKoreanSortKey(sort === 'artist' ? a.artist : a.title)
        const bKey = getKoreanSortKey(sort === 'artist' ? b.artist : b.title)
        
        if (aKey !== bKey) {
          return aKey.localeCompare(bKey)
        }
        
        const aKey2 = getKoreanSortKey(sort === 'artist' ? a.title : a.artist)
        const bKey2 = getKoreanSortKey(sort === 'artist' ? b.title : b.artist)
        return aKey2.localeCompare(bKey2)
      })
    } else if (sort === 'my-likes') {
      // 나의 좋아요 필터는 useLikedSongs에서 처리하므로 여기서는 기본 정렬만 적용
      newSortedSongs = [...allSongs].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    } else if (sort === 'first-verse' || sort === 'high-difficulty' || sort === 'loop-station' || sort === 'mr') {
      // 특별 조건 필터: 해당 조건을 만족하는 곡을 상단에 표시
      newSortedSongs = [...allSongs].sort((a, b) => {
        const aHasCondition = sort === 'first-verse' ? a.isFirstVerseOnly : 
                             sort === 'high-difficulty' ? a.isHighDifficulty : 
                             sort === 'loop-station' ? a.isLoopStation :
                             a.isMr
        const bHasCondition = sort === 'first-verse' ? b.isFirstVerseOnly : 
                             sort === 'high-difficulty' ? b.isHighDifficulty : 
                             sort === 'loop-station' ? b.isLoopStation :
                             b.isMr
        
        if (aHasCondition !== bHasCondition) {
          return aHasCondition ? -1 : 1
        }
        
        const aKey = getKoreanSortKey(a.artist)
        const bKey = getKoreanSortKey(b.artist)
        return aKey.localeCompare(bKey)
      })
    }
    
    setSortedSongs(newSortedSongs)
    setSongs(newSortedSongs.slice(0, displayedCount))
    setHasMore(displayedCount < newSortedSongs.length)
  }, [sort, allSongs, displayedCount])

  const loadMoreSongs = useCallback(() => {
    if (!hasMore || loadingMore) return
    
    setLoadingMore(true)
    
    const nextCount = displayedCount + songsPerPage
    const nextSongs = sortedSongs.slice(0, nextCount)
    setSongs(nextSongs)
    setDisplayedCount(nextCount)
    setHasMore(nextCount < sortedSongs.length)
    setPage(page + 1)
    
    setLoadingMore(false)
  }, [hasMore, loadingMore, displayedCount, songsPerPage, sortedSongs, page])

  const resetPagination = useCallback(() => {
    setPage(1)
    setHasMore(true)
    setDisplayedCount(songsPerPage)
    setAllSongs([])
    setSortedSongs([])
  }, [songsPerPage])

  return {
    page,
    hasMore,
    loadingMore,
    fetchSongs,
    loadMoreSongs,
    resetPagination,
    allSongs,
    setAllSongs,
    sortedSongs,
    setSortedSongs
  }
}