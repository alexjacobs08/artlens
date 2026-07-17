export function Footer() {
  return (
    <footer className="border-t border-rule/60 px-6 py-8 sm:px-10">
      <p className="max-w-2xl font-mono text-[11px] leading-relaxed text-muted-2">
        Artwork images and data are provided by the{" "}
        <a
          href="https://www.artic.edu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline decoration-muted-2 underline-offset-2 hover:text-brass"
        >
          Art Institute of Chicago
        </a>{" "}
        and released under CC0 — free of known copyright restrictions.
        Similarity scores are computed by ArtLens and are not a curatorial
        judgment.
      </p>
    </footer>
  )
}
