import { Button } from "@/components/ui/button"
import { ViewfinderFrame } from "@/components/ViewfinderFrame"
import { cn } from "@/lib/utils"

interface QueryPanelProps {
  imageUrl: string
  fileName: string
  status: "loading" | "success" | "error"
  resultCount?: number
  onReplace: () => void
}

export function QueryPanel({
  imageUrl,
  fileName,
  status,
  resultCount,
  onReplace,
}: QueryPanelProps) {
  return (
    <div className="flex flex-col items-start gap-5 border-b border-rule/60 pb-8 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-ink-raised sm:h-28 sm:w-28">
        <img
          src={imageUrl}
          alt="Your uploaded query"
          className="h-full w-full object-cover"
        />
        <ViewfinderFrame size={16} thickness={1.5} colorClassName="stroke-brass" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="truncate font-mono text-xs text-muted-2" title={fileName}>
          {fileName}
        </p>

        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "loading" && "animate-pulse bg-brass",
              status === "success" && "bg-verdigris",
              status === "error" && "bg-crimson",
            )}
          />
          <p className="font-mono text-sm text-bone">
            {status === "loading" && "Comparing brushwork, palette, and form…"}
            {status === "success" &&
              `${resultCount ?? 0} kindred ${resultCount === 1 ? "work" : "works"} found`}
            {status === "error" && "Search failed"}
          </p>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onReplace} className="shrink-0">
        Replace image
      </Button>
    </div>
  )
}
