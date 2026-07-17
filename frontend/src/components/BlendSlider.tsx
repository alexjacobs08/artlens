interface BlendSliderProps {
  alpha: number // 1 = pure semantic (CLIP), 0 = pure visual (DINOv2)
  onChange: (alpha: number) => void
}

export function BlendSlider({ alpha, onChange }: BlendSliderProps) {
  const position = Math.round((1 - alpha) * 100)
  return (
    <div className="flex w-full max-w-md items-center gap-4 rounded-xl border border-border bg-card/40 px-4 py-3">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Subject
      </span>
      <div className="relative flex h-4 w-full items-center">
        <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-border-strong" />
        <div
          className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-accent"
          style={{ width: `${position}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={position}
          onChange={(e) => onChange(1 - Number(e.target.value) / 100)}
          aria-label="Blend between subject similarity and visual similarity"
          className="slider-thumb relative h-4 w-full cursor-pointer"
        />
      </div>
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Look
      </span>
    </div>
  )
}
