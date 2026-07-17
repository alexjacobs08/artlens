import { useState } from "react"

import type { SearchResult } from "@/lib/api"
import { ViewfinderFrame } from "@/components/ViewfinderFrame"

interface ResultCardProps {
  result: SearchResult
  index: number
}

export function ResultCard({ result, index }: ResultCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [artistName, ...artistRest] = result.artist
    ? result.artist.split("\n")
    : ["Unknown maker"]
  const artistDetail = artistRest.join(", ").trim()
  const pct = Math.round(result.score * 100)

  return (
    <a
      href={result.page_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group animate-fade-up block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-raised">
        {imageFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-muted-2">
              <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 7.5v4M11 14.2v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-2">
              Image unavailable
            </p>
          </div>
        ) : (
          <img
            src={result.thumbnail_url}
            alt={`${result.title} by ${artistName}`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <ViewfinderFrame
          size={20}
          thickness={1.5}
          colorClassName="stroke-brass-bright"
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        <span className="absolute right-2.5 top-2.5 border border-brass/50 bg-ink/85 px-2 py-1 font-mono text-[11px] tracking-wide text-brass-bright backdrop-blur-sm">
          {pct}%
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-2 font-display text-base leading-snug text-bone">
          {result.title || "Untitled"}
        </h3>
        <p className="truncate text-sm text-muted">{artistName}</p>
        <div className="flex items-baseline justify-between gap-2 pt-0.5">
          {artistDetail && (
            <p className="truncate font-mono text-[11px] text-muted-2">
              {artistDetail}
            </p>
          )}
          {result.date && (
            <p className="shrink-0 font-mono text-[11px] text-muted-2">
              {result.date}
            </p>
          )}
        </div>
        {result.source && (
          <p className="truncate pt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-2">
            {result.source}
          </p>
        )}
      </div>
    </a>
  )
}
