export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--nb-bg)" }}>
      <div className="text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center text-2xl font-black nb-pulse-slow"
          style={{ background: "var(--nb-yellow)", border: "3px solid var(--nb-border)", color: "var(--nb-text)" }}
        >
          P
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 w-3"
              style={{
                background: "var(--nb-border)",
                animation: `fadeIn 0.5s ease ${i * 0.2}s infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
