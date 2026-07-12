import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { TeamClient } from "./team-client"

export default async function TeamPage() {
  const membership = await requireTeam()

  const members = await prisma.teamMember.findMany({
    where: { teamId: membership.team.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })

  const serialized = members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    role: m.role.toLowerCase(),
    name: m.user.name ?? "Unknown",
    email: m.user.email,
    image: m.user.image,
  }))

  return (
    <TeamClient
      members={serialized}
      teamName={membership.team.name}
      teamId={membership.team.id}
      currentUserId={membership.userId}
    />
  )
}
