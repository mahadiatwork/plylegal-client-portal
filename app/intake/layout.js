"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Menu, X, ArrowLeft, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { getIntakeRoutes, calculateProgress, PROFILE_SUBPAGES } from "@/lib/routes";
import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";


export default function IntakeLayout({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const draftSnap = useSnapshot(draftStore);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Active profileId from URL
  const profileIdFromUrl = searchParams.get('profileId');

  // Profiles from draft
  const profiles = draftSnap.draft?.profiles || [];

  // Prevent hydration mismatch by only rendering interactive elements after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep draft/application context in sync with URL param
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);



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

  useEffect(() => {
    if (mounted && completionData) {
      console.log('Completion Status:', completionData);
      console.log('Completion Keys:', Object.keys(completionData));
    }
  }, [mounted, completionData]);

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

  // Auto-expand sections that contain the current active route
  useEffect(() => {
    if (mounted) {
      // Find the section containing the current route
      const activeSection = INTAKE_ROUTES.find((route) => {
        if (route.href === pathname) return true;
        if (route.subpages) {
          return route.subpages.some((sub) => sub.href === pathname);
        }
        return false;
      });
      
      if (activeSection && activeSection.subpages) {
        setExpandedSections((prev) => {
          const newSet = new Set(prev);
          newSet.add(activeSection.href);
          return newSet;
        });
      }
    }
  }, [mounted, pathname]);

  const toggleSection = (href) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(href)) {
        newSet.delete(href);
      } else {
        newSet.add(href);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (href) => expandedSections.has(href);

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
                {INTAKE_ROUTES.map((route) => {
                  const hasSubpages = route.subpages && route.subpages.length > 0;
                  const isExpanded = isSectionExpanded(route.href);

                  // ── For temporary-work: replace Main Applicant / Spouse / Children with per-profile sections ──
                  // Only suppress the static sections AFTER profiles have been added. Before that, show them normally.
                  const isProfileSection = visaType === 'temporary-work' &&
                    profiles.length > 0 && (
                      route.href.includes('/main-applicant') ||
                      route.href.includes('/spouse-partner') ||
                      route.href === '/intake/temporary-work/children'
                    );

                  if (isProfileSection) return null; // replaced by dynamic profile sections below

                  // ── Profile sections injection point (after Application Profile route) ──
                  if (visaType === 'temporary-work' && route.href === '/intake/temporary-work/profile' && profiles.length > 0) {
                    return (
                      <div key="profile-routes">
                        {/* Application Profile nav item */}
                        <Button
                          variant="ghost"
                          onClick={() => {
                            const appId = draftSnap.currentApplicationId;
                            const href = appId ? `${route.href}?applicationId=${appId}` : route.href;
                            router.push(href);
                            setSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full justify-start min-h-10 text-sidebar-foreground hover:bg-sidebar-accent",
                            isRouteActive(route.href) && "bg-primary/20 font-semibold",
                            isRouteCompleted(route.href) && "text-sidebar-foreground/70"
                          )}
                        >
                          {isRouteCompleted(route.href) && <Check className="w-4 h-4 mr-2" />}
                          {route.title}
                        </Button>

                        {/* Per-profile sections */}
                        {profiles.map((profile) => {
                          const profileKey = profile.id;
                          const isProfileExpanded = isSectionExpanded(`profile-${profileKey}`);
                          const profileName = `${profile.given_names || ''} ${profile.family_name || ''}`.trim() || 'Unnamed';
                          const relLabel = {
                            main_applicant: 'Main Applicant',
                            spouse: 'Spouse/Partner',
                            child: 'Child',
                            other: 'Other',
                          }[profile.relationship] || profile.relationship;

                          // Check if any subpage for this profile is currently active
                          const isThisProfileActive = profileIdFromUrl === profileKey;

                          return (
                            <Collapsible
                              key={`profile-${profileKey}`}
                              open={isProfileExpanded || isThisProfileActive}
                              onOpenChange={() => toggleSection(`profile-${profileKey}`)}
                            >
                              <div className="space-y-1">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "w-full justify-between min-h-10 text-sidebar-foreground hover:bg-sidebar-accent",
                                      isThisProfileActive && "bg-primary/20"
                                    )}
                                    data-testid={`nav-profile-${profileKey}`}
                                  >
                                    <span className="flex items-center gap-2 text-left">
                                      <span className="flex-1 truncate">
                                        <span className="block text-xs text-sidebar-foreground/60">{relLabel}</span>
                                        <span className="font-medium">{profileName}</span>
                                      </span>
                                    </span>
                                    <ChevronDown
                                      className={cn(
                                        "w-4 h-4 transition-transform duration-200 flex-shrink-0",
                                        (isProfileExpanded || isThisProfileActive) && "transform rotate-180"
                                      )}
                                    />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-hidden">
                                  <ul className="ml-6 mt-1 mb-1 space-y-1">
                                    {PROFILE_SUBPAGES.map((subpage) => {
                                      const isActive = isRouteActive(subpage.href) && profileIdFromUrl === profileKey;
                                      const completionKey = `${visaType}/main-applicant/${subpage.href.split('/main-applicant/')[1]}__${profileKey}`;
                                      const isComplete = draftSnap.completionStatus?.[completionKey] === true;
                                      return (
                                        <li key={`${subpage.href}-${profileKey}`} className="flex items-center before:content-['•'] before:text-sidebar-foreground/60 before:mr-2 before:text-sm">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              const appId = draftSnap.currentApplicationId;
                                              const url = new URLSearchParams();
                                              if (appId) url.set('applicationId', appId);
                                              url.set('profileId', profileKey);
                                              router.push(`${subpage.href}?${url.toString()}`);
                                              setSidebarOpen(false);
                                              draftStore.setActiveProfile(profileKey);
                                            }}
                                            className={cn(
                                              "w-full justify-start min-h-8 text-xs hover:bg-sidebar-accent flex-1 transition-colors",
                                              isActive
                                                ? "font-bold text-[#4FD1C7] bg-[#4FD1C7]/15 hover:bg-[#4FD1C7]/20"
                                                : "text-sidebar-foreground",
                                              isComplete && !isActive && "text-sidebar-foreground/70"
                                            )}
                                            data-testid={`nav-sub-${subpage.href}-${profileKey}`}
                                          >
                                            {isComplete && <Check className="w-3 h-3 mr-2" />}
                                            {subpage.title}
                                          </Button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })}
                      </div>
                    );
                  }

                  if (hasSubpages) {
                    return (
                      <Collapsible
                        key={route.href}
                        open={isExpanded}
                        onOpenChange={() => toggleSection(route.href)}
                      >
                        <div className="space-y-1">
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-between min-h-10 text-sidebar-foreground hover:bg-sidebar-accent",
                                (isRouteActive(route.href) || route.subpages?.some((sub) => isRouteActive(sub.href))) && "bg-primary/20"
                              )}
                              data-testid={`nav-${route.href}`}
                            >
                              <span className="flex items-center">
                                {isRouteCompleted(route.href) && (
                                  <Check className="w-4 h-4 mr-2" />
                                )}
                                {route.title}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 transition-transform duration-200",
                                  isExpanded && "transform rotate-180"
                                )}
                              />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="overflow-hidden">
                            <ul className="ml-6 mt-1 mb-1 space-y-1">
                              {route.subpages.map((subpage) => {
                                const isActive = isRouteActive(subpage.href);
                                return (
                                  <li key={subpage.href} className="flex items-center before:content-['•'] before:text-sidebar-foreground/60 before:mr-2 before:text-sm">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const appId = draftSnap.currentApplicationId;
                                        const href = appId ? `${subpage.href}?applicationId=${appId}` : subpage.href;
                                        router.push(href);
                                        setSidebarOpen(false);
                                      }}
                                      className={cn(
                                        "w-full justify-start min-h-8 text-xs hover:bg-sidebar-accent flex-1 transition-colors",
                                        isActive 
                                          ? "font-bold text-[#4FD1C7] bg-[#4FD1C7]/15 hover:bg-[#4FD1C7]/20" 
                                          : "text-sidebar-foreground",
                                        isRouteCompleted(subpage.href) && !isActive && "text-sidebar-foreground/70"
                                      )}
                                      data-testid={`nav-sub-${subpage.href}`}
                                    >
                                      {isRouteCompleted(subpage.href) && (
                                        <Check className="w-3 h-3 mr-2" />
                                      )}
                                      {subpage.title}
                                    </Button>
                                  </li>
                                );
                              })}
                            </ul>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  } else {
                    return (
                      <Button
                        key={route.href}
                        variant="ghost"
                        onClick={() => {
                          const appId = draftSnap.currentApplicationId;
                          const href = appId ? `${route.href}?applicationId=${appId}` : route.href;
                          router.push(href);
                          setSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full justify-start min-h-10 text-sidebar-foreground hover:bg-sidebar-accent",
                          isRouteActive(route.href) && "bg-primary/20 font-semibold",
                          isRouteCompleted(route.href) && "text-sidebar-foreground/70"
                        )}
                        data-testid={`nav-${route.href}`}
                      >
                        {isRouteCompleted(route.href) && (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        {route.title}
                      </Button>
                    );
                  }
                })}
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
