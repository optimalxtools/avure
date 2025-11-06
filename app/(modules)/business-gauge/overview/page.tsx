import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { SectionTitle } from "@/components/section-title"
import { ExportButton } from "@/components/export-button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AIButton } from "@/components/ai-button"

const SHOW_OVERVIEW_CONTENT = false

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
          <div className="flex items-center gap-2">
            <AIButton currentPage="Business Gauge - Overview" />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-2 md:px-4 pt-0 md:pt-0 pb-2 md:pb-4 overflow-x-auto" style={{ maxWidth: "100vw" }}>
        <div className="px-2 md:px-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-muted-foreground">Business Gauge</span>
              <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
            </div>
            <ExportButton />
          </div>
        </div>
        {SHOW_OVERVIEW_CONTENT ? (
          <div className="min-h-[50vh] rounded-xl bg-muted/50" />
        ) : (
          <div className="rounded-md border p-6 text-sm text-muted-foreground">
            Overview coming soon
          </div>
        )}
      </div>
    </>
  )
}

