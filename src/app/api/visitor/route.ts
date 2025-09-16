// 방문자 집계 API: 방문 시 카운트 증가(POST), 관리자 인증 시 통계 반환(GET)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getKoreanTodayDate, getKoreanWeekStartDate, getKoreanMonthStartDate } from '@/lib/timezone'

// 관리자 인증 헤더
const ADMIN_HEADER = 'x-admin-auth'

// 방문 시: 오늘 카운트 upsert
export async function POST() {
  const today = getKoreanTodayDate()
  await prisma.visitorCount.upsert({
    where: { date: today },
    update: { count: { increment: 1 } },
    create: { date: today, count: 1 },
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
    const targetDate = new Date(specificDate)
    const count = await prisma.visitorCount.findUnique({ where: { date: targetDate } })
    return NextResponse.json({
      date: specificDate,
      count: count?.count || 0
    })
  }

  const today = getKoreanTodayDate()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekStart = getKoreanWeekStartDate()
  const monthStart = getKoreanMonthStartDate()

  // 오늘 방문자 수
  const todayCount = await prisma.visitorCount.findUnique({ where: { date: today } })
  // 어제 방문자 수
  const yesterdayCount = await prisma.visitorCount.findUnique({ where: { date: yesterday } })
  // 이번 주 방문자 수
  const weekCounts = await prisma.visitorCount.findMany({ where: { date: { gte: weekStart } } })
  const weekTotal = weekCounts.reduce((sum: number, v: { count: number }) => sum + v.count, 0)
  // 이번 달 방문자 수
  const monthCounts = await prisma.visitorCount.findMany({ where: { date: { gte: monthStart } } })
  const monthTotal = monthCounts.reduce((sum: number, v: { count: number }) => sum + v.count, 0)
  // 전체 방문자 수
  const allCounts = await prisma.visitorCount.findMany()
  const total = allCounts.reduce((sum: number, v: { count: number }) => sum + v.count, 0)
  // 평균(전체 일수 기준)
  const avg = allCounts.length > 0 ? Math.round(total / allCounts.length) : 0

  return NextResponse.json({
    today: todayCount?.count || 0,
    yesterday: yesterdayCount?.count || 0,
    week: weekTotal,
    month: monthTotal,
    total,
    avg,
  })
} 