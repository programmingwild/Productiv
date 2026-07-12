import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity } from "@/lib/activity"

export async function POST(req: Request, { params }: { params: Promise<{ sprintId: string }> }) {
  try {
    const { sprintId } = await params
    const membership = await requireTeam()

    const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, teamId: membership.team.id } })
    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 })

    const { taskId } = await req.json()
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 })

    const task = await prisma.task.findFirst({ where: { id: taskId, teamId: membership.team.id } })
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    await prisma.task.update({ where: { id: taskId }, data: { sprintId } })
    await logActivity({ teamId: membership.team.id, taskId, action: "task_added_to_sprint", metadata: { sprintId, sprintName: sprint.name } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ sprintId: string }> }) {
  try {
    const { sprintId } = await params
    const membership = await requireTeam()

    const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, teamId: membership.team.id } })
    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 })

    const { taskId } = await req.json()
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 })

    await prisma.task.update({ where: { id: taskId }, data: { sprintId: null } })
    await logActivity({ teamId: membership.team.id, taskId, action: "task_removed_from_sprint", metadata: { sprintId, sprintName: sprint.name } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
