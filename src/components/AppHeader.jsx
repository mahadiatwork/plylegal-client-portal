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

  const displayName =
    snap.userProfile?.name ||
    snap.userProfile?.displayName ||
    snap.user?.displayName ||
    (email ? email.split("@")[0] : "User");

  // Capitalize or extract first name
  const firstName = displayName.split(" ")[0] || displayName;
  const initial = (firstName[0] || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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
          <div className="flex items-center gap-3 sm:gap-6">
            {/* User Avatar + Name */}
            {snap.user && (
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF7F2] text-xs font-bold text-[#244D42] border border-[#DCECE5]">
                  {initial}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-slate-800">
                  {firstName}
                </span>
              </div>
            )}

            {/* Sign Out Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100 disabled:opacity-70 transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>{isLoggingOut ? "Signing out…" : "Sign out"}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
