"use client"

import { useState, useEffect, useRef } from "react"
import { useNotificationPanel } from "@/contexts/notification-panel"
import { TtsButton } from "@/components/tts-button"
import { useLanguage } from "@/contexts/language"

const emojis = ["👍", "❤️", "😂", "🎉", "🚀", "👀"]

export function NotificationPanel() {
  const { t } = useLanguage()
  const { isOpen, close, notifications, unreadCount, toggleRead, deleteNotification, markAllRead, clearAll, addReaction, handleReply } = useNotificationPanel()

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return t("now")
    if (min < 60) return t("{min}m ago", { min })
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return t("{hrs}h ago", { hrs })
    return t("{days}d ago", { days: Math.floor(hrs / 24) })
  }
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [emojiPicker, setEmojiPicker] = useState<string | null>(null)
  const replyRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (replyId && replyRef.current) replyRef.current.focus() }, [replyId])
  useEffect(() => { if (!isOpen) { setReplyId(null); setEmojiPicker(null) } }, [isOpen])

  function sendReply(id: string) {
    if (!replyText.trim()) return
    handleReply(id)
    setReplyId(null)
    setReplyText("")
  }

  return (
    <aside
      className="shrink-0 overflow-hidden transition-all duration-300"
      style={{
        width: isOpen ? 384 : 0,
        borderLeft: isOpen ? "3px solid var(--nb-border)" : "none",
        background: "var(--nb-surface)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isOpen && (
        <>
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "3px solid var(--nb-border)" }}>
            <h3 className="text-sm font-black" style={{ color: "var(--nb-text)" }}>
              {t("Notifications")}
              {unreadCount > 0 && <span className="ml-2 text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("({n} new)", { n: unreadCount })}</span>}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] font-black px-2 py-1" style={{ border: "2px solid var(--nb-border)", color: "var(--nb-text)" }}>{t("All read")}</button>}
              {notifications.length > 0 && <button onClick={clearAll} className="text-[10px] font-black px-2 py-1" style={{ border: "2px solid var(--nb-border)", color: "#e85d75" }}>{t("Clear all")}</button>}
              <button onClick={close} className="text-sm font-black" style={{ background: "none", border: "none", color: "var(--nb-text)", cursor: "pointer" }}>✕</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("All clear")} ✨</p>
                <p className="text-xs font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>{t("No notifications")}</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} style={{ background: n.read ? "var(--nb-surface)" : "var(--nb-yellow)", borderBottom: "2px solid var(--nb-border)", opacity: n.read ? 0.7 : 1 }}>
                  <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                    {!n.read && <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "#4ecdc4" }} />}
                    {n.read && <div className="mt-1.5 h-2.5 w-2.5 shrink-0" />}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-sm font-black" style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)" }}>{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black leading-tight" style={{ color: "var(--nb-text)" }}>{n.title}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: "var(--nb-text-soft)" }}>{n.message}</p>
                      <p className="text-[10px] font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>{n.app} · {timeAgo(n.createdAt)}{n.reaction && <span className="ml-1">· {n.reaction}</span>}{n.replied && !n.reaction && <span className="ml-1">· {t("Replied")}</span>}</p>
                    </div>
                    <button onClick={() => deleteNotification(n.id)} className="text-xs font-black shrink-0" style={{ color: "var(--nb-text-soft)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                  </div>
                  <div className="flex items-center gap-1 px-4 pb-3 ml-9" style={{ marginTop: -2 }}>
                    <button onClick={() => setReplyId(replyId === n.id ? null : n.id)} className="text-[10px] font-black px-2 py-1 transition-all" style={{ background: replyId === n.id ? "var(--nb-border)" : "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: replyId === n.id ? "white" : "var(--nb-text)" }}>💬 {t("Reply")}</button>
                    <TtsButton text={`${n.title}: ${n.message}`} />
                    <button onClick={() => toggleRead(n.id)} className="text-[10px] font-black px-2 py-1 transition-all" style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: "var(--nb-text)" }}>{n.read ? "📬 " + t("Unread") : "📩 " + t("Read")}</button>
                    <button onClick={() => setEmojiPicker(emojiPicker === n.id ? null : n.id)} className="text-[10px] font-black px-2 py-1 transition-all" style={{ background: emojiPicker === n.id ? "var(--nb-border)" : "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: emojiPicker === n.id ? "white" : "var(--nb-text)" }}>😊 {t("React")}</button>
                    {emojiPicker === n.id && (
                      <div className="flex gap-1 px-2 py-1" style={{ background: "var(--nb-surface)", border: "2px solid var(--nb-border)", boxShadow: "3px 3px 0 var(--nb-shadow)", position: "absolute", marginTop: 32, zIndex: 60 }}>
                        {emojis.map((emoji) => (
                          <button key={emoji} onClick={() => { addReaction(n.id, emoji); setEmojiPicker(null) }} className="text-lg hover:scale-125 transition-transform" style={{ cursor: "pointer", background: "none", border: "none" }}>{emoji}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  {replyId === n.id && (
                    <div className="px-4 pb-3 ml-9">
                      <div className="flex gap-2">
                        <input ref={replyRef} type="text" placeholder={t("Write a reply...")} value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(n.id) }} className="nb-input flex-1 px-2 py-1.5 text-xs" />
                        <button onClick={() => sendReply(n.id)} disabled={!replyText.trim()} className="nb-btn-accent px-3 py-1.5 text-[10px] font-black">{t("Send")}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  )
}
