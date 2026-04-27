"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/stores";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export function AppHeader({ onMenuClick }) {
  const router = useRouter();

  const handleLogout = () => {
    authStore.logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-sidebar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/applications" className="flex-shrink-0">
            <BrandLogo priority className="h-[40px] mx-0" />
          </Link>

          {/* Right side: hamburger on mobile, sign-out on desktop */}
          <div className="flex items-center gap-2">
            {/* Sign Out — desktop only */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
              className="hidden sm:flex items-center gap-2 text-sidebar-foreground/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
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
