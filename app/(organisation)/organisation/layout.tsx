import { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function OrganisationLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
