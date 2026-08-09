export default function DashboardLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
      <div className="h-16 animate-pulse rounded-xl border border-border bg-surface" />
      <div>
        <div className="mb-3 h-6 w-32 animate-pulse rounded bg-surface" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </main>
  );
}
