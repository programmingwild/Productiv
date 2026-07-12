import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId } = await params

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId: team.id },
      select: {
        taskDependencies: { include: { dependsOnTask: { select: { id: true, title: true } } } },
        blockingDependents: { include: { task: { select: { id: true, title: true } } } },
      },
    })

    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json(task)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId } = await params
    const { dependsOnTaskId } = await req.json()

    if (!dependsOnTaskId) return NextResponse.json({ error: "dependsOnTaskId is required" }, { status: 400 })
    if (dependsOnTaskId === taskId) return NextResponse.json({ error: "Cannot depend on itself" }, { status: 400 })

    const [task, dependsOn] = await Promise.all([
      prisma.task.findFirst({ where: { id: taskId, teamId: team.id } }),
      prisma.task.findFirst({ where: { id: dependsOnTaskId, teamId: team.id } }),
    ])

    if (!task || !dependsOn) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const dep = await prisma.taskDependency.create({
      data: { taskId, dependsOnTaskId },
      include: { dependsOnTask: { select: { id: true, title: true } } },
    })

    return NextResponse.json(dep, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
