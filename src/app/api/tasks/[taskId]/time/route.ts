import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { auth } from "@/lib/auth"
import { logActivity } from "@/lib/activity"

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId } = await params

    const task = await prisma.task.findFirst({ where: { id: taskId, teamId: team.id } })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const entries = await prisma.timeEntry.findMany({
      where: { taskId, teamId: team.id },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { startTime: "desc" },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await auth()
    const { team } = await requireTeam()
    const { taskId } = await params
    const body = await req.json()

    const task = await prisma.task.findFirst({ where: { id: taskId, teamId: team.id } })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const userId = session?.user?.id ?? ""

    if (body.action === "start") {
      const running = await prisma.timeEntry.findFirst({
        where: { userId, teamId: team.id, endTime: null },
      })
      if (running) {
        return NextResponse.json({ error: "Already running a timer on another task" }, { status: 409 })
      }

      const entry = await prisma.timeEntry.create({
        data: { taskId, userId, teamId: team.id, startTime: new Date() },
        include: { user: { select: { id: true, name: true, image: true } } },
      })
      await logActivity({ teamId: team.id, taskId, action: "timer_started", metadata: { entryId: entry.id } })
      return NextResponse.json(entry, { status: 201 })
    }

    if (body.action === "log") {
      const duration = body.duration as number | undefined
      if (!duration || duration <= 0) {
        return NextResponse.json({ error: "Duration must be a positive number" }, { status: 400 })
      }

      const entry = await prisma.timeEntry.create({
        data: {
          taskId, userId, teamId: team.id,
          startTime: body.startTime ? new Date(body.startTime) : new Date(),
          endTime: body.startTime ? new Date(new Date(body.startTime).getTime() + duration * 1000) : new Date(),
          duration,
          notes: body.notes ?? null,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      })
      await logActivity({ teamId: team.id, taskId, action: "time_logged", metadata: { entryId: entry.id, duration } })
      return NextResponse.json(entry, { status: 201 })
    }

    return NextResponse.json({ error: "Invalid action. Use 'start' or 'log'" }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
