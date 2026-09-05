"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { cn, getInitials } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = session?.user
    ? [
        { href: "/menu", label: "Menu" },
        { href: "/orders", label: "Orders" },
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/#features", label: "Features" },
        { href: "/#pricing", label: "Pricing" },
        { href: "/login", label: "Login" },
      ];

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/50/50 bg-white/80/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white font-bold text-sm">
            SS
          </div>
          <span className="font-heading text-xl font-bold text-gray-900">
            {APP_NAME}
          </span>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          {session?.user ? (
            <>
              <NotificationBell />
              <ThemeToggle />
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="text-right text-sm">
                  <p className="font-medium text-gray-900">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {session.user.role?.toLowerCase()}
                  </p>
                </div>
                <Avatar className="h-9 w-9 ring-2 ring-primary-500/20">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback>
                    {getInitials(session.user.name ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <ThemeToggle />
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <NotificationBell />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-white md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100:bg-gray-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
