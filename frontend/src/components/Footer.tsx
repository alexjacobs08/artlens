export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8 sm:px-10">
      <p className="max-w-2xl text-[11px] leading-relaxed text-muted-foreground-2">
        Artwork images and data come from the open-access programs of the{" "}
        <a
          href="https://www.artic.edu/open-access"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline decoration-muted-foreground-2 underline-offset-2 hover:text-accent"
        >
          Art Institute of Chicago
        </a>
        ,{" "}
        <a
          href="https://www.clevelandart.org/open-access"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline decoration-muted-foreground-2 underline-offset-2 hover:text-accent"
        >
          Cleveland Museum of Art
        </a>
        , and{" "}
        <a
          href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground underline decoration-muted-foreground-2 underline-offset-2 hover:text-accent"
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
