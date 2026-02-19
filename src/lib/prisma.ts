import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only initialize Prisma client if database URL is properly configured
const isPrismaConfigured = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes('placeholder')

let prismaClient: PrismaClient | null = null

if (isPrismaConfigured) {
  try {
    const libsql = createClient({
      url: process.env.DATABASE_URL!
    })
    const adapter = new PrismaLibSql(libsql)
    
    prismaClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (error) {
    // Fallback to standard SQLite connection
    console.warn('Failed to create LibSQL adapter, falling back to direct connection:', error)
    prismaClient = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }
}

export const prisma = globalForPrisma.prisma ?? prismaClient ?? (null as unknown as PrismaClient)

if (process.env.NODE_ENV !== 'production' && isPrismaConfigured) {
  globalForPrisma.prisma = prisma
}

export default prisma
