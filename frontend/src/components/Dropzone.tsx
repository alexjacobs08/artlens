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
          "group relative flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 border border-dashed px-8 py-16 text-center transition-colors duration-200 sm:min-h-96",
          isDragActive
            ? "border-brass-bright bg-paper-hover"
            : "border-rule bg-paper/60 hover:border-brass hover:bg-paper",
        )}
      >
        <input {...getInputProps()} aria-label="Upload an image to search" />
        <ViewfinderFrame
          size={26}
          thickness={2}
          colorClassName={cn(
            "transition-colors duration-200",
            isDragActive ? "stroke-brass-bright" : "stroke-muted-2 group-hover:stroke-brass",
          )}
          className="m-3"
        />

        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          className={cn(
            "transition-colors duration-200",
            isDragActive ? "text-brass-bright" : "text-muted-2 group-hover:text-brass",
          )}
        >
          <circle cx="17" cy="17" r="11" stroke="currentColor" strokeWidth="2" />
          <path d="M25 25L34 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <div className="space-y-1.5">
          <p className="font-display text-xl text-bone sm:text-2xl">
            {isDragActive ? "Release to search" : "Drop an image to begin"}
          </p>
          <p className="text-sm text-muted">
            or{" "}
            <span className="text-brass underline decoration-brass/40 underline-offset-4 group-hover:text-brass-bright">
              browse your files
            </span>
          </p>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-2">
          JPG · PNG · WebP · up to 10MB
        </p>
      </div>

      {rejection && (
        <p
          role="alert"
          className="mt-3 font-mono text-xs text-crimson"
        >
          {rejection}
        </p>
      )}
    </div>
  )
}
