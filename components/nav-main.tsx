"use client"

import { ChevronRight, Settings, type LucideIcon } from "lucide-react"
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  title,
  items,
  forceDefaultOpen,
  showHeading = true,
}: {
  title?: string,
  items: {
    title: string
    url?: string
    icon?: LucideIcon
    isActive?: boolean
    disabled?: boolean
    showSettingsIcon?: boolean
    items?: {
      title: string
      url: string
      icon?: LucideIcon
      isActive?: boolean
      disabled?: boolean
    }[]
  }[],
  forceDefaultOpen?: boolean,
  showHeading?: boolean,
}) {
  const { state, setOpen } = useSidebar()

  const handleMenuClick = () => {
    // If sidebar is collapsed, open it
    if (state === "collapsed") {
      setOpen(true)
    }
  }

  return (
    <SidebarGroup>
      {title && showHeading ? <SidebarGroupLabel>{title}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            open={item.isActive && !item.disabled ? true : undefined}
            defaultOpen={forceDefaultOpen || (item.isActive && !item.disabled)}
            className="group/collapsible"
            disabled={item.disabled}
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild disabled={item.disabled}>
                <SidebarMenuButton
                  tooltip={item.title}
                  disabled={item.disabled}
                  className={cn(
                    "cursor-default font-semibold duration-300",
                    item.isActive ? "text-white" : "",
                    item.disabled && "cursor-not-allowed text-muted-foreground opacity-50"
                  )}
                  onClick={handleMenuClick}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <div className="ml-auto flex items-center gap-1">
                    {item.url && !item.disabled && item.showSettingsIcon !== false ? (
                      <Link
                        href={`${item.url}/settings`}
                        aria-label={`${item.title} settings`}
                        title={`${item.title} settings`}
                        className="rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        onClick={(e) => {
                          // Don’t toggle the collapsible when clicking the gear
                          e.stopPropagation()
                        }}
                        onMouseDown={(e) => {
                          // Prevent focusing the CollapsibleTrigger button
                          e.stopPropagation()
                        }}
                      >
                        <Settings className="size-4" />
                      </Link>
                    ) : null}
                    <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </div>
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {!item.disabled && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isDataAcquisition = subItem.title === "Data Acquisition"

                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            aria-disabled={subItem.disabled}
                            isActive={subItem.isActive}
                            className={cn(
                              // Override the default gap-2 with a smaller gap (0.125rem)
                              // This applies to the flex container itself
                              "gap-0.5",
                              // Your existing icon size override
                              "[&>svg]:!size-3.5",
                              // Tighter icon/text spacing if needed (adjust mr-1 to mr-0.5 or less)
                              "[&>svg]:mr-1",
                              isDataAcquisition &&
                                "!text-[hsl(var(--sidebar-background-light))] hover:!text-[hsl(var(--sidebar-background-light))] data-[active=true]:!text-[hsl(var(--sidebar-background-light))] [&>svg]:!text-[hsl(var(--sidebar-background-light))] hover:[&>svg]:!text-[hsl(var(--sidebar-background-light))] data-[active=true]:[&>svg]:!text-[hsl(var(--sidebar-background-light))]",
                              subItem.isActive ? "font-semibold" : "",
                              subItem.disabled && "pointer-events-none text-muted-foreground"
                            )}
                          >
                            <Link href={subItem.url}>
                              {subItem.icon && <subItem.icon />}
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
