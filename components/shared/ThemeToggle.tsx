"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-gray-400 cursor-default"
        aria-label="Theme toggle placeholder"
      >
        <Sun className="h-4.5 w-4.5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-label="Toggle light/dark theme"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-400 transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-gray-700 transition-transform rotate-0 scale-100" />
      )}
    </Button>
  );
}
