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
      className="group mb-6 block break-inside-avoid animate-fade-up rounded-xl border border-border bg-card/40 p-2 transition-colors duration-200 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="relative overflow-hidden rounded-lg bg-background-raised">
        {imageFailed ? (
          <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-muted-foreground-2">
              <circle cx="11" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 7.5v4M11 14.2v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground-2">
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
            className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <ViewfinderFrame
          size={20}
          thickness={1.5}
          colorClassName="stroke-accent"
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        <span className="absolute right-2 top-2 rounded-full border border-accent/30 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-accent-hover backdrop-blur-sm">
          {pct}%
        </span>
      </div>

      <div className="mt-3 space-y-1 px-1 pb-1">
        <h3 className="line-clamp-2 font-display text-base font-medium leading-snug text-foreground">
          {result.title || "Untitled"}
        </h3>
        <p className="truncate text-sm text-muted-foreground">{artistName}</p>
        <div className="flex items-baseline justify-between gap-2 pt-0.5">
          {artistDetail && (
            <p className="truncate font-mono text-[11px] text-muted-foreground-2">
              {artistDetail}
            </p>
          )}
          {result.date && (
            <p className="shrink-0 font-mono text-[11px] text-muted-foreground-2">
              {result.date}
            </p>
          )}
        </div>
        {result.source && (
          <p className="truncate pt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground-2">
            {result.source}
          </p>
        )}
      </div>
    </a>
  )
}
