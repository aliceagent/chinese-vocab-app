import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const listId = process.argv[2] || '2ec28e46-fbd3-4041-87ba-9e3e3d29e64a'

async function main() {
  const list = await prisma.vocabularyList.findUnique({
    where: { id: listId },
    include: {
      vocabularyItems: true,
      fileUploads: true
    }
  })

  if (!list) {
    console.log('Vocabulary list not found:', listId)
    return
  }

  console.log('=== Vocabulary List ===')
  console.log('ID:', list.id)
  console.log('Name:', list.name)
  console.log('Total Words (stored):', list.totalWords)
  console.log('Actual Items Count:', list.vocabularyItems.length)
  console.log('Created At:', list.createdAt)
  
  if (list.fileUploads?.length > 0) {
    console.log('\n=== File Upload ===')
    console.log('Status:', list.fileUploads[0].processingStatus)
    console.log('Original File:', list.fileUploads[0].originalFilename)
  }

  if (list.vocabularyItems.length > 0) {
    console.log('\n=== First 5 Items ===')
    list.vocabularyItems.slice(0, 5).forEach((item, i) => {
      console.log(`${i+1}. ${item.simplified} (${item.pinyin}) - ${item.englishDefinitions?.join(', ')}`)
    })
  } else {
    console.log('\n⚠️ No vocabulary items found!')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
