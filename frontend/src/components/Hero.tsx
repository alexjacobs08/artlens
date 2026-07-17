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
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-[-10rem] h-[24rem] w-[40rem] -translate-x-1/2 rounded-full bg-foreground/[0.04] blur-[110px]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-10 px-6 py-20 text-center sm:py-28">
        <div className="space-y-6 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Reverse image search · Open-access art
          </span>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Art<span className="text-gradient">Lens</span>
          </h1>
          <p className="mx-auto max-w-md text-balance text-base leading-relaxed text-muted-foreground">
            Upload a photo of a painting, print, or object and find its
            kindred works among{" "}
            <span className="text-foreground">{corpus}</span> from the
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
    </div>
  )
}
