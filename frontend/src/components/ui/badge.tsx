import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest transition-colors focus:outline-none rounded-none",
        {
          "border-transparent bg-primary text-background hover:bg-primary/80": variant === "default",
          "border-transparent bg-white/10 text-foreground hover:bg-white/20": variant === "secondary",
          "border-transparent bg-red-500/20 text-red-500 border-red-500/50": variant === "destructive",
          "border-transparent bg-primary/20 text-primary border-primary/50": variant === "success",
          "border-white/20 text-foreground/60": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
