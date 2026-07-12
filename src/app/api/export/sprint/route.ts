import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { toCSV, csvResponse } from "@/lib/csv"

export async function GET(request: Request) {
  try {
    const { team } = await requireTeam()
    const url = new URL(request.url)
    const sprintId = url.searchParams.get("sprintId")

    if (sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: { id: sprintId, teamId: team.id },
        include: {
          tasks: {
            include: { assignee: { select: { name: true, email: true } } },
            orderBy: { position: "asc" },
          },
        },
      })
      if (!sprint) return new Response("Not found", { status: 404 })

      // Sprint info
      const infoHeaders = ["Field", "Value"]
      const infoRows = [
        ["Name", sprint.name],
        ["Goal", sprint.goal ?? ""],
        ["Start Date", sprint.startDate.toISOString()],
        ["End Date", sprint.endDate.toISOString()],
        ["Status", sprint.status],
        ["Total Tasks", String(sprint.tasks.length)],
      ]

      // Task details
      const taskHeaders = ["Title", "Priority", "Assignee", "Email", "Position"]
      const taskRows = sprint.tasks.map((t) => [
        t.title,
        t.priority,
        t.assignee?.name ?? "Unassigned",
        t.assignee?.email ?? "",
        String(t.position),
      ])

      const csv = toCSV(infoHeaders, infoRows) + "\r\n\r\n" + toCSV(taskHeaders, taskRows)

      return csvResponse(csv, `sprint-${sprint.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`)
    }

    // Export all sprints
    const sprints = await prisma.sprint.findMany({
      where: { teamId: team.id },
      include: { tasks: { include: { assignee: { select: { name: true } } } } },
      orderBy: { startDate: "asc" },
    })

    const headers = ["Name", "Goal", "Start", "End", "Status", "Tasks", "Completed Tasks", "Completion %"]
    const rows = sprints.map((s) => {
      const total = s.tasks.length
      const done = s.tasks.filter((t) => t.position >= 5).length
      return [s.name, s.goal ?? "", s.startDate.toISOString(), s.endDate.toISOString(), s.status, String(total), String(done), total > 0 ? String(Math.round((done / total) * 100)) : "0"]
    })

    return csvResponse(toCSV(headers, rows), `sprints-${Date.now()}`)
  } catch (error) {
    console.error(error)
    return new Response("Internal server error", { status: 500 })
  }
}
