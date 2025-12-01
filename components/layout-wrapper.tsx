"use client"

import React from "react"
import { usePathname } from "next/navigation"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isWatchPage = pathname?.startsWith("/watch")

  if (isWatchPage) {
    return (
      <main className="relative w-full h-full min-h-screen bg-black">
        {children}
      </main>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <main className="flex-1 w-full">
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
