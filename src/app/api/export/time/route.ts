import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { toCSV, csvResponse } from "@/lib/csv"

export async function GET(request: Request) {
  try {
    const { team } = await requireTeam()
    const url = new URL(request.url)
    const from = url.searchParams.get("from")
    const to = url.searchParams.get("to")
    const userId = url.searchParams.get("userId")

    const where: Record<string, unknown> = { teamId: team.id }
    if (from || to) {
      where.startTime = {}
      if (from) (where.startTime as Record<string, unknown>).gte = new Date(from)
      if (to) (where.startTime as Record<string, unknown>).lte = new Date(to)
    }
    if (userId) where.userId = userId

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        task: { select: { title: true } },
      },
      orderBy: { startTime: "desc" },
    })

    const headers = ["Task", "User", "Email", "Start", "End", "Duration (s)", "Duration (h)", "Notes"]
    const rows = entries.map((e) => {
      const dur = e.duration ?? (e.endTime ? Math.round((e.endTime.getTime() - e.startTime.getTime()) / 1000) : 0)
      return [
        e.task.title,
        e.user.name ?? "Unknown",
        e.user.email ?? "",
        e.startTime.toISOString(),
        e.endTime?.toISOString() ?? "",
        String(dur),
        (dur / 3600).toFixed(2),
        e.notes ?? "",
      ]
    })

    return csvResponse(toCSV(headers, rows), `time-entries-${Date.now()}`)
  } catch (error) {
    console.error(error)
    return new Response("Internal server error", { status: 500 })
  }
}
