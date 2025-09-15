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
    
    // 나의 좋아요 필터인 경우
    if (sort === 'my-likes') {
      return [...filteredSongs].sort((a, b) => {
        const aIsLiked = likedSongs?.has(a.id) || false
        const bIsLiked = likedSongs?.has(b.id) || false
        
        // 좋아요를 누른 곡을 상위에 표시
        if (aIsLiked !== bIsLiked) {
          return aIsLiked ? -1 : 1
        }
        
        // 좋아요 상태가 같으면 좋아요순으로 정렬
        return (b.likeCount || 0) - (a.likeCount || 0)
      })
    }
    
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
    
 
    return filteredSongs
  }, [songs, sort, likedSongs])

  const refresh = useCallback(() => {
    resetPagination()
    fetchSongs(1, true)
  }, [fetchSongs, resetPagination])

  return {
    displaySongs,
    refresh
  }
}