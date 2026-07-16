import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { uploadFile } from "@/lib/storage"
import { logActivity } from "@/lib/activity"
import { auth } from "@/lib/auth"

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { team } = await requireTeam()
    const { taskId } = await params

    const task = await prisma.task.findFirst({ where: { id: taskId, teamId: team.id } })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(attachments)
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

    const task = await prisma.task.findFirst({ where: { id: taskId, teamId: team.id } })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    const result = await uploadFile(file, team.id, taskId)
    if (!result) return NextResponse.json({ error: "Upload failed" }, { status: 500 })

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        name: result.name,
        url: result.url,
        size: result.size,
        mimeType: result.mimeType,
        uploadedBy: session!.user!.id!,
      },
    })

    await logActivity({
      teamId: team.id,
      taskId,
      action: "file_uploaded",
      metadata: { fileName: result.name, fileSize: result.size },
    })

    return NextResponse.json(attachment, { status: 201 })
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
    const attachmentId = url.searchParams.get("attachmentId")

    if (!attachmentId) return NextResponse.json({ error: "attachmentId required" }, { status: 400 })

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, taskId },
    })
    if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.attachment.delete({ where: { id: attachmentId } })
    await logActivity({ teamId: team.id, taskId, action: "file_deleted", metadata: { fileName: attachment.name } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
