export default function DashboardLoading() {
  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`nb-skeleton ${className}`} />
  )

  return (
    <div className="p-6 space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="nb-card-sm p-6">
            <Skeleton className="h-3 w-20 mx-auto mb-3" />
            <Skeleton className="h-10 w-16 mx-auto" />
          </div>
        ))}
      </div>

      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="nb-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-4 w-4 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="nb-card overflow-hidden divide-y" style={{ borderColor: "var(--nb-border)" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3.5">
              <Skeleton className="h-9 w-9 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
