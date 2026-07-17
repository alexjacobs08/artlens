export interface SearchResult {
  score: number
  title: string
  artist: string
  date: string
  page_url: string
  thumbnail_url: string
  source?: string
}

export async function fetchIndexedCount(): Promise<number | null> {
  try {
    const r = await fetch(`${API_URL}/healthz`)
    if (!r.ok) return null
    const body = (await r.json()) as { indexed?: number }
    return typeof body.indexed === "number" ? body.indexed : null
  } catch {
    return null
  }
}

interface SearchResponse {
  results: SearchResult[]
}

interface ErrorResponse {
  detail?: string
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export class SearchError extends Error {}

export async function searchByImage(
  file: File,
  k = 8,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const form = new FormData()
  form.append("file", file)
  form.append("k", String(k))

  let response: Response
  try {
    response = await fetch(`${API_URL}/search`, {
      method: "POST",
      body: form,
      signal,
    })
  } catch {
    throw new SearchError(
      "Couldn't reach the ArtLens server. Check your connection and try again.",
    )
  }

  if (!response.ok) {
    let detail = `The server returned an error (${response.status}).`
    try {
      const body = (await response.json()) as ErrorResponse
      if (body.detail) detail = body.detail
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new SearchError(detail)
  }

  const data = (await response.json()) as SearchResponse
  return data.results
}
