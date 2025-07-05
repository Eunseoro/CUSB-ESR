// 이 스크립트는 방명록에 995개의 더미 데이터를 추가합니다.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomString(len: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let str = ''
  for (let i = 0; i < len; i++) {
    str += chars[Math.floor(Math.random() * chars.length)]
  }
  return str
}

async function main() {
  const count = await prisma.guestbook.count()
  const toCreate = 995 - count
  if (toCreate <= 0) {
    console.log('이미 995개 이상의 방명록이 존재합니다.')
    return
  }
  for (let i = 0; i < toCreate; i++) {
    await prisma.guestbook.create({
      data: {
        author: '더미작성자_' + randomString(4),
        content: '테스트용 더미 글입니다. ' + randomString(8),
        userKey: randomString(12),
      }
    })
    if ((i + 1) % 50 === 0) {
      console.log(`${i + 1}개 생성됨...`)
    }
  }
  console.log(`총 ${toCreate}개의 더미 방명록이 추가되었습니다.`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(() => {
  prisma.$disconnect()
}) 