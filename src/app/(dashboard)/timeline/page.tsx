import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { TimelineClient } from "./timeline-client"

export default async function TimelinePage() {
  const membership = await requireTeam()

  const sprints = await prisma.sprint.findMany({
    where: { teamId: membership.team.id },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          position: true,
          assignee: { select: { id: true, name: true, image: true } },
          taskDependencies: { include: { dependsOnTask: { select: { id: true, title: true } } } },
          blockingDependents: { include: { task: { select: { id: true, title: true } } } },
        },
      },
    },
    orderBy: { startDate: "asc" },
  })

  const unassignedTasks = await prisma.task.findMany({
    where: { teamId: membership.team.id, sprintId: null, dueDate: { not: null } },
    select: {
      id: true,
      title: true,
      priority: true,
      dueDate: true,
      position: true,
      assignee: { select: { id: true, name: true, image: true } },
      taskDependencies: { include: { dependsOnTask: { select: { id: true, title: true } } } },
      blockingDependents: { include: { task: { select: { id: true, title: true } } } },
    },
    orderBy: { dueDate: "asc" },
  })

  return (
    <TimelineClient
      sprints={JSON.parse(JSON.stringify(sprints))}
      unassignedTasks={JSON.parse(JSON.stringify(unassignedTasks))}
    />
  )
}
