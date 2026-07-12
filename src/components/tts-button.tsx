"use client"

import { useState, useCallback } from "react"
import { useLanguage } from "@/contexts/language"

interface Props {
  text: string
  languageCode?: string
  size?: "sm" | "md"
}

export function TtsButton({ text, languageCode = "hi-IN", size = "sm" }: Props) {
  const { t } = useLanguage()
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)

  const play = useCallback(async () => {
    if (playing || !text.trim()) return
    setPlaying(true)
    setError(false)

    try {
      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 500), languageCode }),
      })
      const data = await res.json()
      if (data.audios?.[0]) {
        const audio = new Audio(`data:audio/wav;base64,${data.audios[0]}`)
        audio.onended = () => setPlaying(false)
        audio.play()
      } else {
        setError(true)
        setPlaying(false)
      }
    } catch {
      setError(true)
      setPlaying(false)
    }
  }, [text, languageCode, playing])

  const sz = size === "md" ? { width: 28, height: 28, fontSize: 13 } : { width: 22, height: 22, fontSize: 10 }

  return (
    <button
      type="button"
      onClick={play}
      disabled={playing}
      title={error ? t("TTS unavailable") : playing ? t("Playing...") : t("Read aloud")}
      style={{
        ...sz,
        background: error ? "#e85d75" : playing ? "#4ecdc4" : "var(--nb-surface-soft)",
        border: "2px solid var(--nb-border)",
        color: playing ? "white" : "var(--nb-text)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {error ? "⚠" : playing ? "▶" : "🔊"}
    </button>
  )
}
