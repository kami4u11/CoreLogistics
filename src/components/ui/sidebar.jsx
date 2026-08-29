import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import {
  PanelLeft,
  HardHat,
  BarChart2,
  BookCheck,
  Truck,
  Calculator,
  BookOpen,
  LogOut,
  LayoutDashboard,
  Package,
  Users,
  FileText,
  AlertTriangle,
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRole } from "@/components/useRole";
import { createPageUrl } from "@/utils";

// ────────────────────────────────────────────────
// Keep all your original imports and small components
// (SidebarProvider, Sidebar, SidebarTrigger, SidebarRail, etc.)
// ────────────────────────────────────────────────

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const SidebarContext = React.createContext(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

// ────────────────────────────────────────────────
// SidebarProvider (keep as is or your current version)
// ────────────────────────────────────────────────
const SidebarProvider = React.forwardRef(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((o) => !o)
        : setOpen((o) => !o);
    }, [isMobile, setOpen, setOpenMobile]);

    React.useEffect(() => {
      const handleKeyDown = (event) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo(
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
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          style={{
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          }}
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

// ────────────────────────────────────────────────
// Keep your existing Sidebar, SidebarTrigger, SidebarRail, etc.
// ────────────────────────────────────────────────

// (Paste your original Sidebar, SidebarInset, SidebarTrigger, etc. here if different)

// ────────────────────────────────────────────────
// Updated SidebarContent – this controls what menu items appear
// ────────────────────────────────────────────────

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => {
  const { isMobile, state } = useSidebar();
  const {
    isLabourSupervisor,
    isAdmin,
    isManagement,
    isAccounting,
    isSleepingPartner,
    isFleetManager,
  } = useRole();

  const isPureLabourSupervisor =
    isLabourSupervisor &&
    !isAdmin &&
    !isManagement &&
    !isAccounting &&
    !isSleepingPartner &&
    !isFleetManager;

  // ────────────────────────────────────────────────
  // Menu items – only these for labour supervisor
  // ────────────────────────────────────────────────
  const menuItems = isPureLabourSupervisor
    ? [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/",
        },
        {
          label: "Documentation & SOPs",
          icon: BookOpen,
          href: "/documentation", // ← change if your route is different
        },
        {
          label: "Labour Entries",
          icon: HardHat,
          href: createPageUrl("LabourEntry"),
        },
        {
          label: "Labour Analytics",
          icon: BarChart2,
          href: createPageUrl("LabourAnalytics"),
        },
        {
          label: "Labour Ledger",
          icon: BookCheck,
          href: createPageUrl("LabourLedger"),
        },
        {
          label: "Fleet (View Only)",
          icon: Truck,
          href: createPageUrl("Fleet"),
          disabled: true,
        },
        {
          label: "Trip Cost Calculator",
          icon: Calculator,
          href: createPageUrl("TripCostCalculator"),
        },
      ]
    : [
        // Full menu for admin, accounting, management, etc.
        { label: "Dashboard", icon: LayoutDashboard, href: "/" },
        { label: "Loads", icon: Package, href: createPageUrl("Loads") },
        { label: "Fleet", icon: Truck, href: createPageUrl("Fleet") },
        { label: "Vehicles", icon: Truck, href: createPageUrl("Vehicles") },
        { label: "Clients", icon: Users, href: createPageUrl("Clients") },
        { label: "Brokers", icon: AlertTriangle, href: "/brokers" }, // adjust if needed
        { label: "Accounting", icon: FileText, href: createPageUrl("Accounting") },
        { label: "Trip Cost Calculator", icon: Calculator, href: createPageUrl("TripCostCalculator") },
        { label: "Data Analysis", icon: BarChart2, href: "/data-analysis" }, // adjust if needed
        { label: "Documentation & SOPs", icon: BookOpen, href: "/documentation" },
        // Add any other items you had in your original sidebar
      ];

  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    >
      {/* You can keep header, search, separator if you have them */}
      {/* <SidebarHeader>...</SidebarHeader> */}
      {/* <SidebarInput placeholder="Search..." /> */}
      {/* <Separator /> */}

      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.href || item.label}>
              {item.disabled ? (
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed opacity-70"
                  )}
                  title="View only – contact admin for changes"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
              ) : (
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="mt-auto px-2 py-4 border-t border-sidebar-border">
        <a
          href="/logout" // ← change to your actual logout path if different
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </a>
      </div>
    </div>
  );
});
SidebarContent.displayName = "SidebarContent";

// ────────────────────────────────────────────────
// Keep all other exports exactly as they are in your file
// ────────────────────────────────────────────────

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
  useSidebar,
};