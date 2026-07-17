import { useEffect, useState } from "react"

import { fetchHealth } from "@/lib/api"

const STEPS = [
  {
    title: "Your image becomes a vector",
    body: "The moment you drop an image, the server runs it through OpenCLIP ViT-L/14 — a vision model trained on two billion image–text pairs — and distills it into a 768-dimensional embedding: a numerical fingerprint of what the image depicts.",
    tag: "01 · Embed",
  },
  {
    title: "Every artwork is already there",
    body: "Each work in the collection was embedded offline with the exact same model, so your query and the entire corpus live in one shared vector space. Nothing is fetched or re-processed at search time.",
    tag: "02 · Index",
  },
  {
    title: "Similarity is just geometry",
    body: "Ranking is a single cosine-similarity pass — one matrix multiplication against every artwork at once. At this scale, exact brute-force search takes under a millisecond; no approximate index needed.",
    tag: "03 · Rank",
  },
]

export function HowItWorks() {
  const [indexed, setIndexed] = useState<number | null>(null)
  const [blend, setBlend] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchHealth().then((h) => {
      if (!cancelled) {
        setIndexed(h.indexed)
        setBlend(h.blend)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">
        How it works
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Reverse image search, from pixels to paintings
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
        ArtLens finds visually similar artworks the same way modern AI search
        works everywhere: by turning images into vectors and measuring
        distances between them.
      </p>

      <div className="mt-12 space-y-6">
        {STEPS.map((step) => (
          <div
            key={step.tag}
            className="rounded-xl border border-border bg-card/40 p-6"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              {step.tag}
            </p>
            <h2 className="mt-2 font-display text-lg font-medium text-foreground">
              {step.title}
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card/40 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Subject vs. look
        </p>
        <h2 className="mt-2 font-display text-lg font-medium text-foreground">
          Two models, one slider
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          CLIP understands what an image is <em>about</em> — it was trained
          against language, so it excels at subject matter. DINOv2, trained on
          images alone, captures how an image <em>looks</em>: composition,
          texture, palette. ArtLens keeps both embeddings for every artwork and
          blends the two similarity scores at query time
          {blend
            ? " — that's the Subject ↔ Look slider above your results."
            : ". The Subject ↔ Look slider appears once the visual index finishes building."}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card/40 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          The collection
        </p>
        <h2 className="mt-2 font-display text-lg font-medium text-foreground">
          {indexed ? `${indexed.toLocaleString()} works and growing` : "Open-access art, and only open-access art"}
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Everything searchable here is a public-domain (CC0) work from the
          open-access programs of the Art Institute of Chicago, the Cleveland
          Museum of Art, and The Metropolitan Museum of Art. Images are served
          straight from the museums' own servers, and every result links back
          to its official collection page.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card/40 p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Privacy
        </p>
        <h2 className="mt-2 font-display text-lg font-medium text-foreground">
          Your images are never stored
        </h2>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Uploads are embedded in memory, compared, and discarded. No query
          images are written to disk, logged, or used for anything beyond
          answering your search.
        </p>
      </div>

      <div className="mt-10 flex items-center gap-4">
        <a
          href="#"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Try a search
        </a>
        <a
          href="https://github.com/alexjacobs08/artlens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground underline decoration-muted-foreground-2 underline-offset-2 transition-colors hover:text-foreground"
        >
          Read the code on GitHub
        </a>
      </div>
    </div>
  )
}
