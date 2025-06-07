"use client";

import { cn } from "@/lib/utils";
import { BookOpen, Newspaper, User, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AddWordDialog } from "@/components/add-word-dialog";

export type TabType = "vocabulary" | "news" | "user" | "recommendations";

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const tabs: TabConfig[] = [
  {
    id: "vocabulary",
    label: "單字庫",
    icon: BookOpen,
    href: "/vocabulary",
  },
  {
    id: "recommendations",
    label: "推薦",
    icon: Star,
    href: "/recommendations",
  },
  {
    id: "news",
    label: "新聞",
    icon: Newspaper,
    href: "/news",
  },
  {
    id: "user",
    label: "用戶",
    icon: User,
    href: "/user",
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  // Split tabs into left and right groups
  const leftTabs = tabs.slice(0, 2); // vocabulary, recommendations
  const rightTabs = tabs.slice(2); // news, user

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center">
        {/* Left tabs */}
        <div className="flex flex-1">
          {leftTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (pathname === "/" && tab.id === "vocabulary");
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-3 transition-all duration-200 ease-in-out",
                  "hover:bg-accent/50 active:bg-accent/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "text-primary bg-accent/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "transition-all duration-200 ease-in-out",
                    isActive ? "size-5" : "size-5"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-200 ease-in-out",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Center Add Button */}
        <div className="flex items-center justify-center px-4">
          <AddWordDialog />
        </div>

        {/* Right tabs */}
        <div className="flex flex-1">
          {rightTabs.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (pathname === "/" && tab.id === "vocabulary");
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2 px-3 transition-all duration-200 ease-in-out",
                  "hover:bg-accent/50 active:bg-accent/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "text-primary bg-accent/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "transition-all duration-200 ease-in-out",
                    isActive ? "size-5" : "size-5"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-200 ease-in-out",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
