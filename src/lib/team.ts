import { prisma } from "./prisma"
import { headers } from "next/headers"
import { auth } from "./auth"
import { redirect } from "next/navigation"

export async function getTeamFromHeader() {
  const headersList = await headers()
  const slug = headersList.get("x-tenant-slug") ?? "main"
  return prisma.team.findUnique({ where: { slug } })
}

export async function requireTeam() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  
  const membership = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: { team: true },
  })

  if (!membership) redirect("/onboarding")
  return membership
}
