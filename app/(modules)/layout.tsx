import { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ModuleAccessGate } from "@/components/module-access-gate"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export default function ModulesLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ModuleAccessGate>{children}</ModuleAccessGate>
      </SidebarInset>
    </SidebarProvider>
  )
}
