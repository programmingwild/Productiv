export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-8 max-w-5xl nb-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="nb-skeleton" style={{ width: 140, height: 28 }} />
          <div className="nb-skeleton" style={{ width: 200, height: 16 }} />
        </div>
        <div className="nb-skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="nb-card-sm p-6 text-center">
            <div className="nb-skeleton mx-auto mb-3" style={{ width: 60, height: 12 }} />
            <div className="nb-skeleton mx-auto" style={{ width: 48, height: 36 }} />
          </div>
        ))}
      </div>

      <div>
        <div className="nb-skeleton mb-4" style={{ width: 100, height: 22 }} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="nb-card p-5 nb-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="nb-skeleton shrink-0" style={{ width: 16, height: 16 }} />
                <div className="nb-skeleton flex-1" style={{ height: 14 }} />
              </div>
              <div className="nb-skeleton" style={{ width: "65%", height: 10 }} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="nb-skeleton mb-4" style={{ width: 140, height: 22 }} />
        <div className="nb-card overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-5 py-3.5 nb-fade-in-up"
              style={{ borderBottom: i < 4 ? "2px solid var(--nb-border)" : "none", animationDelay: `${i * 60}ms` }}
            >
              <div className="nb-skeleton shrink-0" style={{ width: 36, height: 36 }} />
              <div className="flex-1 space-y-1.5">
                <div className="nb-skeleton" style={{ width: "60%", height: 14 }} />
                <div className="nb-skeleton" style={{ width: "30%", height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
