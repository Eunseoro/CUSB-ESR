// 기존 노래들을 다중 카테고리로 업데이트하는 스크립트
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateMultiCategories() {
  try {
    console.log('다중 카테고리 업데이트를 시작합니다...')
    
    // 예시: 일부 노래들을 다중 카테고리로 업데이트
    const updates = [
      // MISSION 카테고리 노래들을 KPOP,MISSION으로 변경
      {
        where: { category: 'MISSION' },
        data: { category: 'KPOP,MISSION' }
      },
      // NEWSONG 카테고리 노래들을 KPOP,NEWSONG으로 변경  
      {
        where: { category: 'NEWSONG' },
        data: { category: 'KPOP,NEWSONG' }
      }
    ]
    
    for (const update of updates) {
      const result = await prisma.song.updateMany(update)
      console.log(`업데이트 완료: ${result.count}개 노래`)
    }
    
    // 업데이트된 데이터 확인
    const songs = await prisma.song.findMany({
      where: {
        category: {
          contains: ','
        }
      },
      select: {
        id: true,
        title: true,
        category: true
      },
      take: 10
    })
    
    console.log('\n다중 카테고리 노래들:')
    songs.forEach(song => {
      console.log(`${song.title}: ${song.category}`)
    })
    
    console.log('\n다중 카테고리 업데이트가 완료되었습니다.')
    
  } catch (error) {
    console.error('업데이트 중 오류 발생:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateMultiCategories() 