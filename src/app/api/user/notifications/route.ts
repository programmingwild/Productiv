import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { Prisma } from "@/generated/prisma-client"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPreferences: true },
  })

  return NextResponse.json({
    preferences: user?.notificationPreferences ?? {
      taskAssigned: true,
      commentAdded: true,
      mentioned: true,
      taskMoved: false,
      projectChanges: false,
    },
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPreferences: true },
  })

  const merged = { ...(current?.notificationPreferences as Record<string, boolean> ?? {}), ...body }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPreferences: merged as Prisma.InputJsonValue },
  })

  return NextResponse.json({ ok: true })
}
