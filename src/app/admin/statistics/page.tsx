"use client"
// 방문자 통계 관리자 페이지: 인증된 관리자만 접근 가능, 미인증 시 안내
import { useEffect, useState, Suspense } from 'react'
import { CalendarDays, BarChart2, Users, Hash, Divide, Shield } from 'lucide-react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 통계 데이터 타입
interface VisitorStats {
  today: number
  week: number
  month: number
  total: number
  avg: number
}

function VisitorStatisticsContent() {
  // 통계 데이터
  const [stats, setStats] = useState<VisitorStats | null>(null)
  // 로딩 상태
  const [loading, setLoading] = useState(true)
  // 에러 메시지
  const [error, setError] = useState('')
  // 기간 텍스트(클라이언트에서만 계산)
  const [periods, setPeriods] = useState({ today: '', week: '', month: '' })
  
  // 관리자 인증 상태
  const { isAdmin } = useAdminAuth()

  useEffect(() => {
    // 관리자 인증된 경우에만 통계 데이터 요청
    if (isAdmin) {
      fetch('/api/visitor', {
        method: 'GET',
        credentials: 'include',
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.error) setError(data.error)
          else if (data) setStats(data)
        })
        .catch(() => setError('통계 데이터를 불러오지 못했습니다.'))
        .finally(() => setLoading(false))
    } else {
      // 인증되지 않은 경우 로딩 상태 해제
      setLoading(false)
    }
  }, [isAdmin])

  // 날짜 기반 기간 텍스트는 클라이언트에서만 계산 (한국 시간대 기준)
  useEffect(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    function formatDate(date: Date) {
      return date.toLocaleDateString('ko-KR', { 
        timeZone: 'Asia/Seoul',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\. /g, '.').replace(/\.$/, '')
    }
    setPeriods({
      today: formatDate(today),
      week: `${formatDate(weekStart)} ~ ${formatDate(today)}`,
      month: `${formatDate(monthStart)} ~ ${formatDate(today)}`
    })
  }, [])

  if (loading) return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    </div>
  )
  if (!isAdmin) return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-muted-foreground" />
            유할매 전용 구역
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          해당 페이지는 유할매만 접근할 수 있습니다.
        </CardContent>
      </Card>
    </div>
  )
  if (error) return <div>에러: {error}</div>

  // 카드형 통계 항목 배열 (기간 추가)
  const statCards = [
    { icon: <CalendarDays className="w-7 h-7 text-blue-500" />, label: '오늘', value: stats?.today ?? '비공개', period: periods.today },
    { icon: <BarChart2 className="w-7 h-7 text-green-500" />, label: '이번 주', value: stats?.week ?? '비공개', period: periods.week },
    { icon: <Users className="w-7 h-7 text-orange-500" />, label: '이번 달', value: stats?.month ?? '비공개', period: periods.month },
    { icon: <Hash className="w-7 h-7 text-purple-500" />, label: '전체', value: stats?.total ?? '비공개', period: '누적' },
    { icon: <Divide className="w-7 h-7 text-gray-500" />, label: '일평균', value: stats?.avg ?? '비공개', period: '누적' },
  ]

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="font-bold text-2xl mb-6 text-center">방문자 통계</h2>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-xl shadow p-6 min-h-[120px]">
            {card.icon}
            <div className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-200">{card.label}</div>
            <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{card.value}</div>
            <div className="mt-1 text-xs text-gray-400">{card.period}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function VisitorStatisticsPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <VisitorStatisticsContent />
    </Suspense>
  )
} 