import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"

export async function GET(request: Request) {
  try {
    const { team } = await requireTeam()
    const url = new URL(request.url)
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? ""

    const results: {
      tasks: { id: string; title: string; priority: string; projectName: string; projectId: string }[]
      projects: { id: string; name: string; color: string }[]
      sprints: { id: string; name: string; status: string }[]
      members: { id: string; name: string; email: string; role: string }[]
    } = { tasks: [], projects: [], sprints: [], members: [] }

    if (!q || q.length < 1) return NextResponse.json(results)

    const [tasks, projects, sprints, members] = await Promise.all([
      prisma.task.findMany({
        where: { teamId: team.id, title: { contains: q, mode: "insensitive" } },
        select: { id: true, title: true, priority: true, column: { select: { board: { select: { project: { select: { id: true, name: true } } } } } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.project.findMany({
        where: { teamId: team.id, name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, color: true },
        take: 5,
      }),
      prisma.sprint.findMany({
        where: { teamId: team.id, name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, status: true },
        take: 5,
      }),
      prisma.teamMember.findMany({
        where: { teamId: team.id, user: { name: { contains: q, mode: "insensitive" } } },
        select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
        take: 5,
      }),
    ])

    results.tasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      projectName: t.column?.board?.project?.name ?? "",
      projectId: t.column?.board?.project?.id ?? "",
    }))

    results.projects = projects

    results.sprints = sprints

    results.members = members.map((m) => ({
      id: m.user.id,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      role: m.role,
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
