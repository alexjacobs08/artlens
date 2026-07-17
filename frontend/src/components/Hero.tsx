import { useEffect, useState } from "react"

import { Dropzone } from "@/components/Dropzone"
import { fetchIndexedCount } from "@/lib/api"

interface HeroProps {
  onSelect: (file: File) => void
}

export function Hero({ onSelect }: HeroProps) {
  const [indexed, setIndexed] = useState<number | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchIndexedCount().then((n) => {
      if (!cancelled) setIndexed(n)
    })
    return () => {
      cancelled = true
    }
  }, [])
  const corpus =
    indexed && indexed >= 1000
      ? `${Math.floor(indexed / 1000).toLocaleString()},000+ public-domain works`
      : "thousands of public-domain works"
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 px-6 py-16 text-center sm:py-24">
      <div className="space-y-5 animate-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted-2">
          Reverse image search · Open-access art
        </p>
        <h1 className="font-display text-5xl leading-[1.05] text-bone sm:text-6xl">
          Art<span className="text-brass italic">Lens</span>
        </h1>
        <p className="mx-auto max-w-md text-balance text-base leading-relaxed text-muted">
          Photograph a painting, print, or object and find its kindred works
          among <span className="text-bone">{corpus}</span> from the
          open-access collections of great museums.
        </p>
      </div>

      <div
        className="w-full animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <Dropzone onSelect={onSelect} />
      </div>
    </div>
  )
}
