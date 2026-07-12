import { NextResponse } from "next/server"
import { isSarvamConfigured } from "@/lib/sarvam"

export async function POST(req: Request) {
  if (!isSarvamConfigured()) {
    return NextResponse.json({ error: "Sarvam AI not configured" }, { status: 400 })
  }

  try {
    const { messages } = await req.json()

    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "sarvam-105b", messages }),
    })

    const rawText = await res.text()

    if (!res.ok) {
      return NextResponse.json({ error: `Sarvam API error (${res.status}): ${rawText}` }, { status: 502 })
    }

    const data = JSON.parse(rawText)
    return NextResponse.json({ content: data.choices?.[0]?.message?.content ?? "" })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 })
  }
}
