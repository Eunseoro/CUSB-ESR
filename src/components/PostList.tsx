// 게시물 목록 컴포넌트 (PostCard 통합)
'use client'

import { Button } from '@/components/ui/button'
import { LazyImage } from '@/components/LazyImage'
import { LookBookPost } from '@/types/lookbook'

interface PostListProps {
  posts: LookBookPost[]
  isAdmin: boolean
  deletingId: string | null
  loading: boolean
  hasMore: boolean
  onCardClick: (post: LookBookPost) => void
  onEdit: (post: LookBookPost) => void
  onDelete: (postId: string) => void
}

export function PostList({
  posts,
  isAdmin,
  deletingId,
  loading,
  hasMore,
  onCardClick,
  onEdit,
  onDelete
}: PostListProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {posts.map(post => (
        <div
          key={post.id}
          className="bg-card rounded-xl shadow p-4 flex gap-4 items-center cursor-pointer hover:shadow-lg transition-colors border border-border dark:bg-neutral-900 dark:border-neutral-800 min-w-0 overflow-hidden"
          onClick={() => onCardClick(post)}
        >
          <LazyImage
            src={post.images[0]?.imageUrl || '/noimg.png'}
            alt={post.title}
            className="w-20 h-20 object-cover rounded-lg mr-2 border border-border dark:border-neutral-700 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate text-base mb-1 text-foreground dark:text-white">
              {post.title}
            </div>
            <div className="text-sm text-muted-foreground truncate dark:text-gray-300">
              {post.content}
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onEdit(post)
                }}
              >
                수정
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onDelete(post.id)
                }} 
                disabled={deletingId === post.id}
              >
                {deletingId === post.id ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          )}
        </div>
      ))}
      
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
      {!hasMore && posts.length > 0 && (
        <div className="text-center text-muted-foreground py-4">
          모든 게시물을 불러왔습니다.
        </div>
      )}
    </div>
  )
}
