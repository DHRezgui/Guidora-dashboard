import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-slate-300 bg-white/90 px-2.5 py-2 text-base text-slate-700 transition-colors outline-none placeholder:text-slate-500 focus-visible:border-orange-400/60 focus-visible:ring-3 focus-visible:ring-orange-400/20 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:border-white/12 dark:bg-slate-950/45 dark:text-slate-100 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
