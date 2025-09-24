import { useMemo, useCallback } from 'react'
import { Song } from '@/types/song'
import { getKoreanSortKey, filterSongsByCategory } from '@/lib/song-utils'

interface UseSongDataProps {
  songs: Song[]
  sort: string
  category?: string
  search?: string
  fetchSongs: (page: number, reset: boolean) => void
  resetPagination: () => void
  likedSongs?: Set<string>
}

export const useSongData = ({ songs, sort, category, search, fetchSongs, resetPagination, likedSongs }: UseSongDataProps) => {
  const displaySongs = useMemo(() => {
    if (!songs || songs.length === 0) return []
    
    // 중복 제거 (ID 기준)
    const uniqueSongs = songs.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id)
    )
    
    // useInfiniteScroll에서 이미 필터링된 곡들을 받으므로 추가 필터링 불필요
    // 단, 검색 시에는 카테고리 제한 없이 모든 곡 표시
    let filteredSongs = uniqueSongs
    
    // 나의 좋아요 필터는 useInfiniteScroll에서 처리하므로 여기서는 제거
    
    // 특별 조건 필터는 useInfiniteScroll에서 처리하므로 여기서는 제거
    
 
    return filteredSongs
  }, [songs])

  const refresh = useCallback(() => {
    resetPagination()
    fetchSongs(1, true)
  }, [fetchSongs, resetPagination])

  return {
    displaySongs,
    refresh
  }
}