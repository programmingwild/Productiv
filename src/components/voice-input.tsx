"use client"

import { useState, useRef, useCallback } from "react"
import { useLanguage } from "@/contexts/language"

interface Props {
  onTranscribed: (text: string) => void
  languageCode?: string
}

export function VoiceInput({ onTranscribed, languageCode = "hi-IN" }: Props) {
  const { t } = useLanguage()
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorder.current = recorder
      chunks.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.onstop = async () => {
        setProcessing(true)
        const blob = new Blob(chunks.current, { type: "audio/wav" })
        stream.getTracks().forEach((t) => t.stop())

        try {
          const formData = new FormData()
          formData.append("audio", blob, "recording.wav")
          formData.append("language_code", languageCode)

          const res = await fetch("/api/sarvam/stt", {
            method: "POST",
            body: formData,
          })
          const data = await res.json()
          if (data.text) onTranscribed(data.text)
        } catch {
          console.error("STT failed")
        }
        setProcessing(false)
      }

      recorder.start()
      setRecording(true)
    } catch {
      console.error("Microphone access denied")
    }
  }, [languageCode, onTranscribed])

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop()
      setRecording(false)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={recording ? stopRecording : startRecording}
      disabled={processing}
      title={recording ? t("Stop recording") : t("Voice input")}
      style={{
        background: recording ? "#e85d75" : "var(--nb-surface-soft)",
        border: "2px solid var(--nb-border)",
        color: recording ? "white" : "var(--nb-text)",
        cursor: "pointer",
        padding: "4px 8px",
        fontSize: 14,
        fontWeight: 900,
      }}
    >
      {processing ? "⌛" : recording ? "⏹" : "🎤"}
    </button>
  )
}
