import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { SprintsClient } from "./sprints-client"

export default async function SprintsPage() {
  const membership = await requireTeam()

  const sprints = await prisma.sprint.findMany({
    where: { teamId: membership.team.id },
    include: {
      tasks: {
        select: { id: true, title: true, priority: true, position: true, createdAt: true, assignee: { select: { id: true, name: true, image: true } } },
      },
    },
    orderBy: { startDate: "asc" },
  })

  const unassignedTasks = await prisma.task.findMany({
    where: { teamId: membership.team.id, sprintId: null },
    select: { id: true, title: true, priority: true, position: true, assignee: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  })

  const members = await prisma.teamMember.findMany({
    where: { teamId: membership.team.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  })

  return (
    <SprintsClient
      sprints={JSON.parse(JSON.stringify(sprints))}
      unassignedTasks={JSON.parse(JSON.stringify(unassignedTasks))}
      members={JSON.parse(JSON.stringify(members.map((m) => ({ ...m.user, role: m.role }))))}
      teamId={membership.team.id}
    />
  )
}
