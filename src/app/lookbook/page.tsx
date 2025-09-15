"use client"

import { Suspense } from "react"
import { useAdminAuth } from "@/contexts/AdminAuthContext"
import { PostForm } from "@/components/PostForm"
import { PostList } from "@/components/PostList"
import { PostModal } from "@/components/PostModal"
import { useLookbook } from "@/hooks/useLookbook"

function LookBookContent() {
  const { isAdmin } = useAdminAuth()
  const {
    // 상태
    posts,
    selected,
    showModal,
    modalClosing,
    deletingId,
    loading,
    hasMore,
    uploading,
    saving,
    form,
    imageFiles,
    editMode,
    editForm,
    editImageFiles,
    editExistingImages,
    
    // 핸들러
    handleCardClick,
    handleModalClose,
    handleEdit,
    handleDelete,
    handleInputChange,
    handleEditInputChange,
    handleFileChange,
    handleEditFileChange,
    handleImageOrderChange,
    handleEditImageOrderChange,
    handleImageRemove,
    handleEditImageRemove,
    handleImageFilesChange,
    handleEditImageFilesChange,
    handleEditExistingImagesChange,
    handleUpload,
    handleEditSave
  } = useLookbook()

  return (
    <div className="flex flex-col items-center max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto min-h-[60vh] px-0 pb-20">
      <h1 className="text-2xl font-bold mt-2 mb-2">유할매's OOTD</h1>
      <h2 className="flex flex-col text-sm items-center text-muted-foreground mb-3">
        <p>매일의 방송 요약과 패션을 기록합니다.</p>
        <p>팬카페에 올려주시는 이미지를 선정하거나,</p>
        <p>클립에서 캡쳐하여 업로드합니다.</p>
      </h2>
      
      {isAdmin && (
        <PostForm
          form={form}
          imageFiles={imageFiles}
          uploading={uploading}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          onImageOrderChange={handleImageOrderChange}
          onImageRemove={handleImageRemove}
          onImageFilesChange={handleImageFilesChange}
          onUpload={handleUpload}
        />
      )}
      
      <PostList
        posts={posts}
        isAdmin={isAdmin}
        deletingId={deletingId}
        loading={loading}
        hasMore={hasMore}
        onCardClick={handleCardClick}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      {selected && (
        <PostModal
          post={selected}
          isOpen={showModal}
          isEditMode={editMode}
          isAdmin={isAdmin}
          modalClosing={modalClosing}
          onClose={handleModalClose}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSave={handleEditSave}
          editForm={editForm}
          editImageFiles={editImageFiles}
          editExistingImages={editExistingImages}
          onEditInputChange={handleEditInputChange}
          onEditFileChange={handleEditFileChange}
          onEditImageOrderChange={handleEditImageOrderChange}
          onEditImageRemove={handleEditImageRemove}
          onEditImageFilesChange={handleEditImageFilesChange}
          onEditExistingImagesChange={handleEditExistingImagesChange}
          saving={saving}
        />
            )}
          </div>
  )
}

export default function LookBookPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <LookBookContent />
    </Suspense>
  )
} 