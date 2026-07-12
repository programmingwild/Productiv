import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const { team } = await requireTeam()

    const activities = await prisma.activity.findMany({
      where: { teamId: team.id },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    })

    const userIds = [...new Set(activities.map((a) => a.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    })
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

    const enriched = activities.map((a) => ({
      ...a,
      user: userMap[a.userId] ?? null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { activityId, read } = await req.json()

    if (activityId) {
      await prisma.activity.updateMany({
        where: { id: activityId },
        data: { read },
      })
    } else {
      await prisma.activity.updateMany({
        where: { teamId: (await requireTeam()).team.id },
        data: { read: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { activityId } = await req.json()

    if (activityId) {
      await prisma.activity.deleteMany({
        where: { id: activityId },
      })
    } else {
      await prisma.activity.deleteMany({
        where: { teamId: (await requireTeam()).team.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
