import { NextResponse } from "next/server"
import { isSarvamConfigured } from "@/lib/sarvam"

export async function POST(req: Request) {
  if (!isSarvamConfigured()) {
    return NextResponse.json({ error: "Sarvam AI not configured" }, { status: 400 })
  }

  try {
    const { text, languageCode = "hi-IN", speaker = "neha" } = await req.json()

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        target_language_code: languageCode,
        speaker,
        model: "bulbul:v3",
      }),
    })

    const rawText = await res.text()

    if (!res.ok) {
      return NextResponse.json({ error: `TTS API error (${res.status}): ${rawText}` }, { status: 502 })
    }

    const data = JSON.parse(rawText)
    return NextResponse.json({ audios: data.audios, format: "wav" })
  } catch (error) {
    console.error("TTS error:", error)
    return NextResponse.json({ error: `Failed to generate speech: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 })
  }
}
