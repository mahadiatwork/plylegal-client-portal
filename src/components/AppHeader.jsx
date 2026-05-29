"use client";

import { LogOut, Menu, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/stores";
import { useSnapshot } from "valtio";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";
import { ProgressLink } from "@/components/ProgressLink";
import { cn } from "@/lib/utils";

export function AppHeader({ onMenuClick, variant = "default" }) {
  const router = useRouter();
  const snap = useSnapshot(authStore);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isSpacious = variant === "spacious";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authStore.logout();
    router.push("/login");
  };

  // Prefer display name → email from user object or userProfile
  const email =
    snap.user?.email ||
    snap.userProfile?.email ||
    snap.user?.displayName ||
    null;

  return (
    <header className="sticky top-0 z-50 border-b border-sidebar-border bg-sidebar">
      <div className={cn("mx-auto px-4 sm:px-6", isSpacious ? "max-w-[1680px] lg:px-10 xl:px-16 2xl:px-24" : "max-w-7xl")}>
        <div className={cn("flex items-center justify-between", isSpacious ? "h-[5.75rem]" : "h-16")}>
          {/* Logo */}
          <ProgressLink href="/applications" className="flex-shrink-0">
            <BrandLogo priority className={cn("mx-0", isSpacious ? "h-[60px]" : "h-[40px]")} />
          </ProgressLink>

          {/* Right side */}
          <div className={cn("flex items-center", isSpacious ? "gap-5" : "gap-3")}>
            {/* User email pill — desktop only */}
            {email && (
              <span className={cn(
                "hidden sm:inline-flex items-center gap-2 rounded-full bg-white/10 text-sidebar-foreground/85 font-medium truncate",
                isSpacious ? "max-w-[260px] px-5 py-3 text-sm" : "max-w-[200px] px-3 py-1 text-xs"
              )}>
                {isSpacious && <UserRound className="h-4 w-4 shrink-0" />}
                {email}
              </span>
            )}

            {/* Sign Out — desktop only */}
            {isSpacious && <div className="hidden sm:block h-8 w-px bg-white/25" />}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
              className={cn(
                "hidden sm:flex items-center gap-2 text-sidebar-foreground/75 hover:text-white hover:bg-white/10 disabled:opacity-70",
                isSpacious ? "h-11 px-4 text-sm" : ""
              )}
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>{isLoggingOut ? "Signing out…" : "Sign Out"}</span>
            </Button>

            {/* Hamburger — mobile only */}
            {onMenuClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                data-testid="button-menu"
                className="sm:hidden text-sidebar-foreground/80 hover:text-white hover:bg-white/10"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
