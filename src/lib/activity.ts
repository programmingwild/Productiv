import { prisma } from "./prisma"
import { auth } from "./auth"
import type { Prisma } from "@/generated/prisma-client"
import { sendPushNotification, sendPushNotificationToTeam } from "./push"

interface LogActivityParams {
  teamId: string
  taskId?: string
  action: string
  metadata?: Record<string, unknown>
}

export async function logActivity({ teamId, taskId, action, metadata }: LogActivityParams) {
  const session = await auth()
  if (!session?.user?.id) return

  const data = metadata ?? {}
  await prisma.activity.create({
    data: {
      teamId,
      taskId,
      userId: session.user.id,
      action,
      metadata: data as Prisma.InputJsonValue,
    },
  })
}

async function getProjectLink(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { project: { select: { id: true } } } } } } },
  })
  const projectId = task?.column?.board?.project?.id
  return projectId ? `/projects/${projectId}/board?task=${taskId}` : null
}

export async function notifyTaskAssigned(teamId: string, taskId: string, taskTitle: string, assigneeUserId: string, assignedByUser: string) {
  const link = await getProjectLink(taskId)
  const linkStr = link ?? "/projects"
  await prisma.notification.create({
    data: {
      userId: assigneeUserId,
      teamId,
      app: "Tasks",
      icon: "📋",
      title: "Task assigned to you",
      message: `${assignedByUser} assigned "${taskTitle}" to you`,
      link: linkStr,
    },
  })
  await sendPushNotification(assigneeUserId, "Task assigned to you", `${assignedByUser} assigned "${taskTitle}" to you`, linkStr, "📋")
}

export async function notifyTaskComment(teamId: string, taskId: string, taskTitle: string, commentAuthor: string, commentPreview: string, taskAssigneeId: string | null, actorUserId: string) {
  const link = await getProjectLink(taskId)
  const linkStr = link ?? "/projects"
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  })
  const targets = members.filter((m) => m.userId !== actorUserId && (!taskAssigneeId || m.userId === taskAssigneeId))
  if (targets.length === 0) return

  await prisma.notification.createMany({
    data: targets.map((m) => ({
      userId: m.userId,
      teamId,
      app: "Comments",
      icon: "💬",
      title: `${commentAuthor} commented`,
      message: `on "${taskTitle}": ${commentPreview}`,
      link: linkStr,
    })),
  })

  for (const member of targets) {
    await sendPushNotification(member.userId, `${commentAuthor} commented`, `on "${taskTitle}": ${commentPreview}`, linkStr, "💬")
  }
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g)
  if (!matches) return []
  return matches.map((m) => m.slice(1))
}

async function notifyAllTeamMembers(teamId: string, app: string, icon: string, title: string, message: string, link: string | null, excludeUserId?: string) {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  })
  const targets = excludeUserId ? members.filter((m) => m.userId !== excludeUserId) : members
  if (targets.length === 0) return

  await prisma.notification.createMany({
    data: targets.map((m) => ({
      userId: m.userId,
      teamId,
      app,
      icon,
      title,
      message,
      link: link ?? null,
    })),
  })
  await sendPushNotificationToTeam(teamId, title, message, link ?? undefined, excludeUserId)
}

export async function notifyProjectCreated(teamId: string, projectName: string, projectId: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Projects", "📁", "New project created", `Project "${projectName}" was created`, `/projects/${projectId}`, actorUserId)
}

export async function notifyProjectUpdated(teamId: string, projectName: string, projectId: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Projects", "📁", "Project updated", `Project "${projectName}" was updated`, `/projects/${projectId}`, actorUserId)
}

export async function notifyProjectDeleted(teamId: string, projectName: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Projects", "📁", "Project deleted", `Project "${projectName}" was deleted`, null, actorUserId)
}

export async function notifySprintCreated(teamId: string, sprintName: string, sprintId: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Sprints", "🏃", "New sprint started", `Sprint "${sprintName}" was created`, `/sprints?id=${sprintId}`, actorUserId)
}

export async function notifySprintDeleted(teamId: string, sprintName: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Sprints", "🏃", "Sprint deleted", `Sprint "${sprintName}" was deleted`, null, actorUserId)
}

export async function notifyMemberAdded(teamId: string, memberName: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Team", "👤", "New team member", `${memberName} joined the team`, `/team`, actorUserId)
}

export async function notifyMemberRemoved(teamId: string, memberName: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Team", "👤", "Member removed", `${memberName} was removed from the team`, `/team`, actorUserId)
}

export async function notifyMemberRoleChanged(teamId: string, memberName: string, newRole: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Team", "👤", "Member role changed", `${memberName}'s role changed to ${newRole}`, `/team`, actorUserId)
}

export async function notifyTeamSettingsChanged(teamId: string, actorUserId: string) {
  await notifyAllTeamMembers(teamId, "Team", "⚙️", "Team settings updated", `Team settings were updated`, `/settings`, actorUserId)
}

export async function notifyTaskMoved(teamId: string, taskId: string, taskTitle: string, movedByUser: string, fromColumn: string, toColumn: string, assigneeUserId: string | null, actorUserId?: string) {
  const link = await getProjectLink(taskId)
  const linkStr = link ?? "/projects"
  if (assigneeUserId) {
    await prisma.notification.create({
      data: {
        userId: assigneeUserId,
        teamId,
        app: "Tasks",
        icon: "📋",
        title: "Task moved",
        message: `${movedByUser} moved "${taskTitle}" from ${fromColumn} to ${toColumn}`,
        link: linkStr,
      },
    })
    await sendPushNotification(assigneeUserId, "Task moved", `${movedByUser} moved "${taskTitle}" from ${fromColumn} to ${toColumn}`, linkStr, "📋")
  } else {
    await notifyAllTeamMembers(teamId, "Tasks", "📋", "Task moved", `${movedByUser} moved "${taskTitle}" from ${fromColumn} to ${toColumn}`, link, actorUserId)
  }
}

export async function notifyMentionedUsers(teamId: string, mentionedUsernames: string[], actorName: string, taskId: string) {
  if (mentionedUsernames.length === 0) return
  const link = await getProjectLink(taskId)

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  const mentioned = members.filter((member) => {
    const name = member.user.name?.toLowerCase() ?? member.user.email?.split("@")[0] ?? ""
    return mentionedUsernames.includes(name)
  })
  if (mentioned.length === 0) return

  await prisma.notification.createMany({
    data: mentioned.map((member) => ({
      userId: member.user.id,
      teamId,
      title: "You were mentioned",
      message: `${actorName} mentioned you in a task`,
      link: link ?? `/projects`,
      read: false,
    })),
  })

  for (const member of mentioned) {
    await sendPushNotification(member.user.id, "You were mentioned", `${actorName} mentioned you in a task`, link ?? "/projects", "👤")
  }
}
