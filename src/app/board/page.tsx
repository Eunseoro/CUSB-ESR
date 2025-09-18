"use client"
// 이 파일은 게시판(Board) 페이지입니다.
import { useEffect, useState } from 'react'
import { Board } from '@/types/board'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { fetchBoardList, addBoard, deleteBoard, getPinnedGuestbookIds, setPinnedGuestbookIds, fetchBoardById } from '@/lib/board-api'
import { formatDate } from '@/lib/song-utils'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

function getUserKey() {
  let key = ''
  if (typeof window !== 'undefined') {
    key = localStorage.getItem('board_user_key') || ''
    if (!key) {
      key = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('board_user_key', key)
    }
  }
  return key
}

// 그룹 구분선 컴포넌트: ---2024.07.04--- 형태로 가운데 정렬
const GroupDivider = ({ label }: { label: string }) => (
  <div className="flex items-center my-2">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="mx-3 text-base font-bold text-gray-400 select-none">{label}</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
)

export default function BoardPage() {
  const { isAdmin } = useAdminAuth()
  const [list, setList] = useState<Board[]>([])
  const [pinnedBoards, setPinnedBoards] = useState<Board[]>([]) // pinned 게시물을 별도로 관리
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [userKey, setUserKey] = useState('')
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const fetchList = async (page: number = 1, isInitial: boolean = false) => {
    if (loading) return
    
    setLoading(true)
    try {
      const limit = 10 // 모든 페이지에서 10개씩 로드
      const data = await fetchBoardList(page, limit)
      
      // 데이터가 없거나 빈 배열인 경우 처리
      if (!data || data.length === 0) {
        if (isInitial) {
          setList([])
        }
        setHasMore(false)
        return
      }
      
      if (isInitial) {
        // 초기 로딩 시에는 pinned 게시물과 중복 제거
        setList(prev => {
          const existingIds = new Set(prev.map(item => item.id))
          const newItems = data.filter(item => !existingIds.has(item.id))
          return [...prev, ...newItems]
        })
      } else {
        // 무한스크롤 시 중복 제거 로직 추가 (일반 게시물만)
        setList(prev => {
          const existingIds = new Set(prev.map(item => item.id))
          const newItems = data.filter(item => !existingIds.has(item.id))
          return [...prev, ...newItems]
        })
      }
      
      // 더 이상 로드할 데이터가 없으면 hasMore를 false로 설정
      setHasMore(data.length === limit)
      setCurrentPage(page)
    } catch (e) {
      console.error('게시물 로드 실패:', e)
      setHasMore(false)
      
      // 초기 로딩 실패 시 빈 배열 설정
      if (isInitial) {
        setList([])
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchPinned = async () => {
    try {
      const ids = await getPinnedGuestbookIds()
      
      // ids가 없거나 빈 배열인 경우 처리
      if (!ids || ids.length === 0) {
        setPinnedIds([])
        setPinnedBoards([])
        return
      }
      
      setPinnedIds(ids)
      
      // pinned 게시물들을 개별적으로 로드하여 별도 상태에 저장
      // 동시 요청 수를 제한하여 서버 부하 감소
      const pinnedBoards: Board[] = []
      for (const id of ids) {
        try {
          const board = await fetchBoardById(id)
          if (board) {
            pinnedBoards.push(board)
          }
        } catch (error) {
          console.error(`Pinned 게시물 ${id} 로드 실패:`, error)
          // 개별 실패는 무시하고 계속 진행
        }
      }
      
      setPinnedBoards(pinnedBoards)
    } catch (e) {
      console.error('고정 게시물 로드 실패:', e)
      setPinnedIds([])
      setPinnedBoards([])
    }
  }

  useEffect(() => {
    const initializeBoard = async () => {
      try {
        setUserKey(getUserKey())
        
        // pinned 게시물을 먼저 로드
        await fetchPinned()
        
        // 그 다음 일반 게시물 로드 (pinned와 중복 제거)
        await fetchList(1, true)
      } catch (error) {
        console.error('게시판 초기화 실패:', error)
      }
    }
    initializeBoard()
  }, []) // 의존성 제거

  // 무한스크롤 감지 (디바운싱 적용)
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      if (loading || !hasMore) return
      
      // 이전 타이머 취소
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      // 200ms 디바운싱 적용
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        
        // 80% 스크롤 시 다음 페이지 로드
        if (scrollTop + windowHeight >= documentHeight * 0.8) {
          fetchList(currentPage + 1, false)
        }
      }, 200)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [loading, hasMore, currentPage])

  async function handlePin(id: string, checked: boolean) {
    let newIds: string[]
    if (checked) {
      newIds = [...pinnedIds, id].filter((v, i, arr) => arr.indexOf(v) === i)
    } else {
      newIds = pinnedIds.filter(x => x !== id)
    }
    await setPinnedGuestbookIds(newIds)
    
    // pinned 상태 업데이트
    if (checked) {
      // pinned 추가: 일반 게시물에서 찾아서 pinnedBoards에 추가
      const boardToPin = list.find(item => item.id === id)
      if (boardToPin) {
        setPinnedBoards(prev => [...prev, boardToPin])
      }
    } else {
      // pinned 제거: pinnedBoards에서 제거
      setPinnedBoards(prev => prev.filter(item => item.id !== id))
    }
    
    setPinnedIds(newIds)
  }

  async function handleSubmit() {
    if (!author.trim() || !content.trim()) return
    try {
      const newBoard = await addBoard(author, content, userKey)
      
      // 새 게시물이 pinned 게시물이 아닌 경우에만 일반 리스트에 추가
      if (!pinnedIds.includes(newBoard.id)) {
        setList(prev => [newBoard, ...prev])
      }
      
      setAuthor('')
      setContent('')
    } catch (error) {
      console.error('게시물 등록 실패:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteBoard(id, userKey)
      setDeletingId(null);
      
      // pinned 게시물에서도 제거
      setPinnedBoards(prev => prev.filter(item => item.id !== id))
      setPinnedIds(prev => prev.filter(pid => pid !== id))
      
      // 일반 게시물에서도 제거
      setList(prev => prev.filter(item => item.id !== id))
      
      // 삭제된 게시물이 pinned였다면 서버의 pinned 목록도 업데이트
      if (pinnedIds.includes(id)) {
        const updatedPinnedIds = pinnedIds.filter(pid => pid !== id)
        await setPinnedGuestbookIds(updatedPinnedIds)
      }
    } catch (error) {
      setDeletingId(null);
      console.error('게시물 삭제 실패:', error)
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto p-2 md:p-4 pb-24 md:pb-16">
      <h1 className="text-2xl font-bold mb-1">쥐수게시판</h1>
      <div className="text-muted-foreground mb-6">
        <p>방명록 & 수다 & 버그신고 & 건의사항 등 자유롭게 사용하는 게시판입니다.</p>
        <p>타인에게 불쾌감을 주는 내용과 도배는 삼가주세요 :)</p>
      </div>
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2">
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="이름"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            maxLength={20}
          />
          <textarea
            className="border rounded px-2 py-1 text-sm min-h-[60px]"
            placeholder="내용을 입력하세요"
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={300}
          />
          <Button onClick={handleSubmit} disabled={!author.trim() || !content.trim()}>등록</Button>
        </CardContent>
      </Card>
      <div className="space-y-2 w-full mb-8">
        {/* 고정된 게시글 먼저 렌더링 */}
        {pinnedBoards.length > 0 && (
          <>
            <GroupDivider label={"고정됨"} />
            {pinnedBoards.map(pinned => (
              <div key={`pinned-${pinned.id}`}>
                <Card
                  className="w-full overflow-hidden animate-pulse-glow border-2 border-indigo-400 shadow-lg"
                >
                  <CardHeader className="pb-0 pt-2 -my-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base leading-tight flex items-center gap-1 min-w-0 flex-1">
                        {pinned.author}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap flex-shrink-0">{formatDate(pinned.createdAt)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 px-2 md:px-6 pb-0 my-[-6px]">
                    <div className="flex w-full items-start gap-2">
                      <div className="flex-1 text-sm whitespace-pre-line mb-0 min-h-[32px] overflow-hidden">
                        {pinned.content}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* 고정 체크박스 (관리자만) */}
                        {isAdmin && (
                          <input
                            type="checkbox"
                            checked={pinnedIds.includes(pinned.id)}
                            onChange={e => handlePin(pinned.id, e.target.checked)}
                            className="accent-purple-500 cursor-pointer"
                            style={{ width: '18px', height: '18px' }}
                            title="상단 고정 해제"
                          />
                        )}
                        {(isAdmin || pinned.userKey === userKey) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-full px-2 md:px-4 text-xs"
                            title="삭제"
                            onClick={e => {e.stopPropagation(); handleDelete(pinned.id)}}
                            disabled={deletingId === pinned.id}
                          >
                            {deletingId === pinned.id ? '삭제 중...' : '삭제'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </>
        )}
        {/* 나머지 게시글 */}
        {list.filter(item => !pinnedIds.includes(item.id)).map((item, idx, arr) => {
          // 일별 구분선 표시
          const getDay = (dateString: string) => {
            const d = new Date(dateString)
            return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getDate().toString().padStart(2,'0')}`
          }
          const currDay = getDay(item.createdAt)
          const prevDay = idx > 0 ? getDay(arr[idx-1].createdAt) : null
          const showDivider = idx === 0 || currDay !== prevDay
          return (
            <div key={`normal-${item.id}`}>
              {showDivider && <GroupDivider label={currDay} />}
              <Card
                className="w-full overflow-hidden"
              >
                <CardHeader className="pb-0 pt-2 -my-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base leading-tight flex items-center gap-1 min-w-0 flex-1">
                      {item.author}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap flex-shrink-0">{formatDate(item.createdAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-2 px-2 md:px-6 pb-0 my-[-6px]">
                  <div className="flex w-full items-start gap-2">
                    <div className="flex-1 text-sm whitespace-pre-line mb-0 min-h-[32px] overflow-hidden">
                      {item.content}
                    </div>
                    {(isAdmin || item.userKey === userKey) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isAdmin && (
                          <input
                            type="checkbox"
                            checked={pinnedIds.includes(item.id)}
                            onChange={e => handlePin(item.id, e.target.checked)}
                            className="accent-purple-500 cursor-pointer"
                            style={{ width: '18px', height: '18px' }}
                            title="상단 고정"
                          />
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full px-2 md:px-4 text-xs"
                          title="삭제"
                          onClick={e => {e.stopPropagation(); handleDelete(item.id)}}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? '삭제 중...' : '삭제'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
        
        {/* 로딩 인디케이터 */}
        {loading && (
          <div className="text-center text-muted-foreground py-4">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              로딩 중...
            </div>
          </div>
        )}
        
        {/* 더 이상 로드할 게시물이 없을 때 */}
        {!hasMore && list.length > 0 && (
          <div className="text-center text-muted-foreground py-4">
            모든 게시물을 표시했습니다.
          </div>
        )}
      </div>
    </div>
  )
} 