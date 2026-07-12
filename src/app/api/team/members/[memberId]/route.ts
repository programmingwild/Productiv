import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity, notifyMemberRoleChanged, notifyMemberRemoved } from "@/lib/activity"

export async function PATCH(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const membership = await requireTeam()
    const { role } = await req.json()

    const currentMember = await prisma.teamMember.findUnique({ where: { id: membership.id } })
    if (!currentMember || currentMember.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can change roles" }, { status: 403 })
    }

    const target = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId: membership.team.id },
      include: { user: { select: { name: true } } },
    })
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })
    if (target.role === "OWNER") return NextResponse.json({ error: "Cannot change owner role" }, { status: 400 })

    await prisma.teamMember.update({ where: { id: memberId }, data: { role } })

    await logActivity({ teamId: membership.team.id, action: "member_role_changed", metadata: { memberId, newRole: role } })
    await notifyMemberRoleChanged(membership.team.id, target.user.name ?? "Member", role.toLowerCase(), membership.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const membership = await requireTeam()

    const currentMember = await prisma.teamMember.findUnique({ where: { id: membership.id } })
    if (!currentMember || currentMember.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 })
    }

    const target = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId: membership.team.id },
      include: { user: { select: { name: true } } },
    })
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })
    if (target.role === "OWNER") return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 })

    await prisma.teamMember.delete({ where: { id: memberId } })

    await logActivity({ teamId: membership.team.id, action: "member_removed", metadata: { memberId } })
    await notifyMemberRemoved(membership.team.id, target.user.name ?? "Member", membership.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
