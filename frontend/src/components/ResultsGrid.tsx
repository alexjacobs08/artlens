import type { SearchResult } from "@/lib/api"
import { ResultCard } from "@/components/ResultCard"
import { SkeletonCard } from "@/components/SkeletonCard"

interface ResultsGridProps {
  results: SearchResult[]
}

export function ResultsGrid({ results }: ResultsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {results.map((result, i) => (
        <ResultCard key={`${result.page_url}-${i}`} result={result} index={i} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 60} />
      ))}
    </div>
  )
}
