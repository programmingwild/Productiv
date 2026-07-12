import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity, notifySprintDeleted } from "@/lib/activity"

export async function GET(req: Request, { params }: { params: Promise<{ sprintId: string }> }) {
  try {
    const { sprintId } = await params
    const { team } = await requireTeam()

    const sprint = await prisma.sprint.findFirst({
      where: { id: sprintId, teamId: team.id },
      include: {
        tasks: {
          select: { id: true, title: true, priority: true, position: true, createdAt: true, assignee: { select: { id: true, name: true, image: true } } },
          orderBy: { position: "asc" },
        },
      },
    })

    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 })
    return NextResponse.json(sprint)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ sprintId: string }> }) {
  try {
    const { sprintId } = await params
    const membership = await requireTeam()

    const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, teamId: membership.team.id } })
    if (!sprint) return NextResponse.json({ error: "Sprint not found" }, { status: 404 })

    const { name, goal, startDate, endDate, status } = await req.json()

    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (goal !== undefined) data.goal = goal
    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate = new Date(endDate)
    if (status) data.status = status

    const updated = await prisma.sprint.update({ where: { id: sprintId }, data })
    const changes = Object.keys(data)
    await logActivity({ teamId: membership.team.id, action: "sprint_updated", metadata: { sprintId, changes } })
    if (status && status !== sprint.status) {
      const members = await prisma.teamMember.findMany({ where: { teamId: membership.team.id }, select: { userId: true } })
      for (const m of members) {
        if (m.userId === membership.userId) continue
        await prisma.notification.create({
          data: { userId: m.userId, teamId: membership.team.id, app: "Sprints", icon: "📋", title: "Sprint status changed", message: `Sprint "${sprint.name}" is now ${status.toLowerCase()}`, link: "/sprints" },
        })
      }
    }
    return NextResponse.json(updated)
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

    await prisma.task.updateMany({ where: { sprintId }, data: { sprintId: null } })
    await prisma.sprint.delete({ where: { id: sprintId } })

    await logActivity({ teamId: membership.team.id, action: "sprint_deleted", metadata: { sprintId, name: sprint.name } })
    await notifySprintDeleted(membership.team.id, sprint.name, membership.userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
