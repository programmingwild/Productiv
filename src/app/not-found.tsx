import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ backgroundColor: "var(--nb-bg)" }}>
      <div className="nb-card p-8 text-center max-w-sm">
        <div className="text-6xl font-black mb-2" style={{ color: "var(--nb-text)" }}>?</div>
        <h1 className="text-3xl font-black" style={{ color: "var(--nb-text)" }}>404</h1>
        <p className="mt-1 text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>This page wandered off the board</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1 text-sm font-black"
          style={{ color: "var(--nb-text)" }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
