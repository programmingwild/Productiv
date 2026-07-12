import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { ActivityClient } from "./activity-client"

export const dynamic = "force-dynamic"

export default async function ActivityPage() {
  const membership = await requireTeam()

  const activities = await prisma.activity.findMany({
    where: { teamId: membership.team.id },
    include: {
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const userIds = [...new Set(activities.map((a) => a.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true },
  })
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

  const enriched = activities.map((a) => ({
    ...a,
    user: userMap[a.userId] ?? null,
  }))

  return (
    <ActivityClient
      initialActivities={JSON.parse(JSON.stringify(enriched))}
      teamId={membership.team.id}
    />
  )
}
