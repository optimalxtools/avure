"use client"

import * as React from "react"
import { Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SectionTitle } from "@/components/section-title"

import AccountSettings from "./components/pages/settings"
import AccountNotifications from "./components/pages/notifications"

function AccountTabsClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initial = searchParams.get("tab") === "notifications" ? "notifications" : "settings"
  const [tab, setTab] = React.useState<"settings" | "notifications">(initial)

  React.useEffect(() => {
    const current = searchParams.get("tab") === "notifications" ? "notifications" : "settings"
    setTab(current)
  }, [searchParams])

  const onChange = (value: string) => {
    const v = value === "notifications" ? "notifications" : "settings"
    setTab(v)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set("tab", v)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage><SectionTitle /></BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="px-2 md:px-0">
          <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        </div>
        <Suspense fallback={null}>
          <Tabs value={tab} onValueChange={onChange} className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center px-2 md:px-0">
              <div>
                <TabsList>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="settings" className="space-y-4">
              <AccountSettings />
            </TabsContent>
            <TabsContent value="notifications" className="space-y-4">
              <AccountNotifications />
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </>
  )
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountTabsClient />
    </Suspense>
  )
}
