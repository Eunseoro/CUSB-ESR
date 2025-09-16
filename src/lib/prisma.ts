// Prisma 클라이언트를 생성 및 export합니다.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  connectionTimer: NodeJS.Timeout | undefined
}

// 무료 플랜 최적화: 연결 풀 최소화 설정
const prismaConfig = {
  log: ['error'] as any,
  errorFormat: (process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty') as any,
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
}

// 개발 환경에서만 전역 인스턴스 유지 (Hot Reload 대응)
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // 프로덕션: 매번 새 인스턴스 생성 (연결 유지 최소화)
  prisma = new PrismaClient(prismaConfig)
} else {
  // 개발: 전역 인스턴스 재사용
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient(prismaConfig)
  }
  prisma = globalForPrisma.prisma
}

// 연결 상태 관리 (전역 접근 가능)
let isConnected = false

// 연결 상태를 외부에서 수정할 수 있는 함수
export function setConnectionStatus(status: boolean) {
  isConnected = status
}

export function getConnectionStatus() {
  return isConnected
}
let connectionTimer: NodeJS.Timeout | null = null

// 5분 후 자동 연결 해제
const CONNECTION_TIMEOUT = 5 * 60 * 1000 // 5분

function resetConnectionTimer() {
  // 기존 타이머 클리어
  if (connectionTimer) {
    clearTimeout(connectionTimer)
  }
  
  // 새 타이머 설정 (5분 후 연결 해제)
  connectionTimer = setTimeout(async () => {
    try {
      await prisma.$disconnect()
      isConnected = false
      console.log('5분 비활성으로 인한 데이터베이스 연결 해제')
    } catch (error) {
      console.error('자동 연결 해제 실패:', error)
    }
  }, CONNECTION_TIMEOUT)
}

// 무료 플랜 최적화: 5분간 연결 유지 후 자동 해제
export async function ensureConnection() {
  try {
    // 연결이 끊어져 있으면 재연결
    if (!isConnected) {
      await prisma.$connect()
      isConnected = true
      console.log('데이터베이스 연결됨')
    }
    
    // 타이머 리셋 (사용 중이므로 5분 연장)
    resetConnectionTimer()
    
    return prisma
  } catch (error) {
    console.error('Prisma 데이터베이스 연결 실패:', error)
    isConnected = false
    throw error
  }
}

// 수동 연결 해제 함수
export async function disconnectPrisma() {
  try {
    // 타이머 클리어
    if (connectionTimer) {
      clearTimeout(connectionTimer)
      connectionTimer = null
    }
    
    await prisma.$disconnect()
    isConnected = false
    console.log('데이터베이스 연결 해제됨')
  } catch (error) {
    console.error('데이터베이스 연결 해제 실패:', error)
  }
}

export { prisma } 

// PinnedGuestbook 모델이 인식되지 않는 경우, 아래 명령어로 prisma client를 재생성하세요:
// npx prisma generate --schema=prisma/schema.prisma 