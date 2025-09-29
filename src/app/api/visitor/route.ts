// 방문자 집계 API: 방문 시 카운트 증가(POST), 관리자 인증 시 통계 반환(GET)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 방문 시: 오늘 카운트 upsert (단순한 날짜 기준)
export async function POST() {
  // 오늘 날짜를 00시 00분으로 설정 (단순화)
  const today = new Date()
  const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
  
  console.log('방문자 카운트:', { targetDate: targetDate.toISOString() })
  
  await prisma.visitorCount.upsert({
    where: { date: targetDate },
    update: { count: { increment: 1 } },
    create: { date: targetDate, count: 1 },
  })
  return NextResponse.json({ ok: true })
}

// 관리자 인증 시: 통계 반환
export async function GET(req: NextRequest) {
  // 쿠키 기반 인증 확인 (다른 API들과 일관성 유지)
  const cookie = req.cookies.get('admin_session');
  const isAdmin = cookie && cookie.value === 'admin';
  
  if (!isAdmin) {
    // 인증이 없으면 기본값 반환
    return NextResponse.json({
      today: 0,
      yesterday: 0,
      week: 0,
      month: 0,
      total: 0,
      avg: 0,
      public: true
    })
  }

  const { searchParams } = new URL(req.url)
  const specificDate = searchParams.get('date')
  
  // 특정 날짜 조회 요청인 경우
  if (specificDate) {
    // 해당 날짜의 모든 행을 조회하여 합계 계산
    const startDate = new Date(specificDate + 'T00:00:00.000Z')
    const endDate = new Date(specificDate + 'T23:59:59.999Z')
    
    console.log('조회 요청:', { specificDate, startDate: startDate.toISOString(), endDate: endDate.toISOString() })
    
    const counts = await prisma.visitorCount.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })
    
    const totalCount = counts.reduce((sum, record) => sum + record.count, 0)
    
    console.log('조회 결과:', { 
      foundRecords: counts.length, 
      totalCount,
      records: counts.map(r => ({ date: r.date.toISOString(), count: r.count }))
    })
    
    return NextResponse.json({
      date: specificDate,
      count: totalCount
    })
  }

  // 단순한 날짜 기준 통계 조회
  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0)
  
  // 이번 주 시작 (일요일)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekStartDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0, 0)
  
  // 이번 달 시작
  const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0)

  // 오늘 방문자 수 (해당 날짜의 모든 행 합계)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
  const todayCounts = await prisma.visitorCount.findMany({
    where: {
      date: {
        gte: todayStart,
        lte: todayEnd
      }
    }
  })
  const todayTotal = todayCounts.reduce((sum, record) => sum + record.count, 0)
  
  // 어제 방문자 수 (해당 날짜의 모든 행 합계)
  const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
  const yesterdayCounts = await prisma.visitorCount.findMany({
    where: {
      date: {
        gte: yesterdayStart,
        lte: yesterdayEnd
      }
    }
  })
  const yesterdayTotal = yesterdayCounts.reduce((sum, record) => sum + record.count, 0)
  
  // 이번 주 방문자 수
  const weekCounts = await prisma.visitorCount.findMany({ where: { date: { gte: weekStartDate } } })
  const weekTotal = weekCounts.reduce((sum: number, v: { count: number }) => sum + v.count, 0)
  
  // 이번 달 방문자 수
  const monthCounts = await prisma.visitorCount.findMany({ where: { date: { gte: monthStartDate } } })
  const monthTotal = monthCounts.reduce((sum: number, v: { count: number }) => sum + v.count, 0)
  
  // 전체 방문자 수
  const allCounts = await prisma.visitorCount.findMany()
  const total = allCounts.reduce((sum: number, v: { count: number }) => sum + v.count, 0)
  
  // 평균(전체 일수 기준)
  const avg = allCounts.length > 0 ? Math.round(total / allCounts.length) : 0

  return NextResponse.json({
    today: todayTotal,
    yesterday: yesterdayTotal,
    week: weekTotal,
    month: monthTotal,
    total,
    avg,
  })
} 