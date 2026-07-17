export function Header() {
  return (
    <header className="flex items-center gap-3 px-6 py-6 sm:px-10">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-brass">
        <path d="M1 9V1H9M21 9V1H13M1 13V21H9M21 13V21H13" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="11" cy="11" r="3.4" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className="font-display text-lg tracking-tight text-bone">
        Art<span className="text-brass italic">Lens</span>
      </span>
    </header>
  )
}
