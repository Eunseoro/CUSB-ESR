"use client"

import { useEffect, useState, ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
// 애니메이션 제거
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface LookBookPost {
  id: string;
  title: string;
  content: string;
  uploader: string;
  createdAt: string;
  updatedAt: string;
  images: { id: string; imageUrl: string }[];
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
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', files: [] as File[], removeImageIds: [] as string[] });
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setForm(f => ({ ...f, files: Array.from(e.target.files as FileList) }));
  }
  function handleInputChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleUpload() {
    if (!form.title.trim() || !form.content.trim() || form.files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('content', form.content);
    fd.append('uploader', 'admin'); // 실제 구현시 관리자 정보로 대체
    form.files.forEach(f => fd.append('files', f));
    const res = await fetch('/api/lookbook', { method: 'POST', body: fd });
    setUploading(false);
    if (!res.ok) return alert('업로드 실패');
    setForm({ title: '', content: '', files: [] });
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
    setEditForm({ title: post.title, content: post.content, files: [], removeImageIds: [] });
    setEditMode(true);
    setShowModal(true);
  }
  function handleEditInputChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  }
  function handleEditFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setEditForm(f => ({ ...f, files: Array.from(e.target.files as FileList) }));
  }
  function handleRemoveImage(id: string) {
    setEditForm(f => ({ ...f, removeImageIds: [...f.removeImageIds, id] }));
  }
  async function handleEditSave() {
    if (!selected) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('id', selected.id);
    fd.append('title', editForm.title);
    fd.append('content', editForm.content);
    editForm.files.forEach(f => fd.append('files', f));
    editForm.removeImageIds.forEach(id => fd.append('removeImageIds', id));
    const res = await fetch('/api/lookbook', { method: 'PUT', body: fd });
    setSaving(false);
    if (!res.ok) return alert('수정 실패');
    setEditMode(false);
    setShowModal(false);
    setSelected(null);
    fetchPosts();
  }

  return (
    <div className="flex flex-col items-center max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto min-h-[60vh] px-0">
      <h1 className="text-2xl font-bold mt-2 mb-2">유할매's OOTD</h1>
      <h2 className="flex flex-col text-sm items-center text-muted-foreground mb-3">
        <p>두 달이면 사라지는 유할매의 패션을 기록합니다.</p>
        <p>다시보기도 사라지고, 인스타도 업데이트를 안 해주니</p>
        <p>이렇게라도 올리면 내용이라도 직접 수정해주지 않을까요?</p>
        <p>📢 베타 테스트이므로, 예고 없이 사라질 수 있습니다 📢</p>
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
                {form.files.length === 0 ? '이미지를 업로드 해주세요' : `${form.files.length}장 선택됨`}
              </span>
            </div>
            <Button onClick={handleUpload} disabled={uploading || !form.title.trim() || !form.content.trim() || form.files.length === 0} style={{marginBottom: 0}}>
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
                <Button variant="outline" size="sm" onClick={e => {e.stopPropagation(); handleEditClick(post);}}>수정</Button>
                <Button variant="destructive" size="sm" onClick={e => {e.stopPropagation(); handleDelete(post.id);}} disabled={deletingId === post.id}>
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
             onClick={(e: React.MouseEvent) => e.stopPropagation()}
           >
            {/* 커스텀 스크롤바 스타일 */}
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
                <div className="flex flex-col gap-2 mb-4">
                  {selected.images.filter(img => !editForm.removeImageIds.includes(img.id)).map(img => (
                    <div key={img.id} className="relative group">
                      <img src={img.imageUrl} alt="이미지" className="w-full max-h-96 object-contain rounded" />
                      <button type="button" className="absolute top-2 right-2 bg-black/60 text-white rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition" onClick={() => handleRemoveImage(img.id)}>삭제</button>
                    </div>
                  ))}
                </div>
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
                    이미지 업로드
                  </Button>
                  <span className="text-xs text-muted-foreground ml-1">
                    {editForm.files.length === 0 ? '이미지를 업로드 해주세요' : `${editForm.files.length}장 선택됨`}
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