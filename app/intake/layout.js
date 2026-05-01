"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore, authStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Menu, X, ArrowLeft, ChevronDown, UserMinus, Pencil, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  getIntakeRoutes,
  calculateProgress,
  PROFILE_SUBPAGES,
  EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES,
  TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES,
  TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES,
  buildTemporaryWorkChildHref,
  getTemporaryWorkChildProfileCompletionKey,
  NON_MIGRATING_MEMBER_SUBPAGES,
  buildNonMigratingHref,
  buildIntakeHref,
  getApplicationIdFromPathname,
  getInternalIntakeHref,
  getIntakeSlugForContext,
  getIntakeSlugFromPathname,
  getVisaTypeFromPath,
} from "@/lib/routes";
import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { getApplicationIdFromSearchParams, getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { getApplicationSlug } from "@/lib/visaDisplay";
import { useToast } from "@/hooks/use-toast";


export default function IntakeLayout({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const { startNavigation } = useNavigationLoading();

  // Wrapper that triggers the navigation progress indicator before every router.push
  const navPush = (href) => {
    startNavigation(href);
    router.push(href);
  };
  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [deletingNmfId, setDeletingNmfId] = useState(null);
  const internalPathname = getInternalIntakeHref(pathname).split("?")[0];
  const pathSlug = getIntakeSlugFromPathname(pathname);
  const subclassFromQuery = searchParams.get("__subclass");
  const appIdFromUrl = getApplicationIdFromSearchParams(searchParams) ?? getApplicationIdFromPathname(pathname);

  // Active profileId from URL (accept profileId or profileid)
  const profileIdFromUrl = getProfileIdFromSearchParams(searchParams);

  // Child flows use `/temporary-work/children/:childId/details|identity|custody` — id is in the path, not only `?profileId=`.
  const childProfileIdFromPath =
    typeof pathname === "string"
      ? (internalPathname.match(/^\/intake\/temporary-work\/children\/([^/]+)\/(?:details|identity|custody)/) || [])[1] ??
        null
      : null;

  const effectiveProfileId = profileIdFromUrl ?? childProfileIdFromPath;

  // Profiles from draft
  const profiles = draftSnap.draft?.profiles || [];

  // Prevent hydration mismatch by only rendering interactive elements after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep draft/application context in sync with URL param
  useEffect(() => {
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [appIdFromUrl, draftSnap.currentApplicationId]);

  useEffect(() => {
    if (authSnap.user?.id && appsSnap.applications.length === 0) {
      applicationsStore.loadApplications(authSnap.user.id);
    }
  }, [authSnap.user?.id, appsSnap.applications.length]);

  // Keep store "active profile" aligned when navigating via path-only child URLs (e.g. Next from spouse Identity).
  useEffect(() => {
    if (childProfileIdFromPath) {
      draftStore.setActiveProfile(childProfileIdFromPath);
    }
  }, [childProfileIdFromPath]);

  const visaType = getVisaTypeFromPath(pathname);
  const urlSubclass = pathSlug === "186" || pathSlug === "482"
    ? pathSlug
    : (subclassFromQuery === "186" || subclassFromQuery === "482" ? subclassFromQuery : null);
  const currentApp = appIdFromUrl
    ? appsSnap.applications.find((app) => String(app.id) === String(appIdFromUrl))
    : null;
  const intakeSlug = pathSlug || subclassFromQuery || (currentApp ? getApplicationSlug(currentApp) : getIntakeSlugForContext(visaType, draftSnap.visaContext));
  const buildHref = (href, options = {}) => buildIntakeHref({
    slug: intakeSlug,
    appId: appIdFromUrl || draftSnap.currentApplicationId,
    internalHref: href,
    visaType,
    visaContext: draftSnap.visaContext,
    ...options,
  });

  useEffect(() => {
    if (urlSubclass && urlSubclass !== draftSnap.visaContext) {
      draftStore.setVisaContext(urlSubclass);
      if (appIdFromUrl) {
        draftStore.saveDraft({ visaContext: urlSubclass }, appIdFromUrl);
      }
    }
  }, [urlSubclass, draftSnap.visaContext, appIdFromUrl]);

  useEffect(() => {
    const isLegacyIntakeUrl = typeof pathname === "string" && pathname.startsWith("/intake/");
    if (!isLegacyIntakeUrl || !appIdFromUrl || pathSlug || subclassFromQuery) return;
    if (visaType === "temporary-work" && !currentApp && !draftSnap.visaContext) return;

    const slug = currentApp ? getApplicationSlug(currentApp) : getIntakeSlugForContext(visaType, draftSnap.visaContext);
    router.replace(buildIntakeHref({
      slug,
      appId: appIdFromUrl,
      internalHref: `${internalPathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
      visaType,
      visaContext: draftSnap.visaContext,
    }));
  }, [pathname, appIdFromUrl, pathSlug, subclassFromQuery, visaType, currentApp, draftSnap.visaContext, internalPathname, searchParams, router]);

  const INTAKE_ROUTES = getIntakeRoutes(visaType, draftSnap.visaContext);

  const progress = calculateProgress(internalPathname, visaType, draftSnap.visaContext);

  // Get real completion data from draftStore
  const completionData = draftSnap.completionStatus || {};
  const completionPercentage = mounted ? draftStore.getCompletionPercentage() : { completed: 0, total: 0, percentage: 0 };

  useEffect(() => {
    if (mounted && completionData) {
      console.log('Completion Status:', completionData);
      console.log('Completion Keys:', Object.keys(completionData));
    }
  }, [mounted, completionData]);

  const isRouteActive = (href) => internalPathname === href;

  // Convert route path to completion key (e.g., /intake/partner/start -> partner/start)
  const getCompletionKey = (href) => {
    return href.replace('/intake/', '');
  };

  const isRouteCompleted = (href) => {
    const key = getCompletionKey(href);
    return completionData[key] === true;
  };

  const currentSection = INTAKE_ROUTES.find((route) => {
    if (route.href === internalPathname) return true;
    if (route.subpages) {
      return route.subpages.some((sub) => sub.href === internalPathname);
    }
    return false;
  });

  // Auto-expand sections that contain the current active route
  useEffect(() => {
    if (mounted) {
      // Find the section containing the current route
      const activeSection = INTAKE_ROUTES.find((route) => {
        if (route.href === internalPathname) return true;
        if (route.subpages) {
          return route.subpages.some((sub) => sub.href === internalPathname);
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
  }, [mounted, internalPathname]);

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
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      {/* Mobile Header */}
      <div className="lg:hidden flex-shrink-0 z-40 bg-card border-b border-card-border">
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
                const href = buildHref(subpage.href);
                return (
                  <Button
                    key={subpage.href}
                    variant={isRouteActive(subpage.href) ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navPush(href)}
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


      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 h-screen z-30 flex-shrink-0",
            "w-[17.5rem] bg-sidebar border-r border-sidebar-border",
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
                    navPush(`/applications/${intakeSlug}/${appId}/questionnaire`);
                  } else {
                    navPush("/applications");
                  }
                }}
                className="mt-3 w-full justify-start text-sm text-white hover:text-white hover:bg-white/10"
                data-testid="button-back-to-applications"
              >
                <ArrowLeft className="w-4 h-4 mr-2 text-white" />
                Back to Application
              </Button>
            </div>

            {/* Progress */}
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Completion</span>
                <span className="text-sm font-semibold text-white">
                  {completionPercentage.percentage}%
                </span>
              </div>
              <Progress value={completionPercentage.percentage} className="h-2" />
              <p className="text-xs text-white mt-2">
                {completionPercentage.completed} of {completionPercentage.total} sections complete
              </p>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 overflow-x-visible">
              <nav className="p-4 pr-3 space-y-2">
                {INTAKE_ROUTES.map((route) => {
                  const hasSubpages = route.subpages && route.subpages.length > 0;
                  const isExpanded = isSectionExpanded(route.href);

                  // ── For temporary-work: replace Main Applicant / Spouse / Children with per-profile sections ──
                  const isProfileSection = visaType === 'temporary-work' && (
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
                            navPush(buildHref(route.href));
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
                        {(() => {
                          const sortedProfiles = [...profiles].sort((a, b) => {
                            const order = { main_applicant: 0, spouse: 1, child: 2, other: 3 };
                            return (order[a.relationship] ?? 4) - (order[b.relationship] ?? 4);
                          });
                          let nextApplicantSlot = 3;
                          return sortedProfiles.map((profile) => {
                          const profileKey = profile.id;
                          const isProfileExpanded = isSectionExpanded(`profile-${profileKey}`);
                          const profileName = `${profile.given_names || ''} ${profile.family_name || ''}`.trim() || 'Unnamed';
                          let applicantOrdinal;
                          if (profile.relationship === 'main_applicant') {
                            applicantOrdinal = 1;
                          } else if (profile.relationship === 'spouse') {
                            applicantOrdinal = 2;
                          } else {
                            applicantOrdinal = nextApplicantSlot;
                            nextApplicantSlot += 1;
                          }
                          // Type label only (name is shown on the line below). Child/others must not use full name here.
                          const parenLabel =
                            profile.relationship === 'main_applicant'
                              ? 'Main Applicant'
                              : profile.relationship === 'spouse'
                                ? 'Spouse/Partner'
                                : profile.relationship === 'child'
                                  ? 'Child'
                                  : profile.relationship === 'other'
                                    ? 'Dependent'
                                    : 'Dependent';

                          // Check if any subpage for this profile is currently active (query or child path)
                          const isThisProfileActive = effectiveProfileId === profileKey;

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
                                        <span className="block text-xs text-sidebar-foreground/60">
                                          Applicant {applicantOrdinal} ({parenLabel})
                                        </span>
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
                                    {(profile.relationship === 'child'
                                      ? TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES.map((sp) => ({
                                          href: buildTemporaryWorkChildHref(profileKey, sp.pathSuffix),
                                          title: sp.title,
                                          pathSuffix: sp.pathSuffix,
                                        }))
                                      : profile.relationship === 'spouse' && draftSnap.visaContext === '186'
                                          ? EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                          : profile.relationship === 'spouse'
                                            ? TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                            : PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                    ).map((subpage) => {
                                      const isActive =
                                        effectiveProfileId === profileKey &&
                                        (profile.relationship === 'child' && subpage.pathSuffix
                                          ? internalPathname === buildTemporaryWorkChildHref(profileKey, subpage.pathSuffix)
                                          : isRouteActive(subpage.href));
                                      const completionKey =
                                        profile.relationship === 'child'
                                          ? `${getTemporaryWorkChildProfileCompletionKey(profileKey, subpage.pathSuffix)}__${profileKey}`
                                          : `${visaType}/${profile.relationship === 'spouse' ? 'spouse-partner' : 'main-applicant'}/${subpage.href.split(/\/(?:main-applicant|spouse-partner)\//)[1]}__${profileKey}`;
                                      const isComplete = draftSnap.completionStatus?.[completionKey] === true;
                                      return (
                                        <li key={`${subpage.href}-${profileKey}`} className="flex items-center before:content-['•'] before:text-sidebar-foreground/60 before:mr-2 before:text-sm">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              navPush(buildHref(subpage.href, { profileId: profileKey }));
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
                        });
                        })()}

                        {/* Non-Migrating Family Members */}
                        {(draftSnap.draft?.non_migrating_members || []).map((member) => {
                          const nmfKey = `nmf-${member.id}`;
                          const isNmfExpanded = isSectionExpanded(nmfKey);
                          const nmfName = [member.passport?.given_names, member.passport?.family_name]
                            .filter(Boolean).join(" ") || "Unnamed Member";
                          const dob = [member.passport?.dob_day, member.passport?.dob_month, member.passport?.dob_year]
                            .filter(Boolean).join(" ");
                          const isNmfActive = NON_MIGRATING_MEMBER_SUBPAGES.some(
                            sub => internalPathname === buildNonMigratingHref(member.id, sub.pathSuffix)
                          );
                          const isConfirmingDelete = deletingNmfId === member.id;

                          return (
                            <Collapsible
                              key={nmfKey}
                              open={isNmfExpanded || isNmfActive}
                              onOpenChange={() => toggleSection(nmfKey)}
                            >
                              <div className="space-y-1">
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "w-full justify-between min-h-10 text-sidebar-foreground hover:bg-sidebar-accent group",
                                      isNmfActive && "bg-amber-500/10"
                                    )}
                                  >
                                    <span className="flex items-center gap-2 text-left flex-1 min-w-0">
                                      <UserMinus className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                      <span className="flex-1 truncate">
                                        <span className="block text-xs text-sidebar-foreground/50">
                                          Non-Migrating{member.relationship ? ` (${member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1)})` : ''}
                                        </span>
                                        <span className="font-medium truncate">{nmfName}</span>
                                      </span>
                                    </span>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const base = buildHref("/intake/temporary-work/profile", {
                                            internalHref: "/intake/temporary-work/profile",
                                            profileId: null,
                                          });
                                          const sep = base.includes("?") ? "&" : "?";
                                          navPush(`${base}${sep}editNonMigratingId=${encodeURIComponent(member.id)}`);
                                          setSidebarOpen(false);
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                                        className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-amber-100 transition-opacity cursor-pointer"
                                        title="Edit member"
                                      >
                                        <Pencil className="w-3 h-3 text-amber-600" />
                                      </span>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingNmfId(isConfirmingDelete ? null : member.id);
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                                        className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-opacity cursor-pointer"
                                        title="Remove member"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          "w-4 h-4 transition-transform duration-200",
                                          (isNmfExpanded || isNmfActive) && "transform rotate-180"
                                        )}
                                      />
                                    </div>
                                  </Button>
                                </CollapsibleTrigger>

                                {isConfirmingDelete && (
                                  <div className="mx-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2">
                                    <p className="text-red-700 font-medium">Remove {nmfName}?</p>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                        onClick={async () => {
                                          const ok = await draftStore.deleteNonMigratingMember(member.id);
                                          if (!ok) {
                                            toast({
                                              variant: "destructive",
                                              title: "Could not remove",
                                              description:
                                                "We could not sync the change to your draft. Check that you are signed in and try again.",
                                            });
                                            return;
                                          }
                                          setDeletingNmfId(null);
                                        }}
                                      >
                                        Yes, remove
                                      </button>
                                      <button
                                        type="button"
                                        className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                                        onClick={() => setDeletingNmfId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <CollapsibleContent className="overflow-hidden">
                                  <ul className="ml-6 mt-1 mb-1 space-y-1">
                                    {NON_MIGRATING_MEMBER_SUBPAGES.map((sub) => {
                                      const href = buildNonMigratingHref(member.id, sub.pathSuffix);
                                      const isActive = internalPathname === href;
                                      return (
                                        <li key={sub.pathSuffix} className="flex items-center before:content-['•'] before:text-sidebar-foreground/60 before:mr-2 before:text-sm">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              navPush(buildHref(href));
                                              setSidebarOpen(false);
                                            }}
                                            className={cn(
                                              "w-full justify-start min-h-8 text-xs hover:bg-sidebar-accent flex-1 transition-colors",
                                              isActive
                                                ? "font-bold text-amber-600 bg-amber-500/10 hover:bg-amber-500/15"
                                                : "text-sidebar-foreground"
                                            )}
                                          >
                                            {sub.title}
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
                                        navPush(buildHref(subpage.href));
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
                          navPush(buildHref(route.href));
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

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-20 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 lg:ml-[17.5rem]">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
