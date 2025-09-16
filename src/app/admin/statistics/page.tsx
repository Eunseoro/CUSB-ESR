"use client"
// 방문자 통계 관리자 페이지: 인증된 관리자만 접근 가능, 미인증 시 안내
import { useEffect, useState, Suspense } from 'react'
import { CalendarDays, BarChart2, Users, Hash, Divide, Shield, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollaborationMemo } from '@/components/collaboration-memo'
import { Calendar } from '@/components/calendar'

// 통계 데이터 타입
interface VisitorStats {
  today: number
  yesterday: number
  week: number
  month: number
  total: number
  avg: number
}

// 특정 날짜 조회 결과 타입
interface DateQueryResult {
  date: string
  count: number
}

function VisitorStatisticsContent() {
  // 통계 데이터
  const [stats, setStats] = useState<VisitorStats | null>(null)
  // 로딩 상태
  const [loading, setLoading] = useState(true)
  // 에러 메시지
  const [error, setError] = useState('')
  // 기간 텍스트(클라이언트에서만 계산)
  const [periods, setPeriods] = useState({ today: '', yesterday: '', week: '', month: '' })
  // 날짜별 조회 관련 상태
  const [selectedDate, setSelectedDate] = useState('')
  const [dateQueryResult, setDateQueryResult] = useState<DateQueryResult | null>(null)
  const [dateQueryLoading, setDateQueryLoading] = useState(false)
  
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

  // 날짜 기반 기간 텍스트는 클라이언트에서만 계산 (한국 시간대 기준, 15시 기준)
  useEffect(() => {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
    const hour = now.getHours()
    
    // 15시 기준으로 오늘/어제 계산
    let today, yesterday
    if (hour < 15) {
      // 15시 이전이면 전날이 오늘, 그 전날이 어제
      today = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
    } else {
      // 15시 이후면 당일이 오늘, 전날이 어제
      today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    }
    
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    
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
      yesterday: formatDate(yesterday),
      week: `${formatDate(weekStart)} ~ ${formatDate(today)}`,
      month: `${formatDate(monthStart)} ~ ${formatDate(today)}`
    })
    
    // 오늘 날짜를 자동으로 선택하고 조회
    const todayString = today.toISOString().split('T')[0]
    setSelectedDate(todayString)
    handleDateQuery(todayString)
  }, [])

  // 특정 날짜 조회 함수
  const handleDateQuery = async (date: string) => {
    if (!date) return
    
    setDateQueryLoading(true)
    try {
      const response = await fetch(`/api/visitor?date=${date}`, {
        method: 'GET',
        credentials: 'include',
      })
      const data = await response.json()
      if (data && data.error) {
        setError(data.error)
      } else {
        setDateQueryResult(data)
      }
    } catch {
      setError('날짜별 조회에 실패했습니다.')
    } finally {
      setDateQueryLoading(false)
    }
  }

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
            관리자 전용 구역
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          로그인 후 사용할 수 있습니다.
        </CardContent>
      </Card>
    </div>
  )
  if (error) return <div>에러: {error}</div>

  // 카드형 통계 항목 배열 (기간 추가)
  const statCards = [
    { icon: <CalendarDays className="w-7 h-7 text-blue-500" />, label: '오늘', value: stats?.today ?? '비공개', period: periods.today },
    { icon: <Clock className="w-7 h-7 text-indigo-500" />, label: '어제', value: stats?.yesterday ?? '비공개', period: periods.yesterday },
    { icon: <BarChart2 className="w-7 h-7 text-green-500" />, label: '이번 주', value: stats?.week ?? '비공개', period: periods.week },
    { icon: <Users className="w-7 h-7 text-orange-500" />, label: '이번 달', value: stats?.month ?? '비공개', period: periods.month },
    { icon: <Hash className="w-7 h-7 text-purple-500" />, label: '전체', value: stats?.total ?? '비공개', period: '누적' },
    { icon: <Divide className="w-7 h-7 text-gray-500" />, label: '일평균', value: stats?.avg ?? '비공개', period: '누적' },
  ]

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <h2 className="font-bold text-2xl mb-6 text-center">방문자 통계</h2>
      
      {/* 기본 통계 카드들 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-xl shadow p-4 min-h-[120px]">
            {card.icon}
            <div className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{card.label}</div>
            <div className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">{card.value}</div>
            <div className="mt-1 text-xs text-gray-400 text-center">{card.period}</div>
          </div>
        ))}
      </div>

      {/* 날짜별 조회 섹션 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            날짜별 조회
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* 달력 UI */}
            <div className="flex-1">
              <div className="w-full max-w-sm mx-auto">
                <Calendar 
                  selectedDate={selectedDate}
                  onDateSelect={(date: string) => {
                    setSelectedDate(date)
                    handleDateQuery(date)
                  }}
                />
              </div>
            </div>
            
            {/* 조회 결과 표시 */}
            <div className="flex-1">
              {dateQueryLoading ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-lg text-center">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-muted-foreground">조회 중...</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      {dateQueryResult ? new Date(dateQueryResult.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      }) : '오늘'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {dateQueryResult?.count || 0}명
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 협업 메모 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>협업 메모</CardTitle>
        </CardHeader>
        <CardContent>
          <CollaborationMemo />
        </CardContent>
      </Card>
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