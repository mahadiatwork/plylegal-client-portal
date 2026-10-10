"use client";

import { LogOut, Menu, Loader2, UserRound, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/stores";
import { useSnapshot } from "valtio";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";
import { ProgressLink } from "@/components/ProgressLink";
import { cn } from "@/lib/utils";

export function AppHeader({ onMenuClick, variant = "default", className }) {
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

  const displayName =
    snap.userProfile?.name ||
    snap.userProfile?.displayName ||
    snap.user?.displayName ||
    (email ? email.split("@")[0] : "User");

  // Capitalize or extract first name
  const firstName = displayName.split(" ")[0] || displayName;
  const initial = (firstName[0] || "U").toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-[#ECE7E1]/80 bg-[#FAF7F4] shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
        className
      )}
    >
      <div className="mx-auto w-full max-w-[1608px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {isWorkspace && onMenuClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                data-testid="button-menu"
                className="lg:hidden text-slate-700 hover:bg-slate-100"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <ProgressLink href="/applications" className="flex-shrink-0 flex items-center">
              <BrandLogo
                priority
                variant="black"
                className="h-[36px] sm:h-[40px] w-auto mx-0"
              />
            </ProgressLink>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* User Avatar + Name + Dropdown indicator */}
            {snap.user && (
              <div className="flex items-center gap-2 cursor-default select-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E2EBE5] text-xs font-semibold text-[#244D42]">
                  {initial}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-800">
                  {firstName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </div>
            )}

            {/* Sign Out Action */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-black disabled:opacity-60 transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
              ) : (
                <LogOut className="h-4 w-4 text-slate-800 stroke-[2.2]" />
              )}
              <span>{isLoggingOut ? "Signing out…" : "Sign out"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
