"use client"

import { useEffect, useState, ChangeEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { BLOB_TOKEN } from "@/constants/blob";

interface LookBookImage {
  id: string;
  imageUrl: string;
  uploader: string;
}

export default function LookBookPage() {
  const [images, setImages] = useState<LookBookImage[]>([]);
  const [current, setCurrent] = useState(0);
  const { isAdmin } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // TODO: API 연동 (이미지 목록 불러오기)
    fetch("/api/lookbook")
      .then(res => res.json())
      .then(data => setImages(data));
  }, []);

  const handlePrev = () => setCurrent(c => (c > 0 ? c - 1 : c));
  const handleNext = () => setCurrent(c => (c < images.length - 1 ? c + 1 : c));

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Vercel Blob 업로드
    const formData = new FormData();
    formData.append('file', file);
    const blobRes = await fetch('https://blob.vercel-storage.com/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BLOB_TOKEN}`,
      },
      body: formData,
    });
    const blobData = await blobRes.json();
    if (!blobData.url) return alert('업로드 실패');
    // DB에 Blob URL 저장
    await fetch("/api/lookbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: blobData.url }),
    });
    location.reload();
  };

  const handleDelete = async () => {
    if (!images[current]) return;
    await fetch(`/api/lookbook?id=${images[current].id}`, { method: "DELETE" });
    location.reload();
  };

  return (
    <div className="flex flex-col items-center pt-8 w-full max-w-xl mx-auto min-h-[60vh]">
      <h1 className="text-2xl font-bold mb-4">LookBook</h1>
      {images.length > 0 ? (
        <div className="flex flex-col items-center w-full">
          <div className="flex justify-center w-full mb-2">
            <img src={images[current].imageUrl} alt="LookBook" className="max-h-96 rounded shadow" />
          </div>
          <div className="flex gap-2 mb-2 justify-center w-full">
            <Button onClick={handlePrev} disabled={current === 0}>{"<"}</Button>
            <Button onClick={handleNext} disabled={current === images.length - 1}>{">"}</Button>
          </div>
          {isAdmin && (
            <div className="flex gap-2 mt-2 justify-center w-full">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Button variant="outline" onClick={handleAddClick}>이미지 추가</Button>
              <Button variant="destructive" onClick={handleDelete}>이미지 삭제</Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div>이미지가 없습니다.</div>
          {isAdmin && (
            <div className="flex gap-2 mt-4 justify-center w-full">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Button variant="outline" onClick={handleAddClick}>이미지 추가</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 