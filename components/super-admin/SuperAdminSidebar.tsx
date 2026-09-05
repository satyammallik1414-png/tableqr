"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  GitBranch,
  Users,
  UserCircle,
  CreditCard,
  FileCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { APP_NAME } from "@/lib/constants";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  {
    href: "/super-admin",
    label: "Overview",
    icon: <LayoutDashboard className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/businesses",
    label: "Businesses",
    icon: <Building2 className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/branches",
    label: "Branches",
    icon: <GitBranch className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/users",
    label: "Users & Staff",
    icon: <Users className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/customers",
    label: "Customers",
    icon: <UserCircle className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/plans",
    label: "Subscription Plans",
    icon: <CreditCard className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/subscriptions",
    label: "Subscriptions",
    icon: <FileCheck className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/features",
    label: "Feature Flags",
    icon: <SlidersHorizontal className="h-4.5 w-4.5" />,
  },
  {
    href: "/super-admin/settings",
    label: "Platform Settings",
    icon: <Settings className="h-4.5 w-4.5" />,
  },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200/60 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-950",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200/60 px-4 dark:border-gray-800">
        <Link
          href="/super-admin"
          className={cn("flex items-center gap-2.5", collapsed && "justify-center")}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white shadow-xs">
            SS
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-heading text-base font-bold text-gray-900 dark:text-white">
                {APP_NAME}
              </span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Admin Console
              </span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex text-gray-400 hover:text-gray-900 dark:hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className={cn("space-y-1", collapsed && "flex flex-col items-center")}>
          {sidebarItems.map((item) => {
            const isActive =
              item.href === "/super-admin"
                ? pathname === "/super-admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <span className={cn(isActive ? "text-gray-700 dark:text-gray-200" : "text-gray-400")}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Footer */}
      <div className="border-t border-gray-200/60 p-3 dark:border-gray-800">
        <div className={cn("flex items-center gap-3 rounded-2xl p-2", collapsed && "justify-center")}>
          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-gray-200 dark:ring-gray-800">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 font-semibold text-xs">
              {getInitials(session?.user?.name || "SM")}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {session?.user?.name || "Satyam Mallik"}
              </p>
              <p className="truncate text-xs text-gray-500 capitalize">
                {session?.user?.role ? session.user.role.toLowerCase() : "Superadmin"}
              </p>
            </div>
          )}
          <div className={cn("flex items-center gap-1", collapsed && "hidden")}>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
