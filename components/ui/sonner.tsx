"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster phoenix-toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "transparent",
          "--normal-text": "hsl(var(--foreground))",
          "--normal-border": "transparent",
          "--success-bg": "rgba(16,185,129,0.14)",
          "--success-text": "hsl(152 69% 32%)",
          "--success-border": "rgba(16,185,129,0.35)",
          "--error-bg": "rgba(239,68,68,0.12)",
          "--error-text": "hsl(0 72% 45%)",
          "--error-border": "rgba(239,68,68,0.35)",
          "--warning-bg": "rgba(245,158,11,0.14)",
          "--warning-text": "hsl(35 92% 40%)",
          "--warning-border": "rgba(245,158,11,0.35)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast phoenix-toast border shadow-soft px-4 py-3 gap-3",
          title: "font-semibold text-slate-900 dark:text-slate-100 leading-tight",
          description: "text-sm leading-relaxed text-slate-700 dark:text-slate-300 mt-1",
          closeButton:
            "rounded-full border border-slate-300/70 bg-white/75 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:border-white/20 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
          actionButton:
            "phoenix-primary border-0 text-white shadow-[0_6px_18px_rgba(236,72,153,0.3)] hover:brightness-105",
          cancelButton:
            "border border-slate-300/75 bg-white/85 text-slate-700 hover:bg-white dark:border-white/20 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
