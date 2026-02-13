"use client"

import dynamic from "next/dynamic"

const LandingContent = dynamic(() => import("@/components/landing/landing-content"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Initializing Arena
        </p>
      </div>
    </div>
  ),
})

export function LandingLoader() {
  return <LandingContent />
}
