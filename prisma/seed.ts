import { config } from "dotenv"
config()
import type { PoolConfig } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma-client"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
}
const adapter = new PrismaPg(poolConfig)
const prisma = new PrismaClient({ adapter })

function id() { return crypto.randomUUID() }

async function main() {
  console.log("Reseeding database...")

  await prisma.notification.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.column.deleteMany()
  await prisma.board.deleteMany()
  await prisma.project.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash("password123", 10)

  const u1 = id(); const u2 = id(); const u3 = id(); const u4 = id()

  await Promise.all([
    prisma.user.create({ data: { id: u1, name: "Jane Doe", email: "jane@acme.com", passwordHash } }),
    prisma.user.create({ data: { id: u2, name: "John Smith", email: "john@acme.com", passwordHash } }),
    prisma.user.create({ data: { id: u3, name: "Alice Wang", email: "alice@acme.com", passwordHash } }),
    prisma.user.create({ data: { id: u4, name: "Bob Lee", email: "bob@acme.com", passwordHash } }),
  ])

  const teamId = id()
  const team = await prisma.team.create({
    data: { id: teamId, name: "Acme Corp", slug: "acme", subdomain: "acme", planTier: "PRO" },
  })

  const memberData = [
    { userId: u1, role: "OWNER" as const },
    { userId: u2, role: "MEMBER" as const },
    { userId: u3, role: "MEMBER" as const },
    { userId: u4, role: "VIEWER" as const },
  ]
  await Promise.all(memberData.map((m) => prisma.teamMember.create({ data: { teamId: team.id, ...m } })))

  const p1 = id(); const p2 = id(); const p3 = id()
  await Promise.all([
    prisma.project.create({ data: { id: p1, teamId: team.id, name: "Website Redesign", description: "Q3 refresh — new landing page, auth, onboarding", color: "#e85d75" } }),
    prisma.project.create({ data: { id: p2, teamId: team.id, name: "Mobile App", description: "React Native cross-platform app", color: "#4ecdc4" } }),
    prisma.project.create({ data: { id: p3, teamId: team.id, name: "Backend API", description: "GraphQL gateway + microservices", color: "#f7d44a" } }),
  ])

  const b1 = id()
  const board = await prisma.board.create({ data: { id: b1, projectId: p1, name: "Main Board" } })

  const c1 = id(); const c2 = id(); const c3 = id()
  await Promise.all([
    prisma.column.create({ data: { id: c1, boardId: board.id, name: "Backlog", position: 0, color: "#f7d44a" } }),
    prisma.column.create({ data: { id: c2, boardId: board.id, name: "In Progress", position: 1, color: "#e85d75" } }),
    prisma.column.create({ data: { id: c3, boardId: board.id, name: "Done", position: 2, color: "#4ecdc4" } }),
  ])

  const tasks = await Promise.all([
    prisma.task.create({ data: { id: id(), columnId: c1, teamId: team.id, title: "Design new landing page", position: 0, priority: "medium", assigneeId: u2, createdBy: u1 } }),
    prisma.task.create({ data: { id: id(), columnId: c1, teamId: team.id, title: "Research auth providers", position: 1, priority: "low", assigneeId: null, createdBy: u1 } }),
    prisma.task.create({ data: { id: id(), columnId: c2, teamId: team.id, title: "Fix login validation", position: 0, priority: "high", assigneeId: u3, createdBy: u2 } }),
    prisma.task.create({ data: { id: id(), columnId: c2, teamId: team.id, title: "User onboarding flow", position: 1, priority: "medium", assigneeId: u1, createdBy: u1 } }),
    prisma.task.create({ data: { id: id(), columnId: c3, teamId: team.id, title: "Set up CI/CD pipeline", position: 0, priority: "urgent", assigneeId: u2, createdBy: u1 } }),
    prisma.task.create({ data: { id: id(), columnId: c3, teamId: team.id, title: "Database schema design", position: 1, priority: "high", assigneeId: null, createdBy: u1 } }),
    prisma.task.create({ data: { id: id(), columnId: c1, teamId: team.id, title: "API rate limiting middleware", position: 2, priority: "high", assigneeId: u3, createdBy: u2 } }),
    prisma.task.create({ data: { id: id(), columnId: c2, teamId: team.id, title: "Homepage hero animation", position: 2, priority: "low", assigneeId: null, createdBy: u1 } }),
    prisma.task.create({ data: { id: id(), columnId: c1, teamId: team.id, title: "Performance optimization audit", position: 3, priority: "medium", assigneeId: u4, createdBy: u1 } }),
  ])

  const [t3, t4, t1] = [tasks[2], tasks[3], tasks[0]]

  await Promise.all([
    prisma.comment.create({ data: { taskId: t3.id, userId: u2, content: "The Google OAuth flow throws a redirect_uri_mismatch error. Check the console config." } }),
    prisma.comment.create({ data: { taskId: t3.id, userId: u3, content: "Added the correct URI to the Google Cloud Console. Should work now." } }),
    prisma.comment.create({ data: { taskId: t4.id, userId: u1, content: "Need to handle the case where users skip the tutorial @john" } }),
    prisma.comment.create({ data: { taskId: t4.id, userId: u2, content: "Good catch, I'll add a skip button with a cookie to remember the preference." } }),
    prisma.comment.create({ data: { taskId: t1.id, userId: u2, content: "Here are the Figma mockups: [link]" } }),
  ])

  console.log("Seed complete — 4 users, 1 team, 3 projects, 9 tasks, 5 comments")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
