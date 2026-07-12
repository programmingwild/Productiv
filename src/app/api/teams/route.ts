import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateSlug } from "@/lib/utils"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const name = formData.get("name") as string
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

    const slug = generateSlug(name)

    const team = await prisma.team.create({
      data: { name, slug, subdomain: slug },
    })

    await prisma.teamMember.create({
      data: {
        role: "OWNER",
        userId: session.user.id,
        teamId: team.id,
      },
    })

    return NextResponse.redirect(new URL("/dashboard", req.url))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
