// 게시물 작성/수정 폼 컴포넌트
'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SortableImageList } from '@/components/SortableImageList'
import { ImageFile } from '@/types/lookbook'

interface PostFormProps {
  form: {
    title: string
    content: string
    files: File[]
  }
  imageFiles: ImageFile[]
  uploading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onImageOrderChange: (id: string, newOrder: number) => void
  onImageRemove: (id: string) => void
  onImageFilesChange: (items: ImageFile[]) => void
  onUpload: () => void
}

export function PostForm({
  form,
  imageFiles,
  uploading,
  onInputChange,
  onFileChange,
  onImageOrderChange,
  onImageRemove,
  onImageFilesChange,
  onUpload
}: PostFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card className="mb-3 w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto rounded-2xl">
      <CardContent className="flex flex-col gap-2 pt-0 pb-0 px-4">
        <input
          className="border rounded px-2 py-1 text-sm bg-background text-foreground dark:bg-neutral-800 dark:text-white"
          name="title"
          placeholder="제목"
          value={form.title}
          onChange={onInputChange}
          maxLength={40}
          style={{marginTop: 0, marginBottom: 0}}
        />
        <textarea
          className="border rounded px-2 py-1 text-sm bg-background text-foreground dark:bg-neutral-800 dark:text-white"
          name="content"
          placeholder="내용"
          value={form.content}
          onChange={onInputChange}
          maxLength={300}
          style={{marginTop: 0, marginBottom: 0}}
          rows={4}
        />
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            style={{paddingLeft: '10px', paddingRight: '10px'}} 
            onClick={() => fileInputRef.current?.click()}
          >
            이미지 업로드
          </Button>
          <span className="text-sm text-muted-foreground ml-1">
            {imageFiles.length === 0 ? '이미지를 업로드 해주세요' : `${imageFiles.length}장 선택됨`}
          </span>
        </div>
        
        {/* 드래그 앤 드롭 이미지 순서 관리 */}
        {imageFiles.length > 0 && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground mb-2">이미지를 드래그하여 순서를 변경하세요:</p>
            <SortableImageList
              items={imageFiles.map(file => ({
                id: file.id,
                imageUrl: file.preview || '',
                fileName: file.file.name,
                order: file.order
              }))}
              onItemsChange={onImageFilesChange}
              onOrderChange={onImageOrderChange}
              onRemove={onImageRemove}
            />
          </div>
        )}
        
        <Button 
          onClick={onUpload} 
          disabled={uploading || !form.title.trim() || !form.content.trim() || imageFiles.length === 0} 
          style={{marginBottom: 0}}
        >
          {uploading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              게시 중...
            </div>
          ) : '게시'}
        </Button>
      </CardContent>
    </Card>
  )
}
