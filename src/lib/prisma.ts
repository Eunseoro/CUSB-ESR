// 이 파일은 Prisma 클라이언트를 생성 및 export합니다.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 