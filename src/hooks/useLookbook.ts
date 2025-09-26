// OOTD 페이지 비즈니스 로직 훅
'use client'

import { useState, useEffect, useCallback } from 'react'
import { LookBookPost, ImageFile } from '@/types/lookbook'

export function useLookbook() {
  // 상태 관리
  const [posts, setPosts] = useState<LookBookPost[]>([])
  const [selected, setSelected] = useState<LookBookPost | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Blob URL 해제 유틸리티 함수
  const revokeBlobUrls = useCallback((imageFiles: ImageFile[]) => {
    imageFiles.forEach(imgFile => {
      if (imgFile.preview && imgFile.preview.startsWith('blob:')) {
        URL.revokeObjectURL(imgFile.preview)
      }
    })
  }, [])
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  // 폼 상태
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', files: [] as File[] })
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([])
  
  // 수정 모드 상태
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', content: '', files: [] as File[] })
  const [editImageFiles, setEditImageFiles] = useState<ImageFile[]>([])
  const [editExistingImages, setEditExistingImages] = useState<{ id: string; imageUrl: string; order: number }[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])

  // 모달 오픈 시 body 스크롤 방지
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showModal])

  // 컴포넌트 언마운트 시 Blob URL 정리
  useEffect(() => {
    return () => {
      // 모든 Blob URL 해제
      revokeBlobUrls(imageFiles)
      revokeBlobUrls(editImageFiles)
    }
  }, [imageFiles, editImageFiles, revokeBlobUrls])

  // 초기 데이터 로드
  useEffect(() => {
    fetchPosts(1, true)
  }, [])

  // 무한스크롤 감지 - 디바운스 적용
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null
    
    const handleScroll = () => {
      if (loading || !hasMore) return
      
      // 기존 타이머 클리어
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
      
      // 디바운스 적용 (200ms)
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        
        if (scrollTop + windowHeight >= documentHeight * 0.8) {
          fetchPosts(currentPage + 1, false)
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

  // API 함수들
  const fetchPosts = useCallback(async (page: number = 1, isInitial: boolean = false) => {
    if (loading) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/lookbook?page=${page}&limit=10`)
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const text = await res.text()
      if (!text) {
        throw new Error('Empty response from server')
      }
      
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError)
        console.error('응답 텍스트:', text)
        throw new Error('Invalid JSON response from server')
      }
      
      if (isInitial) {
        setPosts(data.posts || [])   
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map((p: LookBookPost) => p.id))
          const newPosts = (data.posts || []).filter((p: LookBookPost) => !existingIds.has(p.id))
          return [...prev, ...newPosts]
        })
      }
      
      setHasMore(data.hasMore || false)
      setCurrentPage(page)
    } catch (error) {
      console.error('게시물 로드 실패:', error)
      // 에러 발생 시 빈 배열로 초기화
      if (isInitial) {
        setPosts([])
      }
    } finally {
      setLoading(false)
    }
  }, [loading])


  const incrementViewCount = useCallback(async (postId: string) => {
    // 로컬 스토리지 기반 중복 방지 (기기별)
    const viewedKey = `viewed_${postId}`
    const hasViewed = localStorage.getItem(viewedKey)
    
    if (hasViewed) {
      console.log('이미 조회한 게시물')
      return
    }
    
    try {
      console.log('조회수 증가 요청 시작:', postId)
      const response = await fetch(`/api/lookbook?id=${postId}&action=view`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('조회수 증가 응답:', data)
        
        if (!data.alreadyViewed) {
          // 로컬 스토리지에 조회 기록 저장 (기기별 영구 저장)
          localStorage.setItem(viewedKey, 'true')
        }
        
        // 조회수 업데이트
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { ...post, viewCount: data.viewCount }
              : post
          )
        )
        setSelected(prevSelected => 
          prevSelected && prevSelected.id === postId
            ? { ...prevSelected, viewCount: data.viewCount }
            : prevSelected
        )
      } else {
        console.error('조회수 증가 실패:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to increment view count:', error)
    }
  }, [])

  // 이벤트 핸들러들
  const handleCardClick = useCallback((post: LookBookPost) => {
    setOverlayVisible(true)
    setSelected(post)
    setShowModal(true)
    incrementViewCount(post.id)
  }, [incrementViewCount])

  const handleModalClose = useCallback(() => {
    setOverlayVisible(false)
    setModalClosing(true)
    setTimeout(() => {
      // 수정 모드 Blob URL 해제
      if (editMode) {
        revokeBlobUrls(editImageFiles)
        setEditImageFiles([])
      }
      setShowModal(false)
      setSelected(null)
      setModalClosing(false)
    }, 300) // 200ms에서 300ms로 증가하여 더 부드러운 애니메이션
  }, [editMode, editImageFiles, revokeBlobUrls])

  const handleEdit = useCallback((post: LookBookPost) => {
    if (editMode) {
      setEditMode(false)
      return
    }
    setSelected(post)
    setEditForm({ title: post.title, content: post.content, files: [] })
    setEditExistingImages([...post.images].sort((a, b) => a.order - b.order))
    setEditImageFiles([])
    setDeletedImageIds([])
    setEditMode(true)
    setShowModal(true)
  }, [editMode])

  const handleDelete = useCallback(async (postId: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    setDeletingId(postId)
    
    // 삭제할 게시물의 이미지 Blob URL 해제
    const postToDelete = posts.find(post => post.id === postId)
    if (postToDelete) {
      // 게시물의 이미지들은 서버 URL이므로 Blob URL이 아님
      // 하지만 혹시 모르니 확인
      postToDelete.images.forEach(img => {
        if (img.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.imageUrl)
        }
      })
    }
    
    await fetch(`/api/lookbook?id=${postId}`, { method: 'DELETE' })
    setDeletingId(null)
    fetchPosts(1, true) // 첫 페이지부터 새로 로드
    if (selected?.id === postId) handleModalClose()
  }, [selected, handleModalClose, fetchPosts, posts])

  // 폼 핸들러들
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }, [])

  const handleEditInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm(f => ({ ...f, [name]: value }))
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    
    if (imageFiles.length + files.length > 30) {
      alert('최대 30개 이미지까지 업로드 가능합니다.')
      return
    }
    
    const maxSize = 30 * 1024 * 1024
    const oversizedFiles = files.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      alert(`다음 파일들이 너무 큽니다 (최대 30MB): ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }
    
    const newImageFiles: ImageFile[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      order: imageFiles.length + index,
      preview: URL.createObjectURL(file)
    }))
    setImageFiles([...imageFiles, ...newImageFiles])
    setForm(f => ({ ...f, files: [...f.files, ...files] }))
  }, [imageFiles])

  const handleEditFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const newImageFiles: ImageFile[] = files.map((file, index) => ({
      id: `edit-new-${Date.now()}-${index}`,
      file,
      order: editImageFiles.length + editExistingImages.length + index,
      preview: URL.createObjectURL(file)
    }))
    setEditImageFiles([...editImageFiles, ...newImageFiles])
    setEditForm(f => ({ ...f, files: [...f.files, ...files] }))
  }, [editImageFiles, editExistingImages])

  // 이미지 순서 관리
  const handleImageOrderChange = useCallback((id: string, newOrder: number) => {
    const updatedFiles = imageFiles.map(file => 
      file.id === id ? { ...file, order: newOrder } : file
    )
    updatedFiles.sort((a, b) => a.order - b.order)
    setImageFiles(updatedFiles)
  }, [imageFiles])

  const handleEditImageOrderChange = useCallback((id: string, newOrder: number) => {
    if (id.startsWith('edit-new-')) {
      const updatedFiles = editImageFiles.map(file => 
        file.id === id ? { ...file, order: newOrder } : file
      )
      updatedFiles.sort((a, b) => a.order - b.order)
      setEditImageFiles(updatedFiles)
    } else {
      const updatedImages = editExistingImages.map(img => 
        img.id === id ? { ...img, order: newOrder } : img
      )
      updatedImages.sort((a, b) => a.order - b.order)
      setEditExistingImages(updatedImages)
    }
  }, [editImageFiles, editExistingImages])

  // 이미지 제거
  const handleImageRemove = useCallback((id: string) => {
    const fileToRemove = imageFiles.find(file => file.id === id)
    if (fileToRemove) {
      // Blob URL 해제
      if (fileToRemove.preview && fileToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      
      const updatedFiles = imageFiles.filter(file => file.id !== id)
      const updatedFormFiles = form.files.filter((_, index) => 
        imageFiles.findIndex(f => f.id === id) !== index
      )
      setImageFiles(updatedFiles)
      setForm(f => ({ ...f, files: updatedFormFiles }))
    }
  }, [imageFiles, form.files])

  const handleEditImageRemove = useCallback((id: string) => {
    if (id.startsWith('edit-new-')) {
      const fileToRemove = editImageFiles.find(file => file.id === id)
      if (fileToRemove) {
        // Blob URL 해제
        if (fileToRemove.preview && fileToRemove.preview.startsWith('blob:')) {
          URL.revokeObjectURL(fileToRemove.preview)
        }
        
        const updatedFiles = editImageFiles.filter(file => file.id !== id)
        const updatedFormFiles = editForm.files.filter((_, index) => 
          editImageFiles.findIndex(f => f.id === id) !== index
        )
        setEditImageFiles(updatedFiles)
        setEditForm(f => ({ ...f, files: updatedFormFiles }))
      }
    } else {
      setEditExistingImages(prev => prev.filter(img => img.id !== id))
      setDeletedImageIds(prev => [...prev, id])
    }
  }, [editImageFiles, editForm.files])

  // 이미지 파일 변경
  const handleImageFilesChange = useCallback((newItems: ImageFile[]) => {
    setImageFiles(newItems)
  }, [])

  const handleEditImageFilesChange = useCallback((newItems: ImageFile[]) => {
    setEditImageFiles(newItems)
  }, [])

  const handleEditExistingImagesChange = useCallback((newItems: { id: string; imageUrl: string; fileName?: string; order: number }[]) => {
    const updatedImages = newItems.map(item => ({
      id: item.id,
      imageUrl: item.imageUrl,
      order: item.order
    }))
    setEditExistingImages(updatedImages)
  }, [])

  // 업로드/저장
  const handleUpload = useCallback(async () => {
    if (!form.title.trim() || !form.content.trim() || imageFiles.length === 0) return
    
    setUploading(true)
    
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('content', form.content)
      fd.append('uploader', 'admin')
      
      const sortedFiles = [...imageFiles].sort((a, b) => a.order - b.order)
      sortedFiles.forEach((imageFile, index) => {
        fd.append('files', imageFile.file)
        fd.append('imageOrders', index.toString())
      })
      
      const res = await fetch('/api/lookbook', { method: 'POST', body: fd })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '업로드 실패')
      }
      
      setTimeout(() => {
        // 기존 Blob URL 해제
        revokeBlobUrls(imageFiles)
        setForm({ title: '', content: '', files: [] })
        setImageFiles([])
        fetchPosts(1, true) // 첫 페이지부터 새로 로드
      }, 1000)
      
    } catch (error) {
      console.error('업로드 실패:', error)
      alert(error instanceof Error ? error.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }, [form, imageFiles, fetchPosts])

  const handleEditSave = useCallback(async () => {
    if (!selected) return
    
    setSaving(true)
    
    try {
      const fd = new FormData()
      fd.append('id', selected.id)
      fd.append('title', editForm.title)
      fd.append('content', editForm.content)
      
      if (deletedImageIds.length > 0) {
        deletedImageIds.forEach(imageId => {
          fd.append('removeImageIds', imageId)
        })
      }
      
      const reorderData = editExistingImages.map((img, index) => ({
        id: img.id,
        order: index
      }))
      fd.append('reorderImages', JSON.stringify(reorderData))
      
      const allImages = [...editExistingImages, ...editImageFiles].sort((a, b) => a.order - b.order)
      const newImages = allImages.filter(img => 'file' in img) as ImageFile[]
      newImages.forEach((imageFile, index) => {
        fd.append('files', imageFile.file)
        fd.append('imageOrders', imageFile.order.toString())
      })
      
      const res = await fetch('/api/lookbook', { method: 'PUT', body: fd })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '수정 실패')
      }
      
      setTimeout(() => {
        // 수정 모드 Blob URL 해제
        revokeBlobUrls(editImageFiles)
        setEditMode(false)
        setShowModal(false)
        setSelected(null)
        setDeletedImageIds([])
        setEditImageFiles([])
        fetchPosts(1, true) // 첫 페이지부터 새로 로드
      }, 1000)
      
    } catch (error) {
      console.error('수정 실패:', error)
      alert(error instanceof Error ? error.message : '수정 실패')
    } finally {
      setSaving(false)
    }
  }, [selected, editForm, deletedImageIds, editExistingImages, editImageFiles, fetchPosts])

  return {
    // 상태
    posts,
    selected,
    showModal,
    modalClosing,
    overlayVisible,
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
    deletedImageIds,
    
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
    handleEditSave,
    
    // 유틸리티
    fetchPosts
  }
}
