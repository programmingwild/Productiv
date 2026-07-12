import { auth } from "./auth"
import { prisma } from "./prisma"
import { headers } from "next/headers"

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

export async function getCurrentTeam() {
  const headersList = await headers()
  const slug = headersList.get("x-tenant-slug") ?? "main"

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  })

  return team
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}
