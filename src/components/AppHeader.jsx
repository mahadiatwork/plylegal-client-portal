"use client";

import Link from "next/link";
import { LogOut, Menu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/stores";
import { useSnapshot } from "valtio";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";

export function AppHeader({ onMenuClick }) {
  const router = useRouter();
  const snap = useSnapshot(authStore);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    <header className="sticky top-0 z-50 border-b border-border bg-sidebar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/applications" className="flex-shrink-0">
            <BrandLogo priority className="h-[40px] mx-0" />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* User email pill — desktop only */}
            {email && (
              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-sidebar-foreground/80 text-xs font-medium truncate max-w-[200px]">
                {email}
              </span>
            )}

            {/* Sign Out — desktop only */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
              className="hidden sm:flex items-center gap-2 text-sidebar-foreground/70 hover:text-white hover:bg-white/10 disabled:opacity-70"
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
