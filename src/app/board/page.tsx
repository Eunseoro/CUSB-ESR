"use client"
// 이 파일은 게시판(Board) 페이지입니다.
import { useEffect, useState } from 'react'
import { Board } from '@/types/board'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { fetchBoardList, addBoard, deleteBoard } from '@/lib/board-api'
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

  useEffect(() => {
    setUserKey(getUserKey())
    fetchList()
  }, [])

  async function fetchList() {
    try {
      const data = await fetchBoardList()
      setList(data)
    } catch (e) {
      // 에러 처리 필요시 추가
    }
  }

  async function handleSubmit() {
    if (!author.trim() || !content.trim()) return
    try {
      await addBoard(author, content, userKey)
      setAuthor('')
      setContent('')
      fetchList()
    } catch (e) {
      // 에러 처리 필요시 추가
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBoard(id, userKey)
      fetchList()
    } catch (e) {
      // 에러 처리 필요시 추가
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
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
      <div className="space-y-4 w-full">
        {list.length === 0 && <div className="text-center text-muted-foreground">아직 게시글이 없습니다.</div>}
        {list.map((item, idx) => {
          // 일별 구분선 표시
          const getDay = (dateString: string) => {
            const d = new Date(dateString)
            return `${d.getFullYear()}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getDate().toString().padStart(2,'0')}`
          }
          const currDay = getDay(item.createdAt)
          const prevDay = idx > 0 ? getDay(list[idx-1].createdAt) : null
          const showDivider = idx === 0 || currDay !== prevDay
          return (
            <div key={item.id}>
              {showDivider && <GroupDivider label={currDay} />}
              <Card className="w-full overflow-hidden">
                <CardHeader className="pb-0 pt-2 -my-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base leading-tight flex items-center gap-1">
                      {item.author}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">{formatDate(item.createdAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-2 px-6 pb-0 my-[-6px]">
                  <div className="flex w-full">
                    <div className="flex-1 text-sm whitespace-pre-line mb-0 flex items-center min-h-[32px]">
                      {item.content}
                    </div>
                    {(isAdmin || item.userKey === userKey) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full px-4 ml-2"
                        title="삭제"
                        onClick={() => handleDelete(item.id)}
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
} 