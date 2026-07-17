import { cn } from "@/lib/utils"

interface ViewfinderFrameProps {
  className?: string
  /** Tailwind color token for the bracket strokes, e.g. "stroke-accent" */
  colorClassName?: string
  /** Thickness in px */
  thickness?: number
  /** Inset of the bracket corners from the frame edge, in px */
  size?: number
}

/**
 * The recurring "lens" motif: four viewfinder corner brackets.
 * Used on the drop zone, the query preview, and (on hover/focus) result cards —
 * a visual through-line for a *reverse image* search product.
 */
export function ViewfinderFrame({
  className,
  colorClassName = "stroke-accent",
  thickness = 2,
  size = 22,
}: ViewfinderFrameProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      {(
        [
          "top-0 left-0",
          "top-0 right-0 -scale-x-100",
          "bottom-0 left-0 -scale-y-100",
          "bottom-0 right-0 -scale-x-100 -scale-y-100",
        ] as const
      ).map((pos) => (
        <svg
          key={pos}
          width={size}
          height={size}
          viewBox="0 0 22 22"
          fill="none"
          className={cn("absolute", pos)}
        >
          <path
            d="M1 9V1H9"
            strokeWidth={thickness}
            strokeLinecap="round"
            className={colorClassName}
          />
        </svg>
      ))}
    </div>
  )
}
