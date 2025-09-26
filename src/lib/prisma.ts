// Prisma 클라이언트를 생성 및 export합니다.
import { PrismaClient } from '@prisma/client'

// 한국 시간대 설정
const KOREA_TIMEZONE = 'Asia/Seoul'

// 한국 시간대 설정 함수
function setKoreaTimezone() {
  try {
    // Intl.DateTimeFormat을 사용한 시간대 검증
    const now = new Date()
    const koreaTime = new Intl.DateTimeFormat('ko-KR', {
      timeZone: KOREA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now)
    
    console.log(`한국 시간대 설정 완료: ${koreaTime}`)
  } catch (error) {
    console.warn('시간대 설정 중 오류 발생:', error)
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 개발 환경에서만 전역 인스턴스 유지 (Hot Reload 대응)
let prisma: PrismaClient

// 한국 시간대 설정 (초기화 시)
setKoreaTimezone()

if (process.env.NODE_ENV === 'production') {
  // 프로덕션: 매번 새 인스턴스 생성 (한국 시간대 설정)
  prisma = new PrismaClient({
    log: ['error'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
} else {
  // 개발: 전역 인스턴스 재사용 (한국 시간대 설정)
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ['error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  }
  prisma = globalForPrisma.prisma
}

// 단순한 연결 관리
let lastUsed = Date.now()
let disconnectTimer: NodeJS.Timeout | null = null

// 5분 후 자동 연결 해제
const DISCONNECT_DELAY = 5 * 60 * 1000 // 5분

function scheduleDisconnect() {
  // 기존 타이머 클리어
  if (disconnectTimer) {
    clearTimeout(disconnectTimer)
  }
  
  // 새 타이머 설정
  disconnectTimer = setTimeout(async () => {
    try {
      await prisma.$disconnect()
      console.log('5분 비활성으로 인한 데이터베이스 연결 해제')
    } catch (error) {
      console.error('자동 연결 해제 실패:', error)
    }
  }, DISCONNECT_DELAY)
}

// 연결 보장 함수 - 단순화
export async function ensureConnection() {
  try {
    // 마지막 사용 시간 업데이트
    lastUsed = Date.now()
    
    // 연결 해제 타이머 리셋
    scheduleDisconnect()
    
    // 단순히 prisma 인스턴스 반환 (연결은 필요할 때 자동으로 이루어짐)
    return prisma
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error)
    throw error
  }
}

// 수동 연결 해제
export async function disconnectPrisma() {
  try {
    if (disconnectTimer) {
      clearTimeout(disconnectTimer)
      disconnectTimer = null
    }
    await prisma.$disconnect()
    console.log('데이터베이스 연결 해제됨')
  } catch (error) {
    console.error('데이터베이스 연결 해제 실패:', error)
  }
}

// 한국 시간대 유틸리티 함수들
export function getKoreaTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: KOREA_TIMEZONE }))
}

export function formatKoreaTime(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KOREA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

export function getKoreaTimeString(): string {
  return formatKoreaTime(new Date())
}

export { prisma }