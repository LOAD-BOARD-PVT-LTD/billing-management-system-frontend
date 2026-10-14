"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { PanelLeft } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"

const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, children, ...props }, ref) => {
  const [openMobile, setOpenMobile] = React.useState(false)
  const [desktopState, setDesktopState] = React.useState<"expanded" | "collapsed">(
    defaultOpen ? "expanded" : "collapsed"
  )
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < 768
  })

                                                                 
  const open = React.useMemo(() => {
    return openProp ?? desktopState === "expanded"
  }, [openProp, desktopState])

  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      if (setOpenProp) {
                                                 
        const currentOpen = openProp ?? true
        const newOpen = typeof value === "function" ? value(currentOpen) : value
        setOpenProp(newOpen)
      } else {
                                                                                 
        setDesktopState((prevState) => {
          const currentOpen = prevState === "expanded"
          const newOpen = typeof value === "function" ? value(currentOpen) : value
          return newOpen ? "expanded" : "collapsed"
        })
      }
    },
    [openProp, setOpenProp]
  )

  React.useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") {
        setIsMobile(false)
        return
      }

      const nextIsMobile = window.innerWidth < 768
      setIsMobile(nextIsMobile)

      if (!nextIsMobile) {
        setOpenMobile(false)
      }
    }

    updateIsMobile()
    window.addEventListener("resize", updateIsMobile)
    return () => window.removeEventListener("resize", updateIsMobile)
  }, [])

                      
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setOpen])

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen((prev) => !prev)
    }
  }, [isMobile, setOpen, setOpenMobile])

  const state = React.useMemo(() => (open ? "expanded" : "collapsed"), [open])

  const contextValue = React.useMemo<SidebarContext>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          ref={ref}
          data-sidebar="sidebar"
          data-state={state}
          className={cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-sidebar=sidebar]]:bg-sidebar", className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
})
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right"
    variant?: "sidebar" | "floating" | "inset"
    collapsible?: "offcanvas" | "icon" | "none"
  }
>(({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar()

                                                                            
  const sidebarWidth = React.useMemo(() => {
    return state === "collapsed" && collapsible === "icon"
      ? SIDEBAR_WIDTH_ICON
      : SIDEBAR_WIDTH
  }, [state, collapsible])

  if (collapsible === "none") {
    return (
      <div
        ref={ref}
        data-sidebar="sidebar"
        data-variant={variant}
        className={cn(
          "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-variant={variant}
          data-state={openMobile ? "expanded" : "collapsed"}
          className={cn(
            "w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
            side === "right" ? "sm:mr-0" : "sm:ml-0",
            className
          )}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      ref={ref}
      data-sidebar="sidebar"
      data-state={state}
      data-variant={variant}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      className={cn(
        "group peer hidden md:block text-sidebar-foreground",
        "sticky top-0 h-svh",
        className
      )}
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          width: sidebarWidth,
          transition: "width 200ms ease-linear",
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        data-sidebar="sidebar"
        className="flex h-full w-full flex-col bg-sidebar group-data-[collapsible=offcanvas]:border-r group-data-[collapsible=offcanvas]:border-sidebar-border"
      >
        {children}
      </div>
    </div>
  )
})
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()

    return (
      <button
        ref={ref}
        data-sidebar="rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          "absolute inset-y-0 z-50 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:-translate-x-1/2 after:bg-sidebar-border after:opacity-0 after:transition-opacity after:duration-200 hover:after:opacity-100 group-data-[side=left]:-left-2 group-data-[side=right]:left-full group-data-[collapsible=offcanvas]:group-data-[side=left]:-left-2 md:group-data-[collapsible=icon]:block",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn(
          "relative flex min-h-svh min-w-0 flex-1 flex-col bg-background",
          "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] peer-data-[variant=inset]:m-2 peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 peer-data-[variant=inset]:ml-0 peer-data-[variant=inset]:rounded-xl peer-data-[variant=inset]:shadow",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentProps<typeof Slot> & {
    asChild?: boolean
  }
>(({ className, ...props }, ref) => {
  const { state } = useSidebar()

  return (
    <Slot
      ref={ref}
      data-sidebar="input"
      data-state={state}
      className={cn(
        "flex h-8 w-full rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-1 text-sm text-sidebar-foreground transition-[width,height,padding] placeholder:text-sidebar-muted-foreground focus-visible:border-sidebar-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring disabled:cursor-not-allowed disabled:opacity-50 group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 md:text-sm",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="header"
        className={cn("flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-2", className)}
        {...props}
      />
    )
  }
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="footer"
        className={cn("flex h-16 shrink-0 items-center gap-2 border-t border-sidebar-border px-2", className)}
        {...props}
      />
    )
  }
)
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="separator"
      className={cn("shrink-0 bg-sidebar-border h-[1px] w-full", className)}
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="content"
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="group"
        className={cn("relative flex w-full min-w-0 flex-col p-3 gap-2", className)}
        {...props}
      />
    )
  }
)
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    const { state } = useSidebar()
    return (
      <div
        ref={ref}
        data-sidebar="group-label"
        data-state={state}
        className={cn(
          "duration-200 flex h-10 shrink-0 items-center rounded-md px-3 py-2 text-xs font-medium text-sidebar-foreground outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button> & {
    asChild?: boolean
  }
>(({ className, ...props }, ref) => {
  const { state } = useSidebar()

  return (
    <Button
      ref={ref}
      data-sidebar="group-action"
      data-state={state}
      variant="ghost"
      size="icon"
      className={cn(
        "absolute right-2 top-2.5 size-6 text-sidebar-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-foreground",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="group-content"
        className={cn("w-full space-y-1.5 group-data-[collapsible=icon]:hidden", className)}
        {...props}
      />
    )
  }
)
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        data-sidebar="menu"
        className={cn("flex w-full min-w-0 flex-col gap-1", className)}
        {...props}
      />
    )
  }
)
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => {
    return (
      <li
        ref={ref}
        data-sidebar="menu-item"
        className={cn("group/menu-item relative mb-1", className)}
        {...props}
      />
    )
  }
)
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-3 overflow-hidden rounded-md p-3 text-left text-sm font-semibold text-sidebar-foreground outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-bold data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-foreground data-[active=true]:[&>svg]:text-sidebar-primary-foreground",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-sidebar border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      },
      size: {
        default: "h-10 text-sm",
        sm: "h-9 text-xs",
        lg: "h-14 text-sm group-data-[collapsible=icon]:!size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
  const { state } = useSidebar()
  const Comp = asChild ? Slot : "button"
  const button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      data-state={state}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  )

  if (!tooltip) {
    return button
  }

  if (typeof tooltip === "string") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center" hidden={state !== "collapsed"} className="ml-2">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed"}
        className="ml-2"
        {...tooltip}
      />
    </Tooltip>
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex size-6 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:hidden",
        showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-hover/menu-button:bg-sidebar-accent peer-hover/menu-button:text-sidebar-accent-foreground",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="menu-badge"
        className={cn(
          "absolute right-1 flex size-5 items-center justify-center rounded-md text-xs group-data-[collapsible=icon]:hidden",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 items-center px-2", className)}
      {...props}
    >
      {showIcon && (
        <div className="flex h-4 w-4 shrink-0 animate-pulse rounded-md bg-sidebar-primary/10" />
      )}
      <div className="h-4 flex-1 animate-pulse rounded-md bg-sidebar-primary/10" />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        data-sidebar="menu-sub"
        className={cn(
          "mx-3.5 mt-0.5 flex min-w-0 translate-x-px flex-col gap-0.5 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ ...props }, ref) => {
    return <li ref={ref} {...props} />
  }
)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "md"
    isActive?: boolean
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 peer-data-[size=sm]/menu-button:pl-3 peer-data-[size=sm]/menu-button:text-xs",
        "data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
}
