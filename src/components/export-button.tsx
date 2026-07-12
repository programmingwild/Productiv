import Link from "next/link"

export function ExportButton({ href, label = "CSV" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black transition-all"
      style={{
        background: "var(--nb-surface)",
        border: "2px solid var(--nb-border)",
        color: "var(--nb-text)",
        textDecoration: "none",
      }}
    >
      ⬇ {label}
    </Link>
  )
}
