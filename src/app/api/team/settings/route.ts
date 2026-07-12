import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { generateSlug } from "@/lib/utils"
import { logActivity, notifyTeamSettingsChanged } from "@/lib/activity"

export async function PATCH(req: Request) {
  try {
    const membership = await requireTeam()

    const currentMember = await prisma.teamMember.findUnique({ where: { id: membership.id } })
    if (!currentMember || currentMember.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can change workspace settings" }, { status: 403 })
    }

    const { name, slug } = await req.json()

    const data: Record<string, string> = {}
    if (name) data.name = name
    if (slug) {
      const newSlug = generateSlug(slug)
      const existing = await prisma.team.findFirst({ where: { slug: newSlug, id: { not: membership.team.id } } })
      if (existing) return NextResponse.json({ error: "Slug already taken" }, { status: 409 })
      data.slug = newSlug
      data.subdomain = newSlug
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const updated = await prisma.team.update({
      where: { id: membership.team.id },
      data,
    })

    await logActivity({ teamId: membership.team.id, action: "team_settings_updated", metadata: { changes: Object.keys(data) } })
    await notifyTeamSettingsChanged(membership.team.id, membership.userId)
    return NextResponse.json({ id: updated.id, name: updated.name, slug: updated.slug })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
