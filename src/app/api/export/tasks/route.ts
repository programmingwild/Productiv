import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { toCSV, csvResponse } from "@/lib/csv"

export async function GET(request: Request) {
  try {
    const { team } = await requireTeam()
    const url = new URL(request.url)
    const projectId = url.searchParams.get("projectId")

    const where: Record<string, unknown> = { teamId: team.id }
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, teamId: team.id }, include: { boards: { include: { columns: { select: { id: true } } } } } })
      if (project) {
        const columnIds = project.boards.flatMap((b) => b.columns.map((c) => c.id))
        where.columnId = { in: columnIds }
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { name: true, email: true } },
        column: { select: { name: true } },
        sprint: { select: { name: true } },
        timeEntries: { select: { duration: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const headers = ["ID", "Title", "Description", "Priority", "Status", "Assignee", "Sprint", "Due Date", "Time Logged (s)", "Created At"]
    const rows = tasks.map((t) => [
      t.id,
      t.title,
      t.description ?? "",
      t.priority,
      t.column?.name ?? "",
      t.assignee?.name ?? t.assignee?.email ?? "Unassigned",
      t.sprint?.name ?? "",
      t.dueDate?.toISOString() ?? "",
      t.timeEntries.reduce((s, e) => s + (e.duration ?? 0), 0),
      t.createdAt.toISOString(),
    ])

    return csvResponse(toCSV(headers, rows), `tasks-${projectId ?? "all"}-${Date.now()}`)
  } catch (error) {
    console.error(error)
    return new Response("Internal server error", { status: 500 })
  }
}
