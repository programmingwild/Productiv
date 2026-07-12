import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { auth } from "@/lib/auth"
import { logActivity, notifyTaskAssigned } from "@/lib/activity"

export async function POST(req: Request) {
  try {
    const membership = await requireTeam()
    const team = membership.team
    const session = await auth()
    const { columnId, title, description, assigneeId, priority, dueDate } = await req.json()

    const column = await prisma.column.findFirst({
      where: { id: columnId, board: { project: { teamId: team.id } } },
    })
    if (!column) return NextResponse.json({ error: "Column not found" }, { status: 404 })

    const maxPos = await prisma.task.aggregate({
      where: { columnId },
      _max: { position: true },
    })

    const task = await prisma.task.create({
      data: {
        columnId,
        teamId: team.id,
        title,
        description,
        position: (maxPos._max.position ?? -1) + 1,
        assigneeId,
        priority: priority ?? "none",
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: membership.userId,
      },
      include: { assignee: { select: { id: true, name: true, image: true } } },
    })

    await logActivity({
      teamId: team.id,
      taskId: task.id,
      action: "task_created",
      metadata: { title },
    })

    if (assigneeId && assigneeId !== session?.user?.id) {
      await notifyTaskAssigned(team.id, task.id, title, assigneeId, session?.user?.name ?? "Someone")
    }

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
