import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 border border-crimson/30 bg-crimson/[0.06] px-6 py-16 text-center"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-crimson">
        Search interrupted
      </span>
      <p className="max-w-md text-balance font-display text-lg text-bone">
        {message}
      </p>
      <Button variant="ghost" size="sm" onClick={onRetry} className="mt-1">
        Try again
      </Button>
    </div>
  )
}
