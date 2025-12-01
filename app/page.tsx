// app/page.tsx
import React, { Suspense } from "react"
import { SearchView } from "@/components/search-view"

export default function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const q = typeof searchParams.q === "string" ? searchParams.q : ""

  return (
    <div className="min-h-screen bg-black pt-2">
       <Suspense fallback={null}>
          <SearchView autoFocus={!q} initialQuery={q} />
       </Suspense>
    </div>
  )
}
