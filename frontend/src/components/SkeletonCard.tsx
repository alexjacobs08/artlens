const HEIGHTS = ["aspect-[4/5]", "aspect-[3/4]", "aspect-square", "aspect-[5/6]"]

export function SkeletonCard({ delay = 0, index = 0 }: { delay?: number; index?: number }) {
  return (
    <div
      className="mb-6 break-inside-avoid animate-fade-in rounded-xl border border-border bg-card/40 p-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`relative ${HEIGHTS[index % HEIGHTS.length]} overflow-hidden rounded-lg bg-background-raised`}>
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-card-hover/70 to-transparent" />
      </div>
      <div className="mt-3 space-y-2 px-1 pb-1">
        <div className="h-4 w-4/5 rounded bg-background-raised" />
        <div className="h-3 w-1/2 rounded bg-background-raised" />
        <div className="h-3 w-2/5 rounded bg-background-raised" />
      </div>
    </div>
  )
}
