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
  const isWorkspace = Boolean(onMenuClick);
  const isSpacious = variant === "spacious";
  const isClassic = variant === "classic";
  const showLogo = !isWorkspace;

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
    <header
      className={cn(
        "sticky top-0 z-50 border-b",
        isWorkspace
          ? "border-[#d7ddfb] bg-[#E4E9FF] shadow-sm"
          : "border-sidebar-border bg-sidebar"
      )}
    >
      <div
        className={cn(
          "mx-auto px-4 sm:px-6",
          isClassic
            ? "max-w-[1716px] lg:px-8"
            : isSpacious
              ? "max-w-[1680px] lg:px-10 xl:px-16 2xl:px-24"
              : "max-w-7xl"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between",
            isClassic ? "h-20 sm:h-[88px]" : isSpacious ? "h-[5.75rem]" : "h-16"
          )}
        >
          {showLogo ? (
            <ProgressLink href="/applications" className="flex-shrink-0">
              <BrandLogo
                priority
                className={cn(
                  "mx-0",
                  isClassic ? "h-[50px] sm:h-[56px]" : isSpacious ? "h-[60px]" : "h-[40px]"
                )}
              />
            </ProgressLink>
          ) : (
            <div className="flex min-w-0 flex-1 items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                data-testid="button-menu"
                className="sm:hidden text-primary hover:bg-primary/5 hover:text-primary"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          )}

          {/* Right side */}
          <div className={cn("flex items-center", isClassic || isSpacious ? "gap-5" : "gap-3")}>
            {/* User email pill — desktop only */}
            {email && (
              <span className={cn(
                "hidden sm:inline-flex items-center gap-2 rounded-full font-medium truncate",
                isWorkspace
                  ? "border border-slate-200 bg-white text-slate-700 shadow-sm"
                  : "bg-white/10 text-sidebar-foreground/85",
                isClassic
                  ? "max-w-[260px] px-4 py-2 text-sm"
                  : isSpacious
                    ? "max-w-[260px] px-5 py-3 text-sm"
                    : "max-w-[200px] px-3 py-1 text-xs"
              )}>
                {isSpacious && !isClassic && <UserRound className="h-4 w-4 shrink-0" />}
                {email}
              </span>
            )}

            {/* Sign Out — desktop only */}
            {isSpacious && !isClassic && (
              <div className={cn("hidden sm:block h-8 w-px", isWorkspace ? "bg-slate-200" : "bg-white/25")} />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
              className={cn(
                "hidden sm:flex items-center gap-2 disabled:opacity-70",
                isWorkspace
                  ? "text-primary hover:bg-primary/5 hover:text-primary"
                  : "text-sidebar-foreground/75 hover:text-white hover:bg-white/10",
                isClassic ? "h-10 px-3 text-sm font-semibold" : isSpacious ? "h-11 px-4 text-sm" : ""
              )}
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>{isLoggingOut ? "Signing out…" : "Sign Out"}</span>
            </Button>

            {onMenuClick && !isWorkspace && (
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
