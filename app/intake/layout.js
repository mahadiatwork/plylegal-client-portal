"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore, authStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Baby,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  GraduationCap,
  HeartHandshake,
  Home,
  Languages,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Pencil,
  Plane,
  Scale,
  Send,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  getIntakeRoutes,
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
import React from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { getApplicationIdFromSearchParams, getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { getApplicationSlug } from "@/lib/visaDisplay";
import { useToast } from "@/hooks/use-toast";

function getRouteIcon(route) {
  const text = `${route?.title || ""} ${route?.href || ""}`.toLowerCase();

  if (text.includes("getting")) return FileText;
  if (text.includes("included")) return Check;
  if (text.includes("submit")) return Send;
  if (text.includes("applicant")) return UsersRound;
  if (text.includes("sponsor") || text.includes("relationship")) return HeartHandshake;
  if (text.includes("child")) return Baby;
  if (text.includes("employment")) return BriefcaseBusiness;
  if (text.includes("education")) return GraduationCap;
  if (text.includes("language")) return Languages;
  if (text.includes("address") || text.includes("contact")) return MapPin;
  if (text.includes("travel") || text.includes("visa")) return Plane;
  if (text.includes("health")) return ShieldCheck;
  if (text.includes("character")) return Scale;
  if (text.includes("family")) return Home;

  return FileCheck2;
}

function SidebarRouteIcon({ route, className }) {
  const Icon = getRouteIcon(route);
  return <Icon className={cn("h-5 w-5 shrink-0", className)} />;
}


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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [deletingNmfId, setDeletingNmfId] = useState(null);
  const mobileActiveTabRef = React.useRef(null);
  const internalPathname = getInternalIntakeHref(pathname).split("?")[0];
  const pathSlug = getIntakeSlugFromPathname(pathname);
  const subclassFromQuery = searchParams.get("__subclass");
  const appIdFromUrl = getApplicationIdFromSearchParams(searchParams) ?? getApplicationIdFromPathname(pathname);

  // Active profileId from URL (accept profileId or profileid)
  const profileIdFromUrl = getProfileIdFromSearchParams(searchParams);

  // Child flows use `/temporary-work/children/:childId/details|identity|custody` — id is in the path, not only `?profileId=`.
  const childProfileIdFromPath =
    typeof pathname === "string"
      ? (internalPathname.match(/^\/intake\/temporary-work\/children\/([^/]+)\/(?:details|other|identity|custody)/) || [])[1] ??
        null
      : null;

  const effectiveProfileId = profileIdFromUrl ?? childProfileIdFromPath;

  // Profiles from draft
  const storedProfiles = draftSnap.draft?.profiles || [];

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
  const profiles = storedProfiles;
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
  const email = authSnap.user?.email || authSnap.userProfile?.email || authSnap.user?.displayName || null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authStore.logout();
    router.push("/login");
  };

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

  // Get real completion data from draftStore
  const completionData = draftSnap.completionStatus || {};
  const completionPercentage = mounted ? draftStore.getCompletionPercentage() : { completed: 0, total: 0, percentage: 0 };

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

  const findProfileById = (profileId) =>
    profiles.find((profile) => String(profile.id) === String(profileId));

  const routeProfile = (() => {
    if (visaType !== "temporary-work") return null;

    if (internalPathname.startsWith("/intake/temporary-work/main-applicant/")) {
      return (
        (profileIdFromUrl ? findProfileById(profileIdFromUrl) : null) ||
        profiles.find((profile) => profile.relationship === "main_applicant") ||
        { id: profileIdFromUrl || null, relationship: "main_applicant" }
      );
    }

    if (internalPathname.startsWith("/intake/temporary-work/spouse-partner/")) {
      return (
        (profileIdFromUrl ? findProfileById(profileIdFromUrl) : null) ||
        profiles.find((profile) => profile.relationship === "spouse") ||
        { id: profileIdFromUrl || null, relationship: "spouse" }
      );
    }

    if (childProfileIdFromPath) {
      return findProfileById(childProfileIdFromPath) || { id: childProfileIdFromPath, relationship: "child" };
    }

    return null;
  })();

  const activeProfile =
    routeProfile ||
    (effectiveProfileId ? findProfileById(effectiveProfileId) : null);

  const getProfileSubpages = (profile) => {
    if (!profile) return [];
    if (profile.relationship === "child") {
      return TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES.map((subpage) => ({
        href: buildTemporaryWorkChildHref(profile.id, subpage.pathSuffix),
        title: subpage.title,
      }));
    }
    if (profile.relationship === "spouse") {
      return draftSnap.visaContext === "186"
        ? EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES
        : TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES;
    }
    return PROFILE_SUBPAGES;
  };

  const getProfileTitle = (profile) => {
    if (!profile) return "";
    if (profile.relationship === "main_applicant") return "Main Applicant";
    if (profile.relationship === "spouse") return "Spouse/Partner";
    if (profile.relationship === "child") return "Child";
    return "Dependent";
  };

  const mobileSection =
    visaType === "temporary-work" && activeProfile
      ? {
          title: getProfileTitle(activeProfile),
          subpages: getProfileSubpages(activeProfile),
          profileId: activeProfile.id,
        }
      : currentSection;

  useEffect(() => {
    mobileActiveTabRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [internalPathname, mobileSection?.profileId, mobileSection?.title]);

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
    <div className="min-h-screen bg-[#E4E9FF] flex flex-col">
      {/* Mobile Header */}
      <div
        className={cn(
          "lg:hidden flex-shrink-0 bg-sidebar text-white border-b border-white/10 transition-[z-index]",
          sidebarOpen ? "z-10" : "z-40"
        )}
      >
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-menu-toggle"
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 ml-4">
            <h2 className="font-serif font-semibold text-base text-[#E6F2EC] truncate">
              {mobileSection?.title}
            </h2>
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#E6F2EC]/90">
              <span>{completionPercentage.percentage}% complete</span>
              <span>{completionPercentage.completed} of {completionPercentage.total} sections</span>
            </div>
            <Progress
              value={completionPercentage.percentage}
              className="mt-1.5 h-2 rounded-full bg-[#2F4A43] [&>div]:bg-[#A7E0C2]"
            />
          </div>
        </div>

        {/* Mobile Section Tabs */}
        {mobileSection?.subpages && (
          <div className="border-t border-white/10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full gap-1 p-2">
              {mobileSection.subpages.map((subpage) => {
                const href = buildHref(subpage.href, mobileSection.profileId ? { profileId: mobileSection.profileId } : {});
                const isActiveTab = isRouteActive(subpage.href);
                return (
                  <Button
                    key={subpage.href}
                    ref={isActiveTab ? mobileActiveTabRef : null}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (mobileSection.profileId) draftStore.setActiveProfile(mobileSection.profileId);
                      navPush(href);
                    }}
                    className={cn(
                      "min-h-8 text-xs whitespace-nowrap",
                      isActiveTab
                        ? "bg-white text-primary hover:bg-white/90"
                        : "text-white hover:bg-white/10 hover:text-white"
                    )}
                    data-testid={`tab-${subpage.href}`}
                  >
                    {subpage.title}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>


      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 h-screen z-30 flex-shrink-0",
            "w-[88vw] max-w-[20.75rem] overflow-hidden border-r border-white/10 bg-sidebar text-white shadow-[18px_0_50px_rgba(12,43,34,0.14)] lg:w-[20.75rem]",
            "transition-transform duration-300 lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="relative h-full flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="absolute left-4 top-4 z-30 h-10 w-10 rounded-md border border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </Button>
            {/* Logo */}
            <div className="relative px-8 pb-7 pt-7">
              <BrandLogo priority className="mx-0 h-[56px]" />
              <p className="mt-1 text-sm text-white/70">
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
                className="mt-6 w-full justify-start px-0 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10"
                data-testid="button-back-to-applications"
              >
                <ArrowLeft className="w-4 h-4 mr-2 text-white" />
                Back to Application
              </Button>
            </div>

            {/* Progress */}
            <div className="relative mx-8 border-t border-white/20 py-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#E6F2EC]/85">Completion</span>
                <span className="text-sm font-semibold text-[#E6F2EC]">
                  {completionPercentage.percentage}%
                </span>
              </div>
              <Progress
                value={completionPercentage.percentage}
                className="h-3 rounded-full bg-[#2F4A43] [&>div]:bg-[#A7E0C2]"
              />
              <p className="mt-3 text-sm font-medium text-[#E6F2EC]">
                {completionPercentage.completed} of {completionPercentage.total} sections complete
              </p>
            </div>

            {/* Navigation */}
            <ScrollArea className="relative flex-1 overflow-x-visible">
              <nav className="px-5 pb-8 pt-1 space-y-2">
                {INTAKE_ROUTES.map((route) => {
                  const hasSubpages = route.subpages && route.subpages.length > 0;
                  const isExpanded = isSectionExpanded(route.href);

                  // ── Replace applicant sections with per-profile sections for profile-led visas ──
                  const isProfileSection =
                    visaType === 'temporary-work' && (
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
                            "w-full justify-start gap-3 min-h-12 rounded-lg border-l-4 border-transparent px-4 text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white",
                            isRouteActive(route.href) && "border-white/70 bg-white/10 text-white shadow-sm",
                            isRouteCompleted(route.href) && !isRouteActive(route.href) && "text-white/60"
                          )}
                        >
                          <SidebarRouteIcon route={route} />
                          {route.title}
                        </Button>

                        {/* Per-profile sections */}
                        {(() => {
                          const sortedProfiles = [...profiles].sort((a, b) => {
                            const order = { main_applicant: 0, spouse: 1, child: 2, other: 3 };
                            return (order[a.relationship] ?? 4) - (order[b.relationship] ?? 4);
                          });
                          return sortedProfiles.map((profile) => {
                          const profileKey = profile.id;
                          const isProfileExpanded = isSectionExpanded(`profile-${profileKey}`);
                          const profileName = `${profile.given_names || ''} ${profile.family_name || ''}`.trim() || 'Unnamed';
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
                                      "mt-2 w-full justify-between gap-3 rounded-lg px-4 py-3 text-left text-white/90 hover:bg-white/10 hover:text-white",
                                      isThisProfileActive && "bg-white/10 text-white"
                                    )}
                                    data-testid={`nav-profile-${profileKey}`}
                                  >
                                    <span className="flex min-w-0 items-center gap-2 text-left">
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold uppercase tracking-[0.02em]">{profileName}</span>
                                        <span className="block truncate text-xs font-normal text-white/70">({parenLabel})</span>
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
                                    ).map((subpage, index) => {
                                      const isActive =
                                        effectiveProfileId === profileKey &&
                                        (profile.relationship === 'child' && subpage.pathSuffix
                                          ? internalPathname === buildTemporaryWorkChildHref(profileKey, subpage.pathSuffix)
                                          : isRouteActive(subpage.href));
                                      const completionKey = (() => {
                                        if (profile.relationship === 'child') {
                                          return `${getTemporaryWorkChildProfileCompletionKey(profileKey, subpage.pathSuffix)}__${profileKey}`;
                                        }
                                        const section = profile.relationship === 'spouse' ? 'spouse-partner' : 'main-applicant';
                                        return `${visaType}/${section}/${subpage.href.split(/\/(?:main-applicant|spouse-partner)\//)[1]}__${profileKey}`;
                                      })();
                                      const legacyCompletionKey = completionKey.includes("__") ? completionKey.split("__")[0] : completionKey;
                                      const isComplete =
                                        draftSnap.completionStatus?.[completionKey] === true ||
                                        draftSnap.completionStatus?.[legacyCompletionKey] === true;
                                      return (
                                        <React.Fragment key={`${subpage.href}-${profileKey}`}>
                                          <li className="flex items-center before:content-['•'] before:text-[#f2d887] before:mr-3 before:text-sm">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                navPush(buildHref(subpage.href, { profileId: profileKey }));
                                                setSidebarOpen(false);
                                                draftStore.setActiveProfile(profileKey);
                                              }}
                                              className={cn(
                                                "w-full flex-1 justify-start min-h-7 px-0 text-[13px] font-medium hover:bg-transparent transition-colors",
                                                isActive
                                                  ? "font-semibold text-white"
                                                  : "text-white/80",
                                                isComplete && !isActive && "text-white/50"
                                              )}
                                              data-testid={`nav-sub-${subpage.href}-${profileKey}`}
                                            >
                                              {isComplete && <Check className="w-3 h-3 mr-2" />}
                                              {subpage.title}
                                            </Button>
                                          </li>
                                          {draftSnap.visaContext === '186' && profile.relationship === 'main_applicant' && subpage.title === 'Contact Details' && (
                                            (() => {
                                              const isActive = internalPathname === '/intake/temporary-work/non-migrating';
                                              const isComplete = draftSnap.completionStatus?.["temporary-work/non-migrating"] === true;

                                              return (
                                                <li className="flex items-center before:content-['•'] before:text-[#f2d887] before:mr-3 before:text-sm">
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                      navPush("/intake/temporary-work/non-migrating");
                                                      setSidebarOpen(false);
                                                    }}
                                                    className={cn(
                                                      "w-full flex-1 justify-start min-h-7 px-0 text-[13px] font-medium hover:bg-transparent transition-colors",
                                                      isActive
                                                        ? "font-semibold text-white"
                                                        : "text-white/80",
                                                      isComplete && !isActive && "text-white/50"
                                                    )}
                                                  >
                                                    {isComplete && <Check className="w-3 h-3 mr-2" />}
                                                    Other Family
                                                  </Button>
                                                </li>
                                              );
                                            })()
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </ul>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        });
                        })()}

                        {/* Other Family — 186 only */}
                        {draftSnap.visaContext === '186' && (draftSnap.draft?.non_migrating_members || []).map((member) => {
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
                                      "mt-2 w-full justify-between gap-3 rounded-lg px-4 py-3 text-left text-white/90 hover:bg-white/10 hover:text-white group",
                                      isNmfActive && "bg-white/10 text-white"
                                    )}
                                  >
                                    <span className="flex items-center gap-2 text-left flex-1 min-w-0">
                                      <UserMinus className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
                                      <span className="flex-1 truncate">
                                        <span className="block text-xs text-white/50">
                                          Other Family{member.relationship ? ` (${member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1)})` : ''}
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
                                          navPush(`/intake/temporary-work/non-migrating?editNonMigratingId=${encodeURIComponent(member.id)}`);
                                          setSidebarOpen(false);
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                                        className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity cursor-pointer"
                                        title="Edit member"
                                      >
                                        <Pencil className="w-3 h-3 text-white/70" />
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
                                        <li key={sub.pathSuffix} className="flex items-center before:content-['•'] before:text-[#f2d887] before:mr-3 before:text-sm">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              navPush(buildHref(href));
                                              setSidebarOpen(false);
                                            }}
                                            className={cn(
                                              "w-full flex-1 justify-start min-h-7 px-0 text-[13px] font-medium hover:bg-transparent transition-colors",
                                              isActive
                                                ? "font-semibold text-white"
                                                : "text-white/80"
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
                                "w-full justify-between gap-3 min-h-12 rounded-lg border-l-4 border-transparent px-4 text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white",
                                (isRouteActive(route.href) || route.subpages?.some((sub) => isRouteActive(sub.href))) && "border-white/70 bg-white/10 text-white shadow-sm"
                              )}
                              data-testid={`nav-${route.href}`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <SidebarRouteIcon route={route} />
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
                                  <li key={subpage.href} className="flex items-center before:content-['•'] before:text-[#f2d887] before:mr-3 before:text-sm">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        navPush(buildHref(subpage.href));
                                        setSidebarOpen(false);
                                      }}
                                      className={cn(
                                        "w-full flex-1 justify-start min-h-7 px-0 text-[13px] font-medium hover:bg-transparent transition-colors",
                                        isActive 
                                          ? "font-semibold text-white"
                                          : "text-white/80",
                                        isRouteCompleted(subpage.href) && !isActive && "text-white/50"
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
                          "w-full justify-start gap-3 min-h-12 rounded-lg border-l-4 border-transparent px-4 text-sm font-semibold text-white/90 hover:bg-white/10 hover:text-white",
                          isRouteActive(route.href) && "border-white/70 bg-white/10 text-white shadow-sm",
                          isRouteCompleted(route.href) && !isRouteActive(route.href) && "text-white/60"
                        )}
                        data-testid={`nav-${route.href}`}
                      >
                        <SidebarRouteIcon route={route} />
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
        <main className="relative flex-1 overflow-y-auto bg-[#E4E9FF] px-4 pb-12 pt-4 sm:px-8 lg:ml-[20.75rem] lg:px-10 xl:px-16">
          <div className="relative z-10 flex min-h-full flex-col">
            <div className="hidden h-20 items-center justify-end gap-5 sm:flex">
              {email && (
                <span className="inline-flex max-w-[260px] items-center gap-3 truncate rounded-full border border-slate-200 bg-white/75 px-5 py-3 text-sm font-medium text-slate-900 shadow-sm backdrop-blur">
                  <UserRound className="h-4 w-4 shrink-0 text-primary" />
                  {email}
                </span>
              )}
              <div className="h-8 w-px bg-slate-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                data-testid="button-logout"
                className="h-11 px-4 text-sm font-semibold text-primary hover:bg-primary/5 hover:text-primary disabled:opacity-70"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
              </Button>
            </div>

            <div className="flex flex-1 justify-center pt-4 lg:pt-8">
              <div className="w-full max-w-4xl">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
