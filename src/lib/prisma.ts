// Prisma 클라이언트를 생성 및 export합니다.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 

// PinnedGuestbook 모델이 인식되지 않는 경우, 아래 명령어로 prisma client를 재생성하세요:
// npx prisma generate --schema=prisma/schema.prisma 