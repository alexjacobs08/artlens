import { useCallback, useEffect, useRef, useState } from "react"

import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Hero } from "@/components/Hero"
import { QueryPanel } from "@/components/QueryPanel"
import { ResultsGrid, SkeletonGrid } from "@/components/ResultsGrid"
import { ErrorState } from "@/components/ErrorState"
import { EmptyResults } from "@/components/EmptyResults"
import { BlendSlider } from "@/components/BlendSlider"
import { fetchHealth, searchByImage, SearchError } from "@/lib/api"
import type { SearchResult } from "@/lib/api"

type Status = "idle" | "loading" | "success" | "error"

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [results, setResults] = useState<SearchResult[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const [alpha, setAlpha] = useState(0.5)
  const [blendAvailable, setBlendAvailable] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const alphaRef = useRef(alpha)
  alphaRef.current = alpha
  const blendDebounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetchHealth().then((h) => {
      if (!cancelled) setBlendAvailable(h.blend)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const runSearch = useCallback(async (target: File) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus("loading")
    setErrorMessage("")
    try {
      const found = await searchByImage(target, 8, controller.signal, alphaRef.current)
      if (controller.signal.aborted) return
      setResults(found)
      setStatus("success")
    } catch (err) {
      if (controller.signal.aborted) return
      const message =
        err instanceof SearchError
          ? err.message
          : "Something went wrong while searching. Please try again."
      setErrorMessage(message)
      setStatus("error")
    }
  }, [])

  const handleSelect = useCallback(
    (selected: File) => {
      setFile(selected)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(selected)
      })
      void runSearch(selected)
    },
    [runSearch],
  )

  const handleReplace = useCallback(() => {
    abortRef.current?.abort()
    setFile(null)
    setResults([])
    setStatus("idle")
    setErrorMessage("")
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const handleRetry = useCallback(() => {
    if (file) void runSearch(file)
  }, [file, runSearch])

  const handleAlphaChange = useCallback(
    (next: number) => {
      setAlpha(next)
      window.clearTimeout(blendDebounceRef.current)
      blendDebounceRef.current = window.setTimeout(() => {
        if (file) void runSearch(file)
      }, 350)
    },
    [file, runSearch],
  )

  const previewUrlRef = useRef(previewUrl)
  previewUrlRef.current = previewUrl

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-ink bg-noise">
      <Header />

      <main className="flex-1">
        {!file || !previewUrl ? (
          <Hero onSelect={handleSelect} />
        ) : (
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10">
            <QueryPanel
              imageUrl={previewUrl}
              fileName={file.name}
              status={status === "idle" ? "loading" : status}
              resultCount={results.length}
              onReplace={handleReplace}
            />

            {blendAvailable && (status === "success" || status === "loading") && (
              <BlendSlider alpha={alpha} onChange={handleAlphaChange} />
            )}

            {status === "loading" && <SkeletonGrid />}

            {status === "error" && (
              <ErrorState message={errorMessage} onRetry={handleRetry} />
            )}

            {status === "success" &&
              (results.length > 0 ? (
                <ResultsGrid results={results} />
              ) : (
                <EmptyResults />
              ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default App
