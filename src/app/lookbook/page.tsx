"use client"

import { useEffect, useState, ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
// 애니메이션 제거
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SortableImageList } from '@/components/SortableImageList';

interface LookBookPost {
  id: string;
  title: string;
  content: string;
  uploader: string;
  createdAt: string;
  updatedAt: string;
  images: { id: string; imageUrl: string; order: number }[];
}

interface ImageFile {
  id: string;
  file: File;
  order: number;
  preview?: string;
}

export default function LookBookPage() {
  const [posts, setPosts] = useState<LookBookPost[]>([]);
  const [selected, setSelected] = useState<LookBookPost | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { isAdmin } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', files: [] as File[] });
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', files: [] as File[] });
  const [editImageFiles, setEditImageFiles] = useState<ImageFile[]>([]);
  const [editExistingImages, setEditExistingImages] = useState<{ id: string; imageUrl: string; order: number }[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]); // 삭제된 이미지 ID 추적
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 모달 오픈 시 body 스크롤 방지
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const res = await fetch("/api/lookbook");
    const data = await res.json();
    setPosts(data);
  }

  function handleCardClick(post: LookBookPost) {
    setAnimatingCardId(post.id);
    setOverlayVisible(true);
    setSelected(post);
    setShowModal(true);
    setAnimatingCardId(null);
  }
  function handleModalClose() {
    setOverlayVisible(false);
    setModalClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setSelected(null);
      setModalClosing(false);
    }, 200); // 팝업 닫힘 애니메이션 시간과 맞춤
  }

  function handleModalClick(e: React.MouseEvent) {
    // 수정 모드에서는 모달 클릭으로 닫히지 않도록 함
    if (editMode) {
      e.stopPropagation();
      return;
    }
    // 모달 내부 어디든 클릭하면 닫기 (좌클릭, 우클릭 모두)
    e.stopPropagation();
    handleModalClose();
  }

  function handleModalContextMenu(e: React.MouseEvent) {
    // 수정 모드에서는 우클릭으로도 닫히지 않도록 함
    if (editMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 우클릭 메뉴 방지 및 모달 닫기
    e.preventDefault();
    e.stopPropagation();
    handleModalClose();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newImageFiles: ImageFile[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      order: imageFiles.length + index,
      preview: URL.createObjectURL(file)
    }));
    setImageFiles([...imageFiles, ...newImageFiles]);
    setForm(f => ({ ...f, files: [...f.files, ...files] }));
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleImageOrderChange(id: string, newOrder: number) {
    const updatedFiles = imageFiles.map(file => 
      file.id === id ? { ...file, order: newOrder } : file
    );
    updatedFiles.sort((a, b) => a.order - b.order);
    setImageFiles(updatedFiles);
  }

  function handleImageRemove(id: string) {
    const fileToRemove = imageFiles.find(file => file.id === id);
    if (fileToRemove) {
      const updatedFiles = imageFiles.filter(file => file.id !== id);
      const updatedFormFiles = form.files.filter((_, index) => 
        imageFiles.findIndex(f => f.id === id) !== index
      );
      setImageFiles(updatedFiles);
      setForm(f => ({ ...f, files: updatedFormFiles }));
    }
  }

  function handleImageFilesChange(newItems: { id: string; imageUrl: string; fileName?: string; order: number }[]) {
    const updatedFiles = newItems.map(item => {
      const originalFile = imageFiles.find(f => f.id === item.id);
      return {
        ...originalFile!,
        order: item.order
      };
    });
    setImageFiles(updatedFiles);
  }

  async function handleUpload() {
    if (!form.title.trim() || !form.content.trim() || imageFiles.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('content', form.content);
    fd.append('uploader', 'admin'); // 실제 구현시 관리자 정보로 대체
    
    // 정렬된 순서대로 파일과 순서 정보 추가
    const sortedFiles = [...imageFiles].sort((a, b) => a.order - b.order);
    sortedFiles.forEach((imageFile, index) => {
      fd.append('files', imageFile.file);
      fd.append('imageOrders', index.toString());
    });
    
    const res = await fetch('/api/lookbook', { method: 'POST', body: fd });
    setUploading(false);
    if (!res.ok) return alert('업로드 실패');
    setForm({ title: '', content: '', files: [] });
    setImageFiles([]);
    fetchPosts();
  }

  async function handleDelete(postId: string) {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    setDeletingId(postId);
    await fetch(`/api/lookbook?id=${postId}`, { method: 'DELETE' });
    setDeletingId(null);
    fetchPosts();
    if (selected?.id === postId) handleModalClose();
  }

  function handleEditClick(post: LookBookPost) {
    setSelected(post);
    setEditForm({ title: post.title, content: post.content, files: [] });
    setEditExistingImages([...post.images].sort((a, b) => a.order - b.order));
    setEditImageFiles([]);
    setDeletedImageIds([]); // 삭제된 이미지 목록 초기화
    setEditMode(true);
    setShowModal(true);
  }

  function handleEditInputChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  }

  function handleEditFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newImageFiles: ImageFile[] = files.map((file, index) => ({
      id: `edit-new-${Date.now()}-${index}`,
      file,
      order: editImageFiles.length + editExistingImages.length + index,
      preview: URL.createObjectURL(file)
    }));
    setEditImageFiles([...editImageFiles, ...newImageFiles]);
    setEditForm(f => ({ ...f, files: [...f.files, ...files] }));
  }

  function handleEditImageOrderChange(id: string, newOrder: number) {
    if (id.startsWith('edit-new-')) {
      // 새 이미지 순서 변경
      const updatedFiles = editImageFiles.map(file => 
        file.id === id ? { ...file, order: newOrder } : file
      );
      updatedFiles.sort((a, b) => a.order - b.order);
      setEditImageFiles(updatedFiles);
    } else {
      // 기존 이미지 순서 변경
      const updatedImages = editExistingImages.map(img => 
        img.id === id ? { ...img, order: newOrder } : img
      );
      updatedImages.sort((a, b) => a.order - b.order);
      setEditExistingImages(updatedImages);
    }
  }

  function handleEditImageRemove(id: string) {
    if (id.startsWith('edit-new-')) {
      // 새 이미지 삭제
      const fileToRemove = editImageFiles.find(file => file.id === id);
      if (fileToRemove) {
        const updatedFiles = editImageFiles.filter(file => file.id !== id);
        const updatedFormFiles = editForm.files.filter((_, index) => 
          editImageFiles.findIndex(f => f.id === id) !== index
        );
        setEditImageFiles(updatedFiles);
        setEditForm(f => ({ ...f, files: updatedFormFiles }));
      }
    } else {
      // 기존 이미지 삭제 - 삭제된 이미지 ID 추적
      setEditExistingImages(prev => prev.filter(img => img.id !== id));
      setDeletedImageIds(prev => [...prev, id]); // 삭제된 이미지 ID 추가
    }
  }

  function handleEditImageFilesChange(newItems: { id: string; imageUrl: string; fileName?: string; order: number }[]) {
    const updatedFiles = newItems.map(item => {
      const originalFile = editImageFiles.find(f => f.id === item.id);
      return {
        ...originalFile!,
        order: item.order
      };
    });
    setEditImageFiles(updatedFiles);
  }

  function handleEditExistingImagesChange(newItems: { id: string; imageUrl: string; fileName?: string; order: number }[]) {
    const updatedImages = newItems.map(item => ({
      id: item.id,
      imageUrl: item.imageUrl,
      order: item.order
    }));
    setEditExistingImages(updatedImages);
  }

  async function handleEditSave() {
    if (!selected) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('id', selected.id);
    fd.append('title', editForm.title);
    fd.append('content', editForm.content);
    
    // 삭제된 이미지 ID 추가
    if (deletedImageIds.length > 0) {
      deletedImageIds.forEach(imageId => {
        fd.append('removeImageIds', imageId);
      });
    }
    
    // 기존 이미지 순서 변경 정보 추가
    const reorderData = editExistingImages.map((img, index) => ({
      id: img.id,
      order: index
    }));
    fd.append('reorderImages', JSON.stringify(reorderData));
    
    // 새 이미지 추가
    const allImages = [...editExistingImages, ...editImageFiles].sort((a, b) => a.order - b.order);
    const newImages = allImages.filter(img => 'file' in img) as ImageFile[];
    newImages.forEach((imageFile, index) => {
      fd.append('files', imageFile.file);
      fd.append('imageOrders', imageFile.order.toString());
    });
    
    const res = await fetch('/api/lookbook', { method: 'PUT', body: fd });
    setSaving(false);
    if (!res.ok) return alert('수정 실패');
    setEditMode(false);
    setShowModal(false);
    setSelected(null);
    setDeletedImageIds([]); // 삭제된 이미지 목록 초기화
    fetchPosts();
  }

  async function handleImageDeleteFromPreview(imageId: string) {
    if (!selected) return;
    
    try {
      // API를 통해 이미지 삭제
      const fd = new FormData();
      fd.append('id', selected.id);
      fd.append('removeImageIds', imageId);
      
      const res = await fetch('/api/lookbook', { method: 'PUT', body: fd });
      if (!res.ok) {
        alert('이미지 삭제에 실패했습니다.');
        return;
      }
      
      // 로컬 상태 업데이트
      const updatedImages = selected.images.filter(image => image.id !== imageId);
      setSelected({ ...selected, images: updatedImages });
      
      // 게시물 목록 새로고침
      fetchPosts();
    } catch (error) {
      alert('이미지 삭제 중 오류가 발생했습니다.');
    }
  }

  return (
    <div className="flex flex-col items-center max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto min-h-[60vh] px-0 pb-20">
      <h1 className="text-2xl font-bold mt-2 mb-2">유할매's OOTD</h1>
      <h2 className="flex flex-col text-sm items-center text-muted-foreground mb-3">
        <p>매일의 방송 요약과 패션을 기록합니다.</p>
        <p>팬카페에 올려주시는 이미지를 참고하여 선정합니다.</p>
      </h2>
      {isAdmin && (
        <Card className="mb-3 w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto rounded-2xl">
          <CardContent className="flex flex-col gap-2 pt-0 pb-0 px-4">
            <input
              className="border rounded px-2 py-1 text-sm bg-background text-foreground dark:bg-neutral-800 dark:text-white"
              name="title"
              placeholder="제목"
              value={form.title}
              onChange={handleInputChange}
              maxLength={40}
              style={{marginTop: 0, marginBottom: 0}}
            />
            <textarea
              className="border rounded px-2 py-1 text-sm min-h-[60px] bg-background text-foreground dark:bg-neutral-800 dark:text-white"
              name="content"
              placeholder="내용"
              value={form.content}
              onChange={handleInputChange}
              maxLength={300}
              style={{marginTop: 0, marginBottom: 0}}
            />
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <Button type="button" variant="outline" size="sm" style={{paddingLeft: '10px', paddingRight: '10px'}} onClick={() => { fileInputRef.current && fileInputRef.current.click(); }}>
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
                  onItemsChange={handleImageFilesChange}
                  onOrderChange={handleImageOrderChange}
                  onRemove={handleImageRemove}
                />
              </div>
            )}
            
            <Button onClick={handleUpload} disabled={uploading || !form.title.trim() || !form.content.trim() || imageFiles.length === 0} style={{marginBottom: 0}}>
              {uploading ? '게시 중...' : '게시'}
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col gap-2 w-full">
        {posts.length === 0 && <div className="text-center text-muted-foreground py-8">로딩 중...</div>}
        {posts.map(post => (
          <div
            key={post.id}
            className="bg-card rounded-xl shadow p-4 flex gap-4 items-center cursor-pointer hover:shadow-lg transition-colors border border-border dark:bg-neutral-900 dark:border-neutral-800 min-w-0 overflow-hidden"
            onClick={() => handleCardClick(post)}
          >
            <img
              src={post.images[0]?.imageUrl || '/noimg.png'}
              className="w-20 h-20 object-cover rounded-lg mr-2 border border-border dark:border-neutral-700"
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate text-base mb-1 text-foreground dark:text-white">{post.title}</div>
              <div className="text-sm text-muted-foreground truncate dark:text-gray-300">{post.content}</div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={(e: React.MouseEvent) => {e.stopPropagation(); handleEditClick(post);}}>수정</Button>
                <Button variant="destructive" size="sm" onClick={(e: React.MouseEvent) => {e.stopPropagation(); handleDelete(post.id);}} disabled={deletingId === post.id}>
                  {deletingId === post.id ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      { (showModal || overlayVisible) && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200 ${overlayVisible ? 'bg-black/40' : 'bg-black/0'}`}
          onClick={showModal ? handleModalClose : undefined}
        >
          {/* 팝업 애니메이션 스타일 */}
          <style>{`
            .modal-pop {
              animation: popIn 0.2s cubic-bezier(0.4,0,0,1);
            }
            .modal-pop-close {
              animation: popOut 0.2s cubic-bezier(0.4,0,0,1);
            }
            @keyframes popIn {
              0% {
                opacity: 0;
                transform: scale(0.9);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
            @keyframes popOut {
              0% {
                opacity: 1;
                transform: scale(1);
              }
              100% {
                opacity: 0;
                transform: scale(0.9);
              }
            }
          `}</style>
         {showModal && selected && (
           <div
             className={"bg-card rounded-2xl shadow w-full max-w-md sm:max-w-lg lg:max-w-3xl mx-4 sm:mx-6 relative border border-border dark:bg-neutral-900 dark:border-neutral-800 p-4 sm:p-6 " + (modalClosing ? 'modal-pop-close' : 'modal-pop') + " scrollbar-custom"}
             style={{ maxHeight: '90vh', overflowY: 'auto' }}
             onClick={handleModalClick}
             onContextMenu={handleModalContextMenu}
           >
            {/* 커스텀 스크롤바 스타일 */}
            {editMode ? (
              <>
                <input
                  className="border rounded px-2 py-1 text-lg font-bold w-full mb-2 bg-background text-foreground dark:bg-neutral-800 dark:text-white"
                  name="title"
                  value={editForm.title}
                  onChange={handleEditInputChange}
                  maxLength={40}
                />
                <textarea
                  className="border rounded px-2 py-1 text-base w-full mb-4 bg-background text-foreground dark:bg-neutral-800 dark:text-white"
                  name="content"
                  value={editForm.content}
                  onChange={handleEditInputChange}
                  maxLength={300}
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
                      onItemsChange={handleEditExistingImagesChange}
                      onOrderChange={handleEditImageOrderChange}
                      onRemove={handleEditImageRemove}
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
                      onItemsChange={handleEditImageFilesChange}
                      onOrderChange={handleEditImageOrderChange}
                      onRemove={handleEditImageRemove}
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleEditFileChange}
                    ref={editFileInputRef}
                  />
                  <Button type="button" variant="outline" onClick={() => { editFileInputRef.current && editFileInputRef.current.click(); }}>
                    이미지 추가
                  </Button>
                  <span className="text-xs text-muted-foreground ml-1">
                    {editImageFiles.length === 0 ? '새 이미지를 추가하세요' : `${editImageFiles.length}장 추가됨`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEditSave} className="flex-1" disabled={saving}>
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)} className="flex-1">취소</Button>
                </div>
              </>
            ) : (
              <>
                <div className="font-bold text-2xl mb-3 text-foreground dark:text-white">{selected.title}</div>
                <div className="mb-4 text-gray-700 whitespace-pre-line dark:text-gray-300">{selected.content}</div>
                <div className="flex flex-col gap-0 mb-4">
                  {selected.images.map(img => (
                    <img key={img.id} src={img.imageUrl} className="w-full max-h-96 object-contain rounded" />
                  ))}
                </div>
                <Button onClick={handleModalClose} className="w-full">닫기</Button>
              </>
            )}
          </div>
         )}
        </div>
      )}
    </div>
  );
} 