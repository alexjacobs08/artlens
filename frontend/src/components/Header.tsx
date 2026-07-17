export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-6 py-4 sm:px-10">
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" className="text-accent">
          <path d="M1 9V1H9M21 9V1H13M1 13V21H9M21 13V21H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="11" cy="11" r="3.4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="font-display text-base font-semibold tracking-tight text-foreground">
          Art<span className="text-gradient">Lens</span>
        </span>
      </div>
    </header>
  )
}
