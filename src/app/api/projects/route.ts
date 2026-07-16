import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity, notifyProjectCreated } from "@/lib/activity"

export async function GET() {
  try {
    const { team } = await requireTeam()
    const projects = await prisma.project.findMany({
      where: { teamId: team.id },
      include: { boards: { include: { columns: { include: { tasks: { select: { id: true } } } } } } },
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const membership = await requireTeam()
    const team = membership.team
    const { name, description, color } = await req.json()

    const project = await prisma.project.create({
      data: {
        teamId: team.id,
        name,
        description,
        color: color ?? "#6366f1",
        boards: {
          create: {
            name: "Main Board",
            columns: {
              createMany: {
                data: [
                  { name: "Backlog", position: 0, color: "#94a3b8" },
                  { name: "To Do", position: 1, color: "#3b82f6" },
                  { name: "In Progress", position: 2, color: "#f59e0b" },
                  { name: "Done", position: 3, color: "#22c55e" },
                ],
              },
            },
          },
        },
      },
      include: {
        boards: { include: { columns: true } },
      },
    })

    await logActivity({ teamId: team.id, action: "project_created", metadata: { projectId: project.id, name } })
    await notifyProjectCreated(team.id, name, project.id, membership.userId)
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
