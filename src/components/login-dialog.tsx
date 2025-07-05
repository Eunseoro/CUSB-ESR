// 이 파일은 관리자 인증 다이얼로그 컴포넌트입니다.
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Shield } from 'lucide-react'
import { verifyAdminPassword, setAdminAuthenticated } from '@/lib/auth'

interface LoginDialogProps {
  children?: React.ReactNode
  onSuccess?: () => void
}

export function LoginDialog({ children, onSuccess }: LoginDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setAdminAuthenticated(true);
        setOpen(false);
        setPassword('');
        setError('');
        onSuccess?.();
      } else {
        setError(data.error || '당신은 유할매가 아닙니다.');
        setPassword('');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    window.location.reload(); // 인증 성공 시 전체 새로고침
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setPassword('');
      setError('');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            관리자 인증
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>유할매 인증</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="password">유할매만 접근할 수 있습니다</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="당신은 유할매입니까?"
              maxLength={32}
              disabled={loading}
            />
            {error && (
              <div className="text-red-600 text-sm mt-1">{error}</div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              인증
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 