import type { PoolConfig } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma-client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const databaseUrl = process.env.POSTGRES_PRISMA_URL

function createPrismaClient() {
  if (!databaseUrl) {
    throw new Error("Missing POSTGRES_PRISMA_URL environment variable")
  }
  const poolConfig: PoolConfig = {
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 5000,
  }
  const adapter = new PrismaPg(poolConfig)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
