import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"

export async function DELETE(req: Request, { params }: { params: Promise<{ taskId: string; depId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId, depId } = await params

    const dep = await prisma.taskDependency.findFirst({
      where: { id: depId, taskId },
      include: { task: { select: { teamId: true } } },
    })

    if (!dep || dep.task.teamId !== team.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.taskDependency.delete({ where: { id: depId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
