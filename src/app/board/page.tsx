"use client"
// 이 파일은 게시판(Board) 페이지입니다.
import { useEffect, useState, useCallback } from 'react'
import { Board } from '@/types/board'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { fetchBoardList, addBoard, deleteBoard, getPinnedGuestbookIds, setPinnedGuestbookIds } from '@/lib/board-api'
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
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [userKey, setUserKey] = useState('')
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const fetchList = useCallback(async (page: number = 1, isInitial: boolean = false, retryCount: number = 0) => {
    if (loading) return
    
    setLoading(true)
    try {
      const limit = 10 // 모든 페이지에서 10개씩 로드
      const data = await fetchBoardList(page, limit)
      
      if (isInitial) {
        setList(data)
      } else {
        // 중복 제거 로직 추가
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
      
      // 재시도 로직 (최대 3회)
      if (retryCount < 3) {
        console.log(`재시도 중... (${retryCount + 1}/3)`)
        setTimeout(() => {
          fetchList(page, isInitial, retryCount + 1)
        }, 1000 * (retryCount + 1)) // 1초, 2초, 3초 간격으로 재시도
        return
      }
      
      // 최대 재시도 횟수 초과 시 hasMore를 false로 설정하여 무한 로딩 방지
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading]) // loading 의존성 추가

  const fetchPinned = useCallback(async () => {
    try {
      const ids = await getPinnedGuestbookIds()
      setPinnedIds(ids)
    } catch (e) {
      console.error('고정 게시물 로드 실패:', e)
      setPinnedIds([])
    }
  }, [])

  useEffect(() => {
    setUserKey(getUserKey())
    fetchList(1, true)
    fetchPinned()
  }, [fetchList, fetchPinned]) // 의존성 추가

  // 무한스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // 80% 스크롤 시 다음 페이지 로드
      if (scrollTop + windowHeight >= documentHeight * 0.8) {
        fetchList(currentPage + 1, false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loading, hasMore, currentPage]) // fetchList 의존성 제거

  async function handlePin(id: string, checked: boolean) {
    let newIds: string[]
    if (checked) {
      newIds = [...pinnedIds, id].filter((v, i, arr) => arr.indexOf(v) === i)
    } else {
      newIds = pinnedIds.filter(x => x !== id)
    }
    await setPinnedGuestbookIds(newIds)
    await fetchPinned() // 서버와 동기화
  }

  async function handleSubmit() {
    if (!author.trim() || !content.trim()) return
    try {
      await addBoard(author, content, userKey)
      setAuthor('')
      setContent('')
      // 새 게시물 추가 후 전체 목록 새로고침
      setCurrentPage(1)
      setHasMore(true)
      fetchList(1, true)
    } catch {
      // 에러 처리 필요시 추가
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteBoard(id, userKey)
      setDeletingId(null);
      // 게시물 삭제 후 전체 목록 새로고침
      setCurrentPage(1)
      setHasMore(true)
      fetchList(1, true)
    } catch {
      setDeletingId(null);
      // 에러 처리 필요시 추가
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
        {pinnedIds.length > 0 && (
          <>
            <GroupDivider label={"고정됨"} />
            {pinnedIds.map(pid => {
              const pinned = list.find(item => item.id === pid)
              if (!pinned) return null
              return (
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
              )
            })}
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
            모든 게시물을 불러왔습니다.
          </div>
        )}
      </div>
    </div>
  )
} 