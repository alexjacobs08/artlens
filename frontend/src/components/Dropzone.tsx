import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import type { FileRejection } from "react-dropzone"

import { ViewfinderFrame } from "@/components/ViewfinderFrame"
import { cn } from "@/lib/utils"

const MAX_BYTES = 10 * 1024 * 1024

interface DropzoneProps {
  onSelect: (file: File) => void
}

export function Dropzone({ onSelect }: DropzoneProps) {
  const [rejection, setRejection] = useState<string | null>(null)

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const err = rejected[0]?.errors[0]
        if (err?.code === "file-too-large") {
          setRejection("That image is over 10MB. Choose a smaller file.")
        } else if (err?.code === "file-invalid-type") {
          setRejection("ArtLens reads images only — try a JPG, PNG, or WebP.")
        } else {
          setRejection("That file couldn't be used. Try another image.")
        }
        return
      }
      const file = accepted[0]
      if (!file) return
      setRejection(null)
      onSelect(file)
    },
    [onSelect],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
    maxSize: MAX_BYTES,
    multiple: false,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-8 py-16 text-center transition-colors duration-200 sm:min-h-96",
          isDragActive
            ? "border-accent bg-accent/[0.06]"
            : "border-border-strong bg-card/40 hover:border-accent/60 hover:bg-card/70",
        )}
      >
        <input {...getInputProps()} aria-label="Upload an image to search" />
        <ViewfinderFrame
          size={26}
          thickness={2}
          colorClassName={cn(
            "transition-colors duration-200",
            isDragActive ? "stroke-accent" : "stroke-border-strong group-hover:stroke-accent",
          )}
          className="m-3"
        />

        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border transition-colors duration-200",
            isDragActive
              ? "border-accent/50 bg-accent/10 text-accent"
              : "border-border bg-background-raised text-muted-foreground group-hover:border-accent/40 group-hover:text-accent",
          )}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V4M12 4L7 9M12 4L17 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="space-y-1.5">
          <p className="font-display text-lg font-medium text-foreground sm:text-xl">
            {isDragActive ? "Release to search" : "Drop an image to begin"}
          </p>
          <p className="text-sm text-muted-foreground">
            or{" "}
            <span className="text-accent underline decoration-accent/40 underline-offset-4 group-hover:text-accent-hover">
              browse your files
            </span>
          </p>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground-2">
          JPG · PNG · WebP · up to 10MB
        </p>
      </div>

      {rejection && (
        <p
          role="alert"
          className="mt-3 text-xs text-destructive"
        >
          {rejection}
        </p>
      )}
    </div>
  )
}
