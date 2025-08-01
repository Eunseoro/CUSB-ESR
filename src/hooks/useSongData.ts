import { useMemo, useCallback } from 'react'
import { Song } from '@/types/song'
import { getKoreanSortKey } from '@/lib/song-utils'

interface UseSongDataProps {
  songs: Song[]
  sort: string
  fetchSongs: (page: number, reset: boolean) => void
  resetPagination: () => void
}

export const useSongData = ({ songs, sort, fetchSongs, resetPagination }: UseSongDataProps) => {
  const displaySongs = useMemo(() => {
    if (!songs || songs.length === 0) return []
    
    // 특별 조건 필터인 경우 클라이언트 사이드 정렬 적용
    if (sort === 'first-verse' || sort === 'high-difficulty' || sort === 'loop-station') {
      return [...songs].sort((a, b) => {
        const aHasCondition = sort === 'first-verse' ? a.isFirstVerseOnly : 
                             sort === 'high-difficulty' ? a.isHighDifficulty : 
                             a.isLoopStation
        const bHasCondition = sort === 'first-verse' ? b.isFirstVerseOnly : 
                             sort === 'high-difficulty' ? b.isHighDifficulty : 
                             b.isLoopStation
        
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
      return [...songs].sort((a, b) => {
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
    
    return songs
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