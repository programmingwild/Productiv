import { NextResponse } from "next/server"
import { isSarvamConfigured } from "@/lib/sarvam"

export async function POST(req: Request) {
  if (!isSarvamConfigured()) {
    return NextResponse.json({ error: "Sarvam AI not configured" }, { status: 400 })
  }

  try {
    const formData = await req.formData()
    const audio = formData.get("audio") as Blob

    const apiForm = new FormData()
    apiForm.append("file", audio, "audio.wav")
    apiForm.append("model", "saaras:v3")
    apiForm.append("mode", "transcribe")

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": process.env.SARVAM_API_KEY ?? "" },
      body: apiForm,
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Sarvam API error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ text: data.transcript ?? data.text ?? "" })
  } catch (error) {
    console.error("STT error:", error)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}
