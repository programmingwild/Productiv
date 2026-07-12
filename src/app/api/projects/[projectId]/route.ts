import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity, notifyProjectUpdated, notifyProjectDeleted } from "@/lib/activity"

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { projectId } = await params

    const project = await prisma.project.findFirst({
      where: { id: projectId, teamId: team.id },
      include: {
        boards: {
          include: {
            columns: {
              include: {
                tasks: {
                  include: {
                    assignee: { select: { id: true, name: true, image: true } },
                    taskDependencies: {
                      include: { dependsOnTask: { select: { id: true, title: true } } },
                    },
                    blockingDependents: {
                      include: { task: { select: { id: true, title: true } } },
                    },
                  },
                  orderBy: { position: "asc" },
                },
              },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    })

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const membership = await requireTeam()
    const { projectId } = await params
    const body = await req.json()

    const project = await prisma.project.updateMany({
      where: { id: projectId, teamId: membership.team.id },
      data: body,
    })

    await logActivity({ teamId: membership.team.id, action: "project_updated", metadata: { projectId, changes: Object.keys(body) } })
    await notifyProjectUpdated(membership.team.id, body.name ?? "Project", projectId, membership.userId)
    return NextResponse.json(project)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const membership = await requireTeam()
    const { projectId } = await params

    const proj = await prisma.project.findFirst({ where: { id: projectId, teamId: membership.team.id }, select: { name: true } })
    await prisma.project.deleteMany({ where: { id: projectId, teamId: membership.team.id } })
    await logActivity({ teamId: membership.team.id, action: "project_deleted", metadata: { projectId, name: proj?.name } })
    await notifyProjectDeleted(membership.team.id, proj?.name ?? "Project", membership.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
