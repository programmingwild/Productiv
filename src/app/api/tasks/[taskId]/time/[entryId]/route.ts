import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity } from "@/lib/activity"

export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string; entryId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId, entryId } = await params
    const body = await req.json()

    const entry = await prisma.timeEntry.findFirst({
      where: { id: entryId, taskId, teamId: team.id },
    })
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (body.action === "stop") {
      if (entry.endTime) {
        return NextResponse.json({ error: "Timer already stopped" }, { status: 400 })
      }
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 1000)
      const updated = await prisma.timeEntry.update({
        where: { id: entryId },
        data: { endTime, duration, notes: body.notes ?? entry.notes },
        include: { user: { select: { id: true, name: true, image: true } } },
      })
      await logActivity({ teamId: team.id, taskId, action: "timer_stopped", metadata: { entryId, duration } })
      return NextResponse.json(updated)
    }

    if (body.notes !== undefined) {
      const updated = await prisma.timeEntry.update({
        where: { id: entryId },
        data: { notes: body.notes },
        include: { user: { select: { id: true, name: true, image: true } } },
      })
      await logActivity({ teamId: team.id, taskId, action: "timer_notes_updated", metadata: { entryId } })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ taskId: string; entryId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId, entryId } = await params

    const entry = await prisma.timeEntry.findFirst({
      where: { id: entryId, taskId, teamId: team.id },
    })
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.timeEntry.delete({ where: { id: entryId } })
    await logActivity({ teamId: team.id, taskId, action: "time_entry_deleted", metadata: { entryId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
