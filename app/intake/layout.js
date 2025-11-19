"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Menu, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getIntakeRoutes, calculateProgress } from "@/lib/routes";
import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";

export default function IntakeLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const draftSnap = useSnapshot(draftStore);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch by only rendering interactive elements after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Detect visa type from URL path
  const getVisaTypeFromPath = (path) => {
    if (path.includes('/intake/partner/')) return 'partner';
    if (path.includes('/intake/protection/')) return 'protection';
    if (path.includes('/intake/temporary-work/')) return 'temporary-work';
    return 'partner'; // default
  };
  
  const visaType = getVisaTypeFromPath(pathname);
  const INTAKE_ROUTES = getIntakeRoutes(visaType);
  
  const progress = calculateProgress(pathname, visaType);
  
  // Get real completion data from draftStore
  const completionData = draftSnap.completionStatus || {};
  const completionPercentage = mounted ? draftStore.getCompletionPercentage() : { completed: 0, total: 0, percentage: 0 };
  
  const isRouteActive = (href) => pathname === href;
  
  // Convert route path to completion key (e.g., /intake/partner/start -> partner/start)
  const getCompletionKey = (href) => {
    return href.replace('/intake/', '');
  };
  
  const isRouteCompleted = (href) => {
    const key = getCompletionKey(href);
    return completionData[key] === true;
  };

  const currentSection = INTAKE_ROUTES.find((route) => {
    if (route.href === pathname) return true;
    if (route.subpages) {
      return route.subpages.some((sub) => sub.href === pathname);
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-menu-toggle"
            className="h-9 w-9"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1 ml-4">
            <h2 className="font-serif font-semibold text-sm truncate">
              {currentSection?.title}
            </h2>
            <Progress value={progress} className="h-1 mt-1" />
          </div>
        </div>

        {/* Mobile Section Tabs */}
        {currentSection?.subpages && (
          <ScrollArea className="border-t border-border">
            <div className="flex gap-1 p-2">
              {currentSection.subpages.map((subpage) => {
                const appId = draftSnap.currentApplicationId;
                const href = appId ? `${subpage.href}?applicationId=${appId}` : subpage.href;
                return (
                  <Button
                    key={subpage.href}
                    variant={isRouteActive(subpage.href) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => router.push(href)}
                    className="min-h-8 text-xs whitespace-nowrap"
                    data-testid={`tab-${subpage.href}`}
                  >
                    {subpage.title}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 h-screen z-30 lg:z-0",
            "w-72 bg-sidebar border-r border-sidebar-border",
            "transition-transform duration-300 lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-sidebar-border">
              <BrandLogo priority />
              <p className="text-sm text-sidebar-foreground/70 mt-1">
                Client Portal
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const appId = draftSnap.currentApplicationId;
                  if (appId) {
                    router.push(`/applications/${appId}/questionnaire`);
                  } else {
                    router.push("/applications");
                  }
                }}
                className="mt-3 w-full justify-start text-sm"
                data-testid="button-back-to-applications"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Application
              </Button>
            </div>

            {/* Progress */}
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completion</span>
                <span className="text-sm font-semibold text-primary">
                  {completionPercentage.percentage}%
                </span>
              </div>
              <Progress value={completionPercentage.percentage} className="h-2" />
              <p className="text-xs text-sidebar-foreground/60 mt-2">
                {completionPercentage.completed} of {completionPercentage.total} sections complete
              </p>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
              <nav className="p-4 space-y-2">
                {INTAKE_ROUTES.map((route) => (
                  <div key={route.href}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const appId = draftSnap.currentApplicationId;
                        const href = appId ? `${route.href}?applicationId=${appId}` : route.href;
                        router.push(href);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full justify-start min-h-10 text-sidebar-foreground",
                        isRouteActive(route.href) && "bg-primary/20 font-semibold",
                        !route.subpages && isRouteCompleted(route.href) && "text-sidebar-foreground/70"
                      )}
                      data-testid={`nav-${route.href}`}
                    >
                      {isRouteCompleted(route.href) && (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      {route.title}
                    </Button>

                    {route.subpages && (
                      <div className="ml-4 mt-1 space-y-1">
                        {route.subpages.map((subpage) => (
                          <Button
                            key={subpage.href}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const appId = draftSnap.currentApplicationId;
                              const href = appId ? `${subpage.href}?applicationId=${appId}` : subpage.href;
                              router.push(href);
                              setSidebarOpen(false);
                            }}
                            className={cn(
                              "w-full justify-start min-h-8 text-xs text-sidebar-foreground",
                              isRouteActive(subpage.href) && "bg-primary/20 font-semibold",
                              isRouteCompleted(subpage.href) && "text-sidebar-foreground/70"
                            )}
                            data-testid={`nav-sub-${subpage.href}`}
                          >
                            {isRouteCompleted(subpage.href) && (
                              <Check className="w-3 h-3 mr-2" />
                            )}
                            {subpage.title}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 lg:p-12">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
