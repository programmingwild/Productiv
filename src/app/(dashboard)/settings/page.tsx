import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { SettingsClient } from "./settings-client"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const membership = await requireTeam()
  const team = await prisma.team.findUnique({
    where: { id: membership.team.id },
  })
  if (!team) return null

  const isOwner = membership.role === "OWNER"

  return (
    <SettingsClient
      team={{
        id: team.id,
        name: team.name,
        slug: team.slug,
        planTier: team.planTier,
        subscriptionStatus: team.subscriptionStatus,
        razorpayCustomerId: team.razorpayCustomerId,
      }}
      isOwner={isOwner}
    />
  )
}
