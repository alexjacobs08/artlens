export function Footer() {
  return (
    <footer className="border-t border-rule/60 px-6 py-8 sm:px-10">
      <p className="max-w-2xl font-mono text-[11px] leading-relaxed text-muted-2">
        Artwork images and data come from the open-access programs of the{" "}
        <a
          href="https://www.artic.edu/open-access"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline decoration-muted-2 underline-offset-2 hover:text-brass"
        >
          Art Institute of Chicago
        </a>
        ,{" "}
        <a
          href="https://www.clevelandart.org/open-access"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline decoration-muted-2 underline-offset-2 hover:text-brass"
        >
          Cleveland Museum of Art
        </a>
        , and{" "}
        <a
          href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted underline decoration-muted-2 underline-offset-2 hover:text-brass"
        >
          The Met
        </a>{" "}
        and are released under CC0 — free of known copyright restrictions.
        Similarity scores are computed by ArtLens and are not a curatorial
        judgment.
      </p>
    </footer>
  )
}
