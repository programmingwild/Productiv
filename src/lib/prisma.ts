import type { PoolConfig } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma-client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  const poolConfig: PoolConfig = {
    connectionString: url ?? "",
    ssl:
      url?.includes("sslmode=require") || url?.includes("sslmode=verify-full")
        ? { rejectUnauthorized: false }
        : undefined,
  }
  const adapter = new PrismaPg(poolConfig)
  return new PrismaClient({ adapter })
}

function getPrisma() {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient()
  return globalForPrisma.prisma
}

export const prisma = getPrisma()
