"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Utensils,
  Table2,
  ClipboardList,
  Users,
  UserCircle,
  Package,
  BarChart3,
  Building2,
  Award,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { APP_NAME } from "@/lib/constants";
import { useState } from "react";
import { signOut } from "next-auth/react";
import type { FeatureKey } from "@prisma/client";
import { usePermissionStore } from "@/store/permissionStore";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  featureKey?: FeatureKey;
}

const sidebarItems: SidebarItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
  },
  {
    href: "/admin/menu",
    label: "Menu",
    icon: <Utensils className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "MENU",
  },
  {
    href: "/admin/tables",
    label: "Tables",
    icon: <Table2 className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "TABLES",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "ORDERS",
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: <Users className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN"],
    featureKey: "STAFF",
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: <UserCircle className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "CUSTOMERS",
  },
  {
    href: "/admin/inventory",
    label: "Inventory",
    icon: <Package className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "INVENTORY",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "ANALYTICS",
  },
  {
    href: "/admin/branches",
    label: "Branches",
    icon: <Building2 className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN"],
    featureKey: "BRANCHES",
  },
  {
    href: "/admin/loyalty",
    label: "Loyalty",
    icon: <Award className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "LOYALTY",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: <FileText className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN", "MANAGER"],
    featureKey: "REPORTS",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
    roles: ["SUPERADMIN", "ADMIN"],
    featureKey: "SETTINGS",
  },
];

interface SidebarProps {
  initialFeatures?: Record<string, boolean> | null;
}

export function Sidebar({ initialFeatures }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const storeFeatures = usePermissionStore((state) => state.featuresMap);
  const isInitialized = usePermissionStore((state) => state.isInitialized) || !!initialFeatures;
  const featuresMap = storeFeatures ?? initialFeatures;

  const role = (session?.user?.role ?? "").toUpperCase();
  const isSuperAdmin = role === "SUPERADMIN" || role === "SUPER_ADMIN";

  const filteredItems = sidebarItems.filter((item) => {
    if (!item.roles.includes(role)) return false;

    // Super Admin has unrestricted access
    if (isSuperAdmin) return true;

    // Dashboard is always visible to authorized roles
    if (!item.featureKey) return true;

    // Settings is always visible if authorized
    if (item.featureKey === "SETTINGS") return true;

    // Fail closed: require explicit true from effective feature map
    if (!featuresMap) return false;
    return featuresMap[item.featureKey] === true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200/50/50 bg-white transition-all duration-300",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200/50/50 px-4">
        <Link
          href="/admin/dashboard"
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white font-bold text-sm">
            SS
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-gray-900">
              {APP_NAME}
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {!isInitialized ? (
          <div className="space-y-2 p-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 w-full rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800/60"
              />
            ))}
          </div>
        ) : (
          <div className={cn("space-y-1", collapsed && "flex flex-col items-center")}>
            {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100",
                  collapsed && "justify-center px-2",
                )}
              >
                <span
                  className={cn(
                    isActive ? "text-gray-700" : "text-gray-400",
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-200/50/50 p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl px-3 py-2",
            collapsed && "justify-center",
          )}
        >
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary-500/20">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback>
              {getInitials(session?.user?.name ?? "U")}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900">
                {session?.user?.name}
              </p>
              <p className="truncate text-xs text-gray-500 capitalize">
                {role.toLowerCase()}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className={cn(collapsed && "hidden")}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
