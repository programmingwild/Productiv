import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"

export async function GET() {
  try {
    const { team } = await requireTeam()

    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalTasks, completedTasks, overdueTasks, timeEntries, memberCount] = await Promise.all([
      prisma.task.count({ where: { teamId: team.id } }),
      prisma.task.count({ where: { teamId: team.id, column: { name: { in: ["Done", "Completed"] } } } }),
      prisma.task.count({
        where: { teamId: team.id, dueDate: { lt: now }, column: { name: { notIn: ["Done", "Completed"] } } },
      }),
      prisma.timeEntry.findMany({
        where: { teamId: team.id, startTime: { gte: startOfWeek } },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.teamMember.count({ where: { teamId: team.id } }),
    ])

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const dailyTotals: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      dailyTotals[d.toISOString().slice(0, 10)] = 0
    }
    for (const e of timeEntries) {
      if (e.duration) {
        const day = e.startTime.toISOString().slice(0, 10)
        dailyTotals[day] = (dailyTotals[day] ?? 0) + e.duration
      }
    }

    const weeklyChart = Object.entries(dailyTotals).map(([date, seconds]) => ({
      date,
      hours: Math.round((seconds / 3600) * 100) / 100,
    }))

    const userTimeMap: Record<string, { name: string; seconds: number }> = {}
    for (const e of timeEntries) {
      if (e.duration && e.user) {
        const uid = e.user.id
        if (!userTimeMap[uid]) userTimeMap[uid] = { name: e.user.name ?? "Unknown", seconds: 0 }
        userTimeMap[uid].seconds += e.duration
      }
    }
    const teamWorkload = Object.values(userTimeMap)
      .map((u) => ({ name: u.name, hours: Math.round((u.seconds / 3600) * 100) / 100 }))
      .sort((a, b) => b.hours - a.hours)

    return NextResponse.json({
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      memberCount,
      weeklyChart,
      teamWorkload,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
