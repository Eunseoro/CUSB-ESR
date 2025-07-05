"use client"
// 이 파일은 이용안내 페이지 안내문 아래에 표시되는 공지사항 박스 컴포넌트입니다. 불필요한 상태, dead code, 중복/비효율 useEffect, 메모리 누수 위험이 있는 부분을 정리합니다.
import React, { useEffect, useState } from 'react'
import { Notice } from '@/types/notice'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { fetchNotice, updateNotice, toggleNotice } from '@/lib/notice-api'
import { usePathname } from 'next/navigation'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

export default function NoticeBox() {
  const pathname = usePathname();
  const { isAdmin } = useAdminAuth();
  const [notice, setNotice] = useState<Notice | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    fetchNotice().then(setNotice)
  }, [pathname])

  useEffect(() => {
    if (notice) setContent(notice.content)
  }, [notice])

  useEffect(() => {
    if (notice && content !== notice.content) setSaved(false)
    else setSaved(true)
  }, [content, notice])

  if (!notice || (!notice.isVisible && !isAdmin)) return null

  const handleSave = async () => {
    setLoading(true)
    await updateNotice(content)
    const updated = await fetchNotice()
    setNotice(updated)
    setLoading(false)
    setSaved(true)
  }

  const handleSwitch = async (checked: boolean) => {
    setLoading(true)
    await toggleNotice(checked)
    const updated = await fetchNotice()
    setNotice(updated)
    setLoading(false)
  }

  return (
    <Card className="relative notice-sparkle">
      {isAdmin && (
        <div className="absolute top-4 right-6 flex items-center gap-2 z-10">
          <span className="text-xs font-semibold select-none">ON/OFF</span>
          <Switch checked={notice.isVisible} onCheckedChange={handleSwitch} />
        </div>
      )}
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-0 pt-0 my-[-10px]">
          <span className="text-xl font-bold text-yellow-300 select-none">👑 공주님의 ✨명령✨</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAdmin ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="border rounded p-2 text-sm min-h-[120px] bg-white dark:bg-[#171717]"
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <Button onClick={handleSave} disabled={loading || saved}>
                {saved ? '저장됨' : '저장'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-base whitespace-pre-line min-h-[24px]">{notice.content || '* 공지사항이 없습니다'}</div>
        )}
      </CardContent>
    </Card>
  )
} 