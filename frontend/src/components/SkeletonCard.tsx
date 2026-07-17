export function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-raised">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-paper-hover/70 to-transparent" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 w-4/5 bg-ink-raised" />
        <div className="h-3 w-1/2 bg-ink-raised" />
        <div className="h-3 w-2/5 bg-ink-raised" />
      </div>
    </div>
  )
}
