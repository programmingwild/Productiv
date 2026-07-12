import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { supabaseAdmin, supabase } from "@/lib/supabase"
import { ensureAvatarBucket } from "@/lib/storage"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const client = supabaseAdmin ?? supabase
    if (!client) return NextResponse.json({ error: "Storage not configured" }, { status: 500 })

    await ensureAvatarBucket()

    const formData = await req.formData()
    const file = formData.get("avatar") as File
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "jpg"
    const path = `avatars/${session.user.id}/${crypto.randomUUID()}.${ext}`

    const { data, error } = await client.storage
      .from("avatars")
      .upload(path, file, { upsert: true })

    if (error || !data) {
      return NextResponse.json({ error: `Upload failed: ${error?.message ?? "Unknown error"}` }, { status: 500 })
    }

    const { data: urlData } = client.storage.from("avatars").getPublicUrl(data.path)
    const imageUrl = urlData.publicUrl

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl },
    })

    return NextResponse.json({ image: imageUrl })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
