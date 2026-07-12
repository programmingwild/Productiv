import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push"

export async function GET() {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: now, lte: in24h, not: null },
      assigneeId: { not: null },
    },
    include: {
      assignee: { select: { id: true } },
      column: { include: { board: { include: { project: { select: { id: true, name: true } } } } } },
    },
  })

  let notified = 0
  for (const task of tasks) {
    if (!task.assignee?.id || !task.dueDate) continue

    const projectId = task.column?.board?.project?.id
    const projectName = task.column?.board?.project?.name ?? "Unknown"
    const link = projectId ? `/projects/${projectId}/board?task=${task.id}` : "/projects"

    await sendPushNotification(task.assignee.id, "Task due soon", `${task.title} is due in ${projectName}`, link, "⏰")
    notified++
  }

  return NextResponse.json({ ok: true, tasksChecked: tasks.length, notified })
}
