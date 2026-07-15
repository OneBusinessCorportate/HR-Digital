export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-100" />
    </div>
  );
}
