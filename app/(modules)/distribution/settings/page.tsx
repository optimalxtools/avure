import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save } from "lucide-react"
import { Settings } from "lucide-react"
import { SectionTitle } from "@/components/section-title"

export default function Page() {
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
          <Button className="bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent">
            <Save className="size-4" />
            <span className="sr-only md:not-sr-only">Save Changes</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <span className="text-muted-foreground">Distribution</span>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
        </div>
        <Tabs defaultValue="configuration" className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div>
              <TabsList>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="configuration" className="space-y-4">
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              Configuration coming soon
            </div>
          </TabsContent>
          <TabsContent value="notifications" className="space-y-4">
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              Notifications coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
