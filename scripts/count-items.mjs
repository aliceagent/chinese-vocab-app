import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const totalItems = await prisma.vocabularyItem.count()
  const totalLists = await prisma.vocabularyList.count()
  
  console.log('Total vocabulary items:', totalItems)
  console.log('Total vocabulary lists:', totalLists)
  
  // Check recent lists
  const recentLists = await prisma.vocabularyList.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { _count: { select: { vocabularyItems: true } } }
  })
  
  console.log('\nRecent lists:')
  recentLists.forEach(list => {
    console.log(`- ${list.name}: ${list._count.vocabularyItems} items (claimed: ${list.totalWords})`)
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
