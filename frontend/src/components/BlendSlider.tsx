interface BlendSliderProps {
  alpha: number // 1 = pure semantic (CLIP), 0 = pure visual (DINOv2)
  onChange: (alpha: number) => void
}

export function BlendSlider({ alpha, onChange }: BlendSliderProps) {
  const position = Math.round((1 - alpha) * 100)
  return (
    <div className="flex w-full max-w-md items-center gap-4">
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-2">
        Similar subject
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={position}
        onChange={(e) => onChange(1 - Number(e.target.value) / 100)}
        aria-label="Blend between subject similarity and visual similarity"
        className="h-1 w-full cursor-pointer appearance-none bg-rule accent-[#c9a24b]"
      />
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-2">
        Similar look
      </span>
    </div>
  )
}
