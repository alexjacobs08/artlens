import type { SearchResult } from "@/lib/api"
import { ResultCard } from "@/components/ResultCard"
import { SkeletonCard } from "@/components/SkeletonCard"

interface ResultsGridProps {
  results: SearchResult[]
}

// CSS-columns masonry: artworks keep their natural aspect ratio instead of
// being cropped into uniform tiles.
const COLUMNS = "columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4"

export function ResultsGrid({ results }: ResultsGridProps) {
  return (
    <div className={COLUMNS}>
      {results.map((result, i) => (
        <ResultCard key={`${result.page_url}-${i}`} result={result} index={i} />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className={COLUMNS}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 60} index={i} />
      ))}
    </div>
  )
}
