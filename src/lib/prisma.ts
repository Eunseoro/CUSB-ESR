// Prisma 클라이언트를 생성 및 export합니다.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 개발 환경에서만 전역 인스턴스 유지 (Hot Reload 대응)
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // 프로덕션: 매번 새 인스턴스 생성
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
  // 개발: 전역 인스턴스 재사용
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

export { prisma }