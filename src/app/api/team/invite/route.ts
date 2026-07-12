import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { logActivity, notifyMemberAdded } from "@/lib/activity"

export async function POST(req: Request) {
  try {
    const membership = await requireTeam()

    const currentMember = await prisma.teamMember.findUnique({ where: { id: membership.id } })
    if (!currentMember || currentMember.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can invite members" }, { status: 403 })
    }

    const { email, role = "MEMBER" } = await req.json()
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (!existingUser) {
      return NextResponse.json({ error: "No user found with this email. They need to sign up first." }, { status: 404 })
    }

    const existingMember = await prisma.teamMember.findFirst({
      where: { teamId: membership.team.id, userId: existingUser.id },
    })
    if (existingMember) {
      return NextResponse.json({ error: "User is already a team member" }, { status: 409 })
    }

    const newMember = await prisma.teamMember.create({
      data: { teamId: membership.team.id, userId: existingUser.id, role },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    })

    await logActivity({ teamId: membership.team.id, action: "member_invited", metadata: { email, userId: existingUser.id } })
    await notifyMemberAdded(membership.team.id, existingUser.name ?? "New member", membership.userId)
    return NextResponse.json({
      id: newMember.id,
      userId: newMember.user.id,
      role: newMember.role.toLowerCase(),
      name: newMember.user.name ?? "Unknown",
      email: newMember.user.email,
      image: newMember.user.image,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
