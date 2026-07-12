import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireTeam } from "@/lib/team"
import { DashboardContent } from "./dashboard-content"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { team } = await requireTeam()

  const projects = await prisma.project.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  })

  const members = await prisma.teamMember.findMany({
    where: { teamId: team.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })

  const data = JSON.parse(JSON.stringify({
    team: { id: team.id, name: team.name, planTier: team.planTier },
    projects,
    members: members.map((m) => ({ id: m.user.id, role: m.role, name: m.user.name, email: m.user.email })),
    currentUser: { id: session.user.id },
  }))

  return <DashboardContent data={data} />
}
