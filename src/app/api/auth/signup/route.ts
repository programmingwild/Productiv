import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { generateSlug } from "@/lib/utils"

export async function POST(req: Request) {
  try {
    const { name, email, password, teamName } = await req.json()

    if (!name || !email || !password || !teamName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    const slug = generateSlug(teamName)
    const existingTeam = await prisma.team.findUnique({ where: { slug } })
    if (existingTeam) {
      return NextResponse.json(
        { error: "A team with this name already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            team: {
              create: {
                name: teamName,
                slug,
                subdomain: slug,
              },
            },
          },
        },
      },
      include: {
        memberships: {
          include: { team: true },
        },
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      team: user.memberships[0].team,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
