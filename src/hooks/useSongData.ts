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
}

export const useSongData = ({ songs, sort, category, search, fetchSongs, resetPagination }: UseSongDataProps) => {
  const displaySongs = useMemo(() => {
    if (!songs || songs.length === 0) return []
    
    // 중복 제거 (ID 기준)
    const uniqueSongs = songs.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id)
    )
    
    // useInfiniteScroll에서 이미 필터링된 곡들을 받으므로 추가 필터링 불필요
    // 단, 검색 시에는 카테고리 제한 없이 모든 곡 표시
    let filteredSongs = uniqueSongs
    
    // 특별 조건 필터인 경우 클라이언트 사이드 정렬 적용
    if (sort === 'first-verse' || sort === 'high-difficulty' || sort === 'loop-station' || sort === 'mr') {
      return [...filteredSongs].sort((a, b) => {
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
    
    // 아티스트순이나 제목순인 경우에만 클라이언트 사이드 정렬 적용
    if (sort === 'artist' || sort === 'title') {
      return [...filteredSongs].sort((a, b) => {
        const aKey = getKoreanSortKey(sort === 'artist' ? a.artist : a.title)
        const bKey = getKoreanSortKey(sort === 'artist' ? b.artist : b.title)
        
        if (aKey !== bKey) {
          return aKey.localeCompare(bKey)
        }
        
        const aKey2 = getKoreanSortKey(sort === 'artist' ? a.title : a.artist)
        const bKey2 = getKoreanSortKey(sort === 'artist' ? b.title : b.artist)
        return aKey2.localeCompare(bKey2)
      })
    }
    
    return filteredSongs
  }, [songs, sort])

  const refresh = useCallback(() => {
    resetPagination()
    fetchSongs(1, true)
  }, [fetchSongs, resetPagination])

  return {
    displaySongs,
    refresh
  }
}