import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardShell } from "./dashboard-shell"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const membership = await prisma.teamMember.findFirst({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          projects: { orderBy: { updatedAt: "desc" }, take: 10 },
        },
      },
    },
  })

  if (!membership) redirect("/onboarding")

  return (
    <DashboardShell team={membership.team} user={session.user}>
      {children}
    </DashboardShell>
  )
}
