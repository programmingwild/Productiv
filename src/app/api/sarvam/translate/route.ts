import { NextResponse } from "next/server"
import { isSarvamConfigured } from "@/lib/sarvam"

export async function POST(req: Request) {
  if (!isSarvamConfigured()) {
    return NextResponse.json({ error: "Sarvam AI not configured" }, { status: 400 })
  }

  try {
    const { text, sourceLanguageCode = "en-IN", targetLanguageCode = "hi-IN" } = await req.json()

    const res = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        source_language_code: sourceLanguageCode,
        target_language_code: targetLanguageCode,
      }),
    })

    const rawText = await res.text()

    if (!res.ok) {
      return NextResponse.json({ error: `Translate API error (${res.status}): ${rawText}` }, { status: 502 })
    }

    const data = JSON.parse(rawText)
    return NextResponse.json({ translatedText: data.translated_text })
  } catch (error) {
    console.error("Translate error:", error)
    return NextResponse.json({ error: `Failed to translate: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 })
  }
}
