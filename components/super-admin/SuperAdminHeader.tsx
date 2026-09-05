"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { getInitials } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function SuperAdminHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex min-h-16 w-full min-w-0 items-center justify-between gap-2 border-b border-gray-200/60 bg-white/95 px-3 py-2 backdrop-blur-md sm:px-4 lg:px-6 dark:border-gray-800 dark:bg-gray-950/95">
      {/* Left: Brand / Title */}
      <div className="flex items-center gap-3">
        <Link href="/super-admin" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white shadow-xs">
            SS
          </div>
          <span className="hidden font-heading text-lg font-bold tracking-tight text-gray-900 sm:inline dark:text-white">
            {APP_NAME}
          </span>
        </Link>
        <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 md:inline dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Superadmin
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <Link href="/" target="_blank" className="hidden lg:block">
          <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-900 gap-1.5">
            Website <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>

        <NotificationBell />
        <ThemeToggle />

        {/* User Badge matching homepage navbar */}
        <div className="flex items-center gap-1 border-l border-gray-200 pl-2 sm:gap-3 sm:pl-4 dark:border-gray-800">
          <div className="text-right text-sm hidden sm:block">
            <p className="font-medium text-gray-900 dark:text-white leading-tight">
              {session?.user?.name || "Satyam Mallik"}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {session?.user?.role ? session.user.role.toLowerCase() : "Superadmin"}
            </p>
          </div>
          <Avatar className="h-9 w-9 ring-1 ring-gray-200 dark:ring-gray-800">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 font-semibold text-xs">
              {getInitials(session?.user?.name || "SM")}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
