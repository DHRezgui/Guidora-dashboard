"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
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
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "hsl(152 69% 96%)",
          "--success-text": "hsl(152 69% 24%)",
          "--success-border": "hsl(152 52% 82%)",
          "--error-bg": "hsl(0 86% 97%)",
          "--error-text": "hsl(0 60% 32%)",
          "--error-border": "hsl(0 72% 88%)",
          "--warning-bg": "hsl(38 92% 95%)",
          "--warning-text": "hsl(30 75% 30%)",
          "--warning-border": "hsl(38 85% 82%)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast border shadow-soft",
          title: "font-medium",
          description: "text-sm",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
