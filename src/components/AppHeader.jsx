"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/stores";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export function AppHeader() {
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

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-testid="button-logout"
            className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
