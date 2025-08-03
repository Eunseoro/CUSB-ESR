'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Music, Trash2 } from 'lucide-react'
import { uploadMRFile, deleteMRFile, checkMRFileExists } from '@/lib/mr-api'
import { Song } from '@/types/song'

interface MRUploadDialogProps {
  song: Song
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadSuccess?: () => void
}

export function MRUploadDialog({ song, open, onOpenChange, onUploadSuccess }: MRUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasMRFile, setHasMRFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  // MR 파일 존재 여부 확인
  const checkMRExists = async () => {
    setIsChecking(true)
    try {
      const exists = await checkMRFileExists(song.id)
      setHasMRFile(exists)
    } catch (error) {
      console.error('MR 파일 확인 실패:', error)
      setHasMRFile(false)
    } finally {
      setIsChecking(false)
    }
  }

  // 다이얼로그 열릴 때 MR 파일 존재 여부 확인
  useEffect(() => {
    if (open) {
      checkMRExists()
    }
  }, [open, song.id])

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('audio/')) {
      alert('오디오 파일만 업로드 가능합니다.')
      e.target.value = '' // 파일 선택 초기화
      return
    }
    
    // 파일 크기 검증 (50MB)
    if (file.size > 52428800) {
      alert('파일 크기가 50MB를 초과합니다.')
      e.target.value = ''
      return
    }
    
    setSelectedFile(file)
  }

  // 파일 업로드
  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const result = await uploadMRFile(song.id, selectedFile)
      if (result.success) {
        setSelectedFile(null)
        await checkMRExists()
        if (onUploadSuccess) onUploadSuccess()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('업로드 오류:', error)
    } finally {
      setIsUploading(false)
    }
  }

  // MR 파일 삭제
  const handleDelete = async () => {
    if (!window.confirm('MR 파일을 삭제하시겠습니까?')) return

    setIsDeleting(true)
    try {
      const result = await deleteMRFile(song.id)
      
      if (result.success) {
        // 상태 업데이트
        setHasMRFile(false)
        setSelectedFile(null)
        
        // 부모 컴포넌트에 알림 (refreshTrigger 업데이트)
        if (onUploadSuccess) onUploadSuccess()
        
        // 상태 재확인
        await checkMRExists()
        
        console.log('MR 파일 삭제 완료')
      } else {
        console.error('삭제 실패:', result.error)
      }
    } catch (error) {
      console.error('삭제 오류:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            MR 관리
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">

          {/* 현재 MR 파일 상태 */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-2">현재 곡은</p>
                {isChecking ? (
                  <p className="text-sm text-muted-foreground">확인 중...</p>
                ) : (
                  <p className="text-sm">
                    {hasMRFile ? 'MR이 등록되어 있습니다.' : 'MR이 등록되지 않았습니다.'}
                  </p>
                )}
              </div>
              {hasMRFile && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>
          </div>

          {/* 파일 업로드 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('mr-file-input')?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 선택
              </Button>
              <input
                id="mr-file-input"
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                size="sm"
              >
                {isUploading ? '업로드 중...' : '업로드'}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                선택된 파일: {selectedFile.name}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 