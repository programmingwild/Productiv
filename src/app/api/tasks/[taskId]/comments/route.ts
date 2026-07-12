import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { auth } from "@/lib/auth"
import { logActivity, extractMentions, notifyMentionedUsers, notifyTaskComment } from "@/lib/activity"

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId } = await params

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId: team.id },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const session = await auth()
    const { taskId } = await params
    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, teamId: team.id },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: session!.user!.id!,
        content,
      },
      include: { user: { select: { id: true, name: true, image: true } } },
    })

    await logActivity({
      teamId: team.id,
      taskId,
      action: "comment_added",
      metadata: { commentId: comment.id },
    })

    const mentions = extractMentions(content)
    if (mentions.length > 0) {
      await notifyMentionedUsers(
        team.id,
        mentions,
        session?.user?.name ?? "Someone",
        taskId
      )
    }

    if (task.assigneeId && task.assigneeId !== session?.user?.id) {
      await notifyTaskComment(
        team.id,
        taskId,
        task.title,
        session?.user?.name ?? "Someone",
        content.slice(0, 60),
        task.assigneeId,
        session!.user!.id!
      )
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId } = await params
    const url = new URL(req.url)
    const commentId = url.searchParams.get("commentId")

    if (!commentId) return NextResponse.json({ error: "commentId required" }, { status: 400 })

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, taskId },
    })
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.comment.delete({ where: { id: commentId } })
    await logActivity({ teamId: team.id, taskId, action: "comment_deleted", metadata: { commentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
