"use client"

import { usePathname } from "next/navigation"
import { findTitleByUrl, findTitlesForPath } from "@/lib/nav"
import { ClientName } from "@/components/client-name"

function humanize(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

export function SectionTitle({ fallback = "Section" }: { fallback?: string }) {
  const pathname = usePathname()
  if (pathname === "/") {
    return <ClientName as="span" />
  }
  const pair = findTitlesForPath(pathname)
  if (pair?.group) {
    // Show client name in breadcrumb when under a module group
    return <ClientName as="span" />
  }
  const found = findTitleByUrl(pathname)
  if (found) return <>{found}</>
  const parts = pathname.split("/").filter(Boolean)
  const last = parts[parts.length - 1] || ""
  return <>{last ? humanize(last) : fallback}</>
}
