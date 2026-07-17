export function EmptyResults() {
  return (
    <div className="flex flex-col items-center gap-2 border border-rule/60 px-6 py-20 text-center">
      <p className="font-display text-lg text-bone">No kindred works surfaced</p>
      <p className="max-w-sm text-sm text-muted">
        The collection didn't return a close match for this image. Try a
        clearer photo, cropped closer to the artwork itself.
      </p>
    </div>
  )
}
