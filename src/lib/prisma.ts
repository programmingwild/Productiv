import type { PoolConfig } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma-client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  }
  const adapter = new PrismaPg(poolConfig)
  return new PrismaClient({ adapter })
}

function getPrisma() {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient()
  return globalForPrisma.prisma
}

export const prisma = getPrisma()
