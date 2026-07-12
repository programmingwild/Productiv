import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { auth } from "@/lib/auth"
import { logActivity, notifyTaskAssigned, notifyTaskMoved } from "@/lib/activity"

export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const membership = await requireTeam()
    const session = await auth()
    const team = membership.team
    const { taskId } = await params
    const body = await req.json()

    const { columnId, position, title, description, assigneeId, priority, dueDate } = body

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId: team.id },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (assigneeId !== undefined) data.assigneeId = assigneeId
    if (priority !== undefined) data.priority = priority
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null

    if (columnId !== undefined) {
      data.columnId = columnId
      data.position = position ?? 0

      if (columnId !== task.columnId) {
        await prisma.task.updateMany({
          where: { columnId: task.columnId, position: { gt: task.position }, teamId: team.id },
          data: { position: { decrement: 1 } },
        })

        await prisma.task.updateMany({
          where: { columnId, position: { gte: position ?? 0 }, teamId: team.id },
          data: { position: { increment: 1 } },
        })
      } else if (position !== undefined && position !== task.position) {
        if (position > task.position) {
          await prisma.task.updateMany({
            where: { columnId, position: { gt: task.position, lte: position }, teamId: team.id },
            data: { position: { decrement: 1 } },
          })
        } else {
          await prisma.task.updateMany({
            where: { columnId, position: { gte: position, lt: task.position }, teamId: team.id },
            data: { position: { increment: 1 } },
          })
        }
        data.position = position
      }
    } else if (position !== undefined && position !== task.position) {
      if (position > task.position) {
        await prisma.task.updateMany({
          where: { columnId: task.columnId, position: { gt: task.position, lte: position }, teamId: team.id },
          data: { position: { decrement: 1 } },
        })
      } else {
        await prisma.task.updateMany({
          where: { columnId: task.columnId, position: { gte: position, lt: task.position }, teamId: team.id },
          data: { position: { increment: 1 } },
        })
      }
      data.position = position
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignee: { select: { id: true, name: true, image: true } } },
    })

    await logActivity({
      teamId: team.id,
      taskId,
      action: "task_updated",
      metadata: { changes: Object.keys(data) },
    })

    if (assigneeId !== undefined && assigneeId !== task.assigneeId && assigneeId && assigneeId !== session?.user?.id) {
      const userName = session?.user?.name ?? "Someone"
      await notifyTaskAssigned(team.id, taskId, task.title, assigneeId, userName)
    }

    if (columnId !== undefined && columnId !== task.columnId && task.assigneeId !== session?.user?.id) {
      const cols = await prisma.column.findMany({
        where: { id: { in: [task.columnId, columnId] } },
        select: { id: true, name: true },
      })
      const fromName = cols.find((c) => c.id === task.columnId)?.name ?? "previous"
      const toName = cols.find((c) => c.id === columnId)?.name ?? "next"
      const userName = session?.user?.name ?? "Someone"
      await notifyTaskMoved(team.id, taskId, task.title, userName, fromName, toName, task.assigneeId, session?.user?.id)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId } = await params

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId: team.id },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.task.delete({ where: { id: taskId } })

    await prisma.task.updateMany({
      where: { columnId: task.columnId, position: { gt: task.position }, teamId: team.id },
      data: { position: { decrement: 1 } },
    })

    await logActivity({
      teamId: team.id,
      taskId,
      action: "task_deleted",
      metadata: { title: task.title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
