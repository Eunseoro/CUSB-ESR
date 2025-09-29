"use client"
// 협업 메모 컴포넌트: 포스트잇 형태의 메모 시스템
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, X, MessageSquare, Plus, Trash2, ArrowUp } from 'lucide-react'

// 메모 타입 정의
interface CollaborationMemo {
  id: string
  target: string
  content: string
  status: 'pending' | 'approved' | 'rejected'
  color: 'yellow' | 'green' | 'red'
  createdAt: string
  updatedAt: string
  comments: CollaborationMemoComment[]
}

interface CollaborationMemoComment {
  id: string
  content: string
  createdAt: string
}

// 대상 옵션
const TARGET_OPTIONS = [
  { value: '제작자', label: '제작자' },
  { value: '유할매', label: '유할매' },
  { value: '할동부', label: '할동부' }
]

// 색상 클래스 매핑
const COLOR_CLASSES = {
  yellow: 'bg-yellow-100 border-yellow-300',
  green: 'bg-green-200 border-green-300',
  red: 'bg-red-200 border-red-300'
}

export function CollaborationMemo() {
  const [memos, setMemos] = useState<CollaborationMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newMemo, setNewMemo] = useState({ target: '', content: '' })
  const [newComments, setNewComments] = useState<{ [memoId: string]: string }>({})

  // 메모 목록 조회
  const fetchMemos = async () => {
    try {
      const response = await fetch('/api/collaboration-memo')
      const data = await response.json()
      setMemos(data)
    } catch (error) {
      console.error('메모 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemos()
  }, [])

  // 새 메모 생성
  const handleCreateMemo = async () => {
    if (!newMemo.target || !newMemo.content.trim()) return

    try {
      const response = await fetch('/api/collaboration-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemo)
      })

      if (response.ok) {
        setNewMemo({ target: '', content: '' })
        setIsCreating(false)
        fetchMemos()
      }
    } catch (error) {
      console.error('메모 생성 실패:', error)
    }
  }

  // 메모 작성 취소
  const handleCancelCreate = () => {
    setNewMemo({ target: '', content: '' })
    setIsCreating(false)
  }

  // 메모 상태 변경 (승인/거부)
  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/collaboration-memo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        fetchMemos()
      }
    } catch (error) {
      console.error('상태 변경 실패:', error)
    }
  }

  // 메모 삭제
  const handleDeleteMemo = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/collaboration-memo/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchMemos()
      }
    } catch (error) {
      console.error('메모 삭제 실패:', error)
    }
  }

  // 댓글 추가
  const handleAddComment = async (memoId: string) => {
    const comment = newComments[memoId]
    if (!comment || !comment.trim()) return

    try {
      const response = await fetch(`/api/collaboration-memo/${memoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment })
      })

      if (response.ok) {
        setNewComments(prev => ({ ...prev, [memoId]: '' }))
        fetchMemos()
      }
    } catch (error) {
      console.error('댓글 추가 실패:', error)
    }
  }

  // 댓글 입력 변경
  const handleCommentChange = (memoId: string, value: string) => {
    setNewComments(prev => ({ ...prev, [memoId]: value }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">메모를 불러오는 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-0">
      {/* 메모 목록 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 새 메모 작성 카드 (가장 왼쪽) */}
          {isCreating ? (
            <Card className={`${COLOR_CLASSES.yellow} border-2 shadow-lg`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-black">
                    <Select value={newMemo.target} onValueChange={(value) => setNewMemo(prev => ({ ...prev, target: value }))}>
                      <SelectTrigger className="w-auto h-6 p-1 text-xs border-none bg-transparent text-black">
                        <SelectValue placeholder="To. 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCreateMemo}
                      disabled={!newMemo.target || !newMemo.content.trim()}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 bg-green-100 hover:bg-green-200 border border-green-200 rounded-full"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelCreate}
                      className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  placeholder="내용을 입력하세요"
                  value={newMemo.content}
                  onChange={(e) => setNewMemo(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-[120px] text-sm border-none bg-transparent resize-none focus:ring-0 text-black"
                  autoFocus
                />
              </CardContent>
            </Card>
          ) : (
            <Card className={`${COLOR_CLASSES.yellow} border-2 shadow-lg cursor-pointer hover:shadow-xl transition-shadow`} onClick={() => setIsCreating(true)}>
              <CardContent className="flex flex-col items-center justify-center h-32 text-center">
                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">메모 추가</p>
              </CardContent>
            </Card>
          )}

          {/* 기존 메모들 */}
          {memos.map((memo) => (
            <Card
              key={memo.id}
              className={`${COLOR_CLASSES[memo.color]} border-2 shadow-lg transform hover:scale-105 transition-transform`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-black">
                    To. {memo.target}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusChange(memo.id, 'approved')}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 bg-green-100 hover:bg-green-200 border border-green-200 rounded-full"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusChange(memo.id, 'rejected')}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMemo(memo.id)}
                      className="h-6 w-6 p-0 text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm mb-3 whitespace-pre-wrap text-black">{memo.content}</p>
                
                {/* 댓글 섹션 */}
                <div className="space-y-2">
                  {/* 구분선과 의견 아이콘 */}
                  <div className="flex items-center gap-1 py-1">
                    <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                    <MessageSquare className="w-3 h-3 text-gray-400" />
                    <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                  </div>
                  
                  {/* 의견 목록 */}
                  {memo.comments.map((comment) => (
                    <div key={comment.id} className="text-xs bg-white/50 p-2 rounded">
                      <p className="text-black">{comment.content}</p>
                      <p className="text-gray-500 mt-1">
                        {new Date(comment.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  ))}
                  
                  {/* 새 의견 입력 */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="의견을 입력하세요"
                      value={newComments[memo.id] || ''}
                      onChange={(e) => handleCommentChange(memo.id, e.target.value)}
                      className="text-xs"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment(memo.id)
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddComment(memo.id)}
                      disabled={!newComments[memo.id]?.trim()}
                      className="h-6 w-6 p-0 border border-gray-300 rounded-full hover:bg-gray-50"
                    >
                      <ArrowUp className="w-4 h-4 text-gray-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
