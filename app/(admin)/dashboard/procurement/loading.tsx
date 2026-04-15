export default function ProcurementLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
        <div className="h-10 w-36 rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-full max-w-sm rounded-md bg-muted" />
        <div className="h-10 w-32 rounded-md bg-muted" />
      </div>
      <div className="rounded-lg border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-0">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="ml-auto h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
