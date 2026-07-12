"use client"

export function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="absolute -left-12 top-0 flex h-10 w-10 items-center justify-center text-lg font-black transition-all hover:-translate-x-0.5"
      style={{ background: "var(--nb-yellow)", border: "3px solid var(--nb-border)", color: "var(--nb-on-accent)", boxShadow: "4px 4px 0 var(--nb-shadow)", cursor: "pointer" }}
    >
      ←
    </button>
  )
}
