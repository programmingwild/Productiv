import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity, notifySprintCreated } from "@/lib/activity"

export async function GET() {
  try {
    const { team } = await requireTeam()

    const sprints = await prisma.sprint.findMany({
      where: { teamId: team.id },
      include: {
        tasks: {
          select: { id: true, title: true, priority: true, position: true, createdAt: true, assignee: { select: { id: true, name: true, image: true } } },
        },
      },
      orderBy: { startDate: "asc" },
    })

    return NextResponse.json(sprints)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const membership = await requireTeam()
    const currentMember = await prisma.teamMember.findUnique({ where: { id: membership.id } })
    if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN" && currentMember.role !== "MEMBER")) {
      return NextResponse.json({ error: "Only team members can create sprints" }, { status: 403 })
    }

    const { name, goal, startDate, endDate } = await req.json()
    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, startDate, and endDate are required" }, { status: 400 })
    }

    const sprint = await prisma.sprint.create({
      data: {
        teamId: membership.team.id,
        name,
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    })

    await logActivity({ teamId: membership.team.id, action: "sprint_created", metadata: { sprintId: sprint.id, name } })
    await notifySprintCreated(membership.team.id, name, sprint.id, membership.userId)

    return NextResponse.json(sprint)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
