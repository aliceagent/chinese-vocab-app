const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@libsql/client')
const { PrismaLibSql } = require('@prisma/adapter-libsql')
const bcrypt = require('bcryptjs')

// Set the environment variable for this script
process.env.DATABASE_URL = 'file:./dev.db'

const libsql = createClient({
  url: 'file:./dev.db'
})
const adapter = new PrismaLibSql(libsql)

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn']
})

async function createTestData() {
  try {
    console.log('Testing database connection...')
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10)
    const user = await prisma.user.create({
      data: {
        username: 'gamma-qa-test-2026',
        email: 'gamma-qa-test-2026@test.local',
        passwordHash: hashedPassword
      }
    })
    console.log('Created user:', user.id)

    // Create test vocabulary list with Gamma's ID
    const vocabList = await prisma.vocabularyList.create({
      data: {
        id: 'a56ebe8f-073e-46bb-af49-9709c6542b18', // Gamma's test list ID
        userId: user.id,
        name: 'Test Vocabulary List',
        description: 'Test list for debugging vocabulary word addition'
      }
    })
    console.log('Created vocabulary list:', vocabList.id)

    console.log('Test data created successfully!')
    
  } catch (error) {
    console.error('Error creating test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestData()