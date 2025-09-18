// 게시물 모달 컴포넌트
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LazyImage } from '@/components/LazyImage'
import { SortableImageList } from '@/components/SortableImageList'
import { LookBookPost, ImageFile } from '@/types/lookbook'

interface PostModalProps {
  post: LookBookPost
  isOpen: boolean
  isEditMode: boolean
  isAdmin: boolean
  modalClosing: boolean
  onClose: () => void
  onEdit: (post: LookBookPost) => void
  onDelete: (postId: string) => void
  onSave: (formData: { title: string; content: string; files: File[] }) => void
  editForm: {
    title: string
    content: string
    files: File[]
  }
  editImageFiles: ImageFile[]
  editExistingImages: { id: string; imageUrl: string; order: number }[]
  onEditInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onEditFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onEditImageOrderChange: (id: string, newOrder: number) => void
  onEditImageRemove: (id: string) => void
  onEditImageFilesChange: (items: ImageFile[]) => void
  onEditExistingImagesChange: (items: { id: string; imageUrl: string; order: number }[]) => void
  saving: boolean
}

export function PostModal({
  post,
  isOpen,
  isEditMode,
  isAdmin,
  modalClosing,
  onClose,
  onEdit,
  onSave,
  editForm,
  editImageFiles,
  editExistingImages,
  onEditInputChange,
  onEditFileChange,
  onEditImageOrderChange,
  onEditImageRemove,
  onEditImageFilesChange,
  onEditExistingImagesChange,
  saving
}: PostModalProps) {

  if (!isOpen || !post) return null

  // 이미지 클릭 시 모달 닫기
  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  // 모달 컨테이너 클릭 시 이벤트 전파 방지
  const handleModalContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // 텍스트 영역 클릭 시 이벤트 전파 방지
  const handleTextAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // 이미지 우클릭 방지
  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
        modalClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-card rounded-2xl shadow w-full max-w-md sm:max-w-lg lg:max-w-3xl mx-4 sm:mx-6 relative border border-border dark:bg-neutral-900 dark:border-neutral-800 p-4 sm:p-6 scrollbar-custom transition-all duration-200 ${
          modalClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={handleModalContainerClick}
      >
        {isEditMode ? (
          <>
            <input
              className="border rounded px-2 py-1 text-lg font-bold w-full mb-2 bg-background text-foreground dark:bg-neutral-800 dark:text-white"
              name="title"
              value={editForm.title}
              onChange={onEditInputChange}
              maxLength={40}
              onClick={handleTextAreaClick}
            />
            <textarea
              className="border rounded px-2 py-1 text-base w-full mb-4 bg-background text-foreground dark:bg-neutral-800 dark:text-white"
              name="content"
              value={editForm.content}
              onChange={onEditInputChange}
              maxLength={300}
              onClick={handleTextAreaClick}
              rows={6}
            />
            
            {/* 기존 이미지 드래그 앤 드롭 순서 관리 */}
            {editExistingImages.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">기존 이미지 순서:</p>
                <SortableImageList
                  items={editExistingImages.map(img => ({
                    id: img.id,
                    imageUrl: img.imageUrl,
                    fileName: `기존 이미지`,
                    order: img.order
                  }))}
                  onItemsChange={onEditExistingImagesChange}
                  onOrderChange={onEditImageOrderChange}
                  onRemove={onEditImageRemove}
                />
              </div>
            )}
            
            {/* 새 이미지 드래그 앤 드롭 순서 관리 */}
            {editImageFiles.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">새 이미지 순서:</p>
                <SortableImageList
                  items={editImageFiles.map(file => ({
                    id: file.id,
                    imageUrl: file.preview || '',
                    fileName: file.file.name,
                    order: file.order
                  }))}
                  onItemsChange={onEditImageFilesChange}
                  onOrderChange={onEditImageOrderChange}
                  onRemove={onEditImageRemove}
                />
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-2">
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={onEditFileChange}
                id="edit-file-input"
              />
              <Button type="button" variant="outline" onClick={() => document.getElementById('edit-file-input')?.click()}>
                이미지 추가
              </Button>
              <span className="text-xs text-muted-foreground ml-1">
                {editImageFiles.length === 0 ? '새 이미지를 추가하세요' : `${editImageFiles.length}장 추가됨`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={onSave} className="flex-1" disabled={saving}>
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    저장 중...
                  </div>
                ) : '저장'}
              </Button>
              <Button variant="outline" onClick={() => onEdit(post)} className="flex-1">취소</Button>
            </div>
          </>
        ) : (
          <>
            <div 
              className="font-bold text-2xl mb-3 text-foreground dark:text-white select-text"
              onClick={handleTextAreaClick}
            >
              {post.title}
            </div>
            
            {/* 조회수 표시 (관리자만) */}
            {isAdmin && (
              <div className="mb-3 px-2 py-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                   👀 : {post.viewCount || 0}
                </span>
              </div>
            )}
            
            <div 
              className="mb-4 text-gray-700 whitespace-pre-line dark:text-gray-300 select-text"
              onClick={handleTextAreaClick}
            >
              {post.content}
            </div>
            <div className="mb-4">
              {post.images.map((img: { id: string; imageUrl: string; order: number }) => (
                <LazyImage 
                  key={img.id} 
                  src={img.imageUrl} 
                  alt={post.title}
                  className="w-full mb-4 last:mb-0 rounded shadow-sm" 
                  onClick={handleImageClick}
                  onContextMenu={handleImageContextMenu}
                  draggable={false}
                />
              ))}
            </div>
            <Button onClick={onClose} className="w-full">닫기</Button>
          </>
        )}
      </div>
    </div>
  )
}
