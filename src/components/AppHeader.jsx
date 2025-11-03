"use client";

import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authStore } from "@/stores";
import { useRouter } from "next/navigation";

export function AppHeader({ onMenuClick }) {
  const router = useRouter();
  
  const handleLogout = () => {
    authStore.logout();
    router.push("/login");
  };
  
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
        data-testid="button-menu"
      >
        <Menu className="w-5 h-5" />
      </Button>
      
      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          data-testid="button-logout"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
