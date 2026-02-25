import Layout from '@/components/common/Layout'
import FlashcardDeck from '@/components/flashcards/FlashcardDeck'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}

async function getVocabList(id: string) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('placeholder')) {
    return null
  }
  try {
    return await prisma.vocabularyList.findUnique({
      where: { id },
      include: {
        vocabularyItems: {
          orderBy: { hskLevel: 'asc' },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching vocabulary list:', error)
    return null
  }
}

export default async function FlashcardsPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { mode: modeParam } = await searchParams
  const mode = modeParam === 'en-zh' ? 'en-zh' : 'zh-en'

  const list = await getVocabList(id)
  if (!list) notFound()

  return (
    <Layout>
      <FlashcardDeck
        listId={list.id}
        listName={list.name}
        items={list.vocabularyItems}
        mode={mode}
      />
    </Layout>
  )
}
