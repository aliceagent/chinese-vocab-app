import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only initialize Prisma client if database URL is properly configured
const isPrismaConfigured = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes('placeholder')

export const prisma = isPrismaConfigured
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : (null as unknown as PrismaClient)

if (process.env.NODE_ENV !== 'production' && isPrismaConfigured) {
  globalForPrisma.prisma = prisma
}

export default prisma
