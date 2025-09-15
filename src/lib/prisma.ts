// Prisma 클라이언트를 생성 및 export합니다.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 클라이언트를 안전하게 초기화
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
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

// 연결 상태 확인 및 재연결 처리
let isConnected = false

export async function ensureConnection() {
  if (!isConnected) {
    try {
      await prisma.$connect()
      isConnected = true
      console.log('Prisma 데이터베이스 연결 성공')
    } catch (error) {
      console.error('Prisma 데이터베이스 연결 실패:', error)
      isConnected = false
      throw error
    }
  }
  return prisma
}

export { prisma } 

// PinnedGuestbook 모델이 인식되지 않는 경우, 아래 명령어로 prisma client를 재생성하세요:
// npx prisma generate --schema=prisma/schema.prisma 