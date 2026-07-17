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
    <div className="flex flex-col items-start gap-5 rounded-xl border border-border bg-card/60 p-5 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-background-raised sm:h-28 sm:w-28">
        <img
          src={imageUrl}
          alt="Your uploaded query"
          className="h-full w-full object-cover"
        />
        <ViewfinderFrame size={16} thickness={1.5} colorClassName="stroke-accent" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="truncate font-mono text-xs text-muted-foreground-2" title={fileName}>
          {fileName}
        </p>

        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "loading" && "animate-pulse bg-accent",
              status === "success" && "bg-success",
              status === "error" && "bg-destructive",
            )}
          />
          <p className="text-sm text-foreground">
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
