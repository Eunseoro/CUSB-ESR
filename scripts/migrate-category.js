// 카테고리 필드를 enum에서 string으로 변경하는 마이그레이션 스크립트
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateCategory() {
  try {
    console.log('카테고리 마이그레이션을 시작합니다...')
    
    // 1. 현재 모든 노래 데이터 조회
    const songs = await prisma.song.findMany({
      select: {
        id: true,
        category: true
      }
    })
    
    console.log(`총 ${songs.length}개의 노래를 찾았습니다.`)
    
    // 2. 각 노래의 카테고리를 문자열로 변환
    for (const song of songs) {
      const categoryString = song.category
      console.log(`노래 ID: ${song.id}, 카테고리: ${categoryString}`)
      
      // 카테고리를 문자열로 업데이트 (이미 enum 값이 문자열로 저장되어 있음)
      await prisma.song.update({
        where: { id: song.id },
        data: {
          category: categoryString
        }
      })
    }
    
    console.log('카테고리 마이그레이션이 완료되었습니다.')
    
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateCategory() 