import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-6 py-16 text-center"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-destructive">
        Search interrupted
      </span>
      <p className="max-w-md text-balance font-display text-lg text-foreground">
        {message}
      </p>
      <Button variant="ghost" size="sm" onClick={onRetry} className="mt-1">
        Try again
      </Button>
    </div>
  )
}
