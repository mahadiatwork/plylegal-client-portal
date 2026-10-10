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
  getNonMigratingBaseHref,
  getNonMigratingCompletionPrefix,
  buildIntakeHref,
  getApplicationIdFromPathname,
  getInternalIntakeHref,
  getIntakeSlugForContext,
  getIntakeSlugFromPathname,
  getVisaTypeFromPath,
  PARTNER_MAIN_APPLICANT_PROFILE_SUBPAGES,
  PARTNER_SPOUSE_PROFILE_SUBPAGES,
  PARTNER_CHILD_PROFILE_SUBPAGES,
  PROTECTION_MAIN_APPLICANT_PROFILE_SUBPAGES,
  PROTECTION_SPOUSE_PROFILE_SUBPAGES,
  PROTECTION_CHILD_PROFILE_SUBPAGES,
  buildPartnerChildHref,
  buildProtectionChildHref,
} from "@/lib/routes";
import { useState, useEffect } from "react";
import React from "react";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { getApplicationIdFromSearchParams, getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { getApplicationSlug, normalizeApplicationSlug } from "@/lib/visaDisplay";
import { useToast } from "@/hooks/use-toast";
import { DynamicQuestionnaireOverride } from "@/components/questionnaire/DynamicQuestionnaireOverride";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [deletingNmfId, setDeletingNmfId] = useState(null);
  const mobileActiveTabRef = React.useRef(null);
  const internalPathname = getInternalIntakeHref(pathname).split("?")[0];
  const visaType = getVisaTypeFromPath(pathname);
  const nonMigratingBaseHref = getNonMigratingBaseHref(visaType);
  const nonMigratingCompletionPrefix = getNonMigratingCompletionPrefix(visaType);
  const rawPathSlug =
    typeof pathname === "string"
      ? (pathname.match(/^\/applications\/([^/]+)\/[^/]+\/intake(?:\/|$)/) || [])[1] ?? null
      : null;
  const pathSlug = getIntakeSlugFromPathname(pathname);
  const subclassFromQuery = searchParams.get("__subclass");
  const appIdFromUrl = getApplicationIdFromSearchParams(searchParams) ?? getApplicationIdFromPathname(pathname);

  // Active profileId from URL (accept profileId or profileid)
  const profileIdFromUrl = getProfileIdFromSearchParams(searchParams);

  // Child flows use `/temporary-work/children/:childId/details|identity|custody` — id is in the path, not only `?profileId=`.
  const childProfileIdFromPath =
    typeof pathname === "string"
      ? (internalPathname.match(/^\/intake\/(?:temporary-work|partner|protection)\/children\/([^/]+)\/(?:details|other|identity|custody)/) || [])[1] ??
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

  // Keep store "active profile" aligned when navigating via path-only child URLs
  useEffect(() => {
    if (childProfileIdFromPath) {
      draftStore.setActiveProfile(childProfileIdFromPath);
    }
  }, [childProfileIdFromPath]);

  const profiles = storedProfiles;
  const urlSubclass = pathSlug === "186" || pathSlug === "482"
    ? pathSlug
    : (subclassFromQuery === "186" || subclassFromQuery === "482" ? subclassFromQuery : null);
  const currentApp = appIdFromUrl
    ? appsSnap.applications.find((app) => String(app.id) === String(appIdFromUrl))
    : null;
  const resolvedVisaContext = visaType === "temporary-work"
    ? urlSubclass || currentApp?.visaContext || draftSnap.visaContext || null
    : null;
  const remoteQuestionnaireReady =
    mounted &&
    authSnap.isAuthenticated &&
    !draftSnap.isLoading &&
    (!appIdFromUrl || String(draftSnap.currentApplicationId) === String(appIdFromUrl)) &&
    (visaType !== "temporary-work" || resolvedVisaContext === "186" || resolvedVisaContext === "482");
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
    if (rawPathSlug && pathSlug && normalizeApplicationSlug(rawPathSlug) !== rawPathSlug) {
      router.replace(buildIntakeHref({
        slug: pathSlug,
        appId: appIdFromUrl,
        internalHref: `${internalPathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        visaType,
        visaContext: draftSnap.visaContext,
      }));
      return;
    }

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
  }, [pathname, rawPathSlug, appIdFromUrl, pathSlug, subclassFromQuery, visaType, currentApp, draftSnap.visaContext, internalPathname, searchParams, router]);

  const INTAKE_ROUTES = getIntakeRoutes(visaType, draftSnap.visaContext);

  // Get real completion data from draftStore
  const completionData = draftSnap.completionStatus || {};
  const completionPercentage = mounted ? draftStore.getCompletionPercentage() : { completed: 0, total: 0, percentage: 0 };

  const isRouteActive = (href) => internalPathname === href;

  // Convert route path to completion key
  const getCompletionKey = (href) => {
    return href.replace('/intake/', '');
  };

  const isRouteCompleted = (href) => {
    const key = getCompletionKey(href);
    return completionData[key] === true;
  };

  const findProfileById = (profileId) =>
    profiles.find((profile) => String(profile.id) === String(profileId));

  const routeProfile = (() => {
    if (internalPathname.includes("/main-applicant/")) {
      return (
        (profileIdFromUrl ? findProfileById(profileIdFromUrl) : null) ||
        profiles.find((profile) => profile.relationship === "main_applicant") ||
        { id: profileIdFromUrl || null, relationship: "main_applicant" }
      );
    }

    if (internalPathname.includes("/spouse-partner/")) {
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

  // Auto-expand sections that contain the current active route
  useEffect(() => {
    if (mounted) {
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

  // Calculate step sequence index counter
  let globalStepCounter = 0;

  return (
    <div className="relative min-h-screen flex flex-col bg-[#E5EAFF] text-slate-900 overflow-x-hidden">
      {/* Ambient fluid wave background decoration matching client UI */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <svg
          className="absolute -top-12 -right-16 h-[850px] w-[850px] sm:h-[1100px] sm:w-[1100px]"
          viewBox="0 0 1000 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M320 0 C 460 220, 520 480, 950 780 L 1000 780 L 1000 0 Z"
            fill="url(#swoosh-gradient-intake-1)"
            opacity="0.8"
          />
          <path
            d="M180 0 C 380 260, 420 540, 850 900 L 1000 900 L 1000 0 Z"
            fill="url(#swoosh-gradient-intake-2)"
            opacity="0.45"
          />
          <defs>
            <linearGradient id="swoosh-gradient-intake-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#EEF2FF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#E2E7FE" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="swoosh-gradient-intake-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#DEE3FF" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Universal Top Header */}
        <AppHeader />

        {/* Matter Workspace Sub-Header with 4 Tabs */}
        <MatterWorkspaceHeader
          application={currentApp}
          appId={appIdFromUrl || draftSnap.currentApplicationId}
          slug={intakeSlug}
        />

        {/* Mobile Stepper Toggle Bar */}
        <div className="lg:hidden border-b border-[#E2DDD5] bg-[#FAF8F5] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Section Progress</span>
                <span>{completionPercentage.completed} of {completionPercentage.total} complete</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#244D42] transition-all duration-300"
                  style={{ width: `${completionPercentage.percentage}%` }}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="ml-4 h-8 text-xs font-medium border-slate-200"
            >
              {mobileMenuOpen ? "Hide Steps" : "View Steps"}
            </Button>
          </div>
        </div>

        {/* Main 2-Column Content Layout: Single Unified Warm Ivory Card */}
        <div className="mx-auto w-full max-w-[1608px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 flex-1">
          <div className="rounded-2xl border border-white/70 bg-[#FAF8F5] shadow-[0_4px_24px_rgba(20,40,30,0.03)] overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-stretch">
              {/* Left Column: Modern Questionnaire Stepper */}
              <aside
                className={cn(
                  "w-full lg:w-[320px] shrink-0 p-5 sm:p-6 lg:border-r lg:border-[#EBE7DF]/80 space-y-5",
                  mobileMenuOpen ? "block" : "hidden lg:block"
                )}
              >
            {/* Stepper Header & Progress */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 block mb-1">
                QUESTIONNAIRE
              </span>
              <p className="text-sm font-medium text-slate-700">
                {completionPercentage.completed} of {completionPercentage.total} sections complete
              </p>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#244D42] transition-all duration-500 ease-out"
                  style={{ width: `${completionPercentage.percentage}%` }}
                />
              </div>
            </div>

            {/* Stepper Navigation List */}
            <ScrollArea className="max-h-[calc(100vh-280px)] pr-2">
              <nav className="space-y-1 pt-1" aria-label="Questionnaire Sections">
                {INTAKE_ROUTES.map((route) => {
                  const hasSubpages = route.subpages && route.subpages.length > 0;
                  const isExpanded = isSectionExpanded(route.href);

                  // Replace applicant sections with per-profile sections for profile-led visas
                  const isProfileSection =
                    ['temporary-work', 'partner', 'protection'].includes(visaType) && (
                      route.href.includes('/main-applicant') ||
                      route.href.includes('/spouse-partner') ||
                      route.href.includes('/children')
                    );

                  if (isProfileSection) return null;

                  // Profile sections injection point
                  if (['temporary-work', 'partner', 'protection'].includes(visaType) && route.href.endsWith('/profile') && profiles.length > 0) {
                    globalStepCounter += 1;
                    const stepNum = globalStepCounter;
                    const isActive = isRouteActive(route.href);
                    const isComplete = isRouteCompleted(route.href);

                    return (
                      <div key="profile-routes" className="space-y-1">
                        {/* Application Profile nav item */}
                        <button
                          type="button"
                          onClick={() => {
                            navPush(buildHref(route.href));
                            setMobileMenuOpen(false);
                          }}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                            isActive
                              ? "bg-[#EEF7F2] font-semibold text-[#244D42]"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors",
                              isActive
                                ? "bg-[#244D42] font-bold text-white shadow-sm"
                                : isComplete
                                  ? "bg-[#EEF7F2] text-[#244D42] font-semibold"
                                  : "border border-slate-200 text-slate-400 font-medium"
                            )}
                          >
                            {isComplete && !isActive ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : stepNum}
                          </span>
                          <span className="flex-1 truncate">{route.title}</span>
                          {isComplete && <Check className="h-3.5 w-3.5 text-[#244D42] shrink-0" />}
                        </button>

                        {/* Per-profile dynamic sections */}
                        {(() => {
                          const sortedProfiles = [...profiles].sort((a, b) => {
                            const order = { main_applicant: 0, spouse: 1, child: 2, other: 3 };
                            return (order[a.relationship] ?? 4) - (order[b.relationship] ?? 4);
                          });

                          return sortedProfiles.map((profile) => {
                            const profileKey = profile.id;
                            const isProfileExpanded = isSectionExpanded(`profile-${profileKey}`);
                            const profileName = `${profile.given_names || ''} ${profile.family_name || ''}`.trim() || 'Unnamed';
                            const parenLabel =
                              profile.relationship === 'main_applicant'
                                ? 'Main Applicant'
                                : profile.relationship === 'spouse'
                                  ? 'Spouse/Partner'
                                  : profile.relationship === 'child'
                                    ? 'Child'
                                    : 'Dependent';

                            const isThisProfileActive = effectiveProfileId === profileKey;

                            return (
                              <Collapsible
                                key={`profile-${profileKey}`}
                                open={isProfileExpanded || isThisProfileActive}
                                onOpenChange={() => toggleSection(`profile-${profileKey}`)}
                                className="pt-1"
                              >
                                <div className="space-y-1">
                                  <CollapsibleTrigger asChild>
                                    <button
                                      type="button"
                                      className={cn(
                                        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors",
                                        isThisProfileActive && "bg-slate-100/80 text-slate-900"
                                      )}
                                    >
                                      <span className="truncate">
                                        <span className="uppercase text-[11px] font-bold text-slate-500 tracking-wider block">{parenLabel}</span>
                                        <span className="text-sm font-semibold text-slate-800">{profileName}</span>
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                                          (isProfileExpanded || isThisProfileActive) && "transform rotate-180"
                                        )}
                                      />
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="overflow-hidden pl-3 border-l-2 border-slate-100 ml-3 space-y-0.5 mt-1">
                                    {(profile.relationship === 'child'
                                      ? (visaType === 'temporary-work' ? TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES : visaType === 'partner' ? PARTNER_CHILD_PROFILE_SUBPAGES : PROTECTION_CHILD_PROFILE_SUBPAGES).map((sp) => ({
                                        href: visaType === 'temporary-work' ? buildTemporaryWorkChildHref(profileKey, sp.pathSuffix) : visaType === 'partner' ? buildPartnerChildHref(profileKey, sp.pathSuffix) : buildProtectionChildHref(profileKey, sp.pathSuffix),
                                        title: sp.title,
                                        pathSuffix: sp.pathSuffix,
                                      }))
                                      : profile.relationship === 'spouse' && visaType === 'temporary-work' && draftSnap.visaContext === '186'
                                        ? EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                        : profile.relationship === 'spouse' && visaType === 'temporary-work'
                                          ? TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                          : profile.relationship === 'spouse' && visaType === 'partner'
                                            ? PARTNER_SPOUSE_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                            : profile.relationship === 'spouse' && visaType === 'protection'
                                              ? PROTECTION_SPOUSE_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                              : visaType === 'partner'
                                                ? PARTNER_MAIN_APPLICANT_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                                : visaType === 'protection'
                                                  ? PROTECTION_MAIN_APPLICANT_PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                                  : PROFILE_SUBPAGES.map((sp) => ({ ...sp, pathSuffix: null }))
                                    ).map((subpage) => {
                                      globalStepCounter += 1;
                                      const subStepNum = globalStepCounter;
                                      const isActive =
                                        effectiveProfileId === profileKey &&
                                        (profile.relationship === 'child' && subpage.pathSuffix
                                          ? internalPathname === (visaType === 'temporary-work' ? buildTemporaryWorkChildHref(profileKey, subpage.pathSuffix) : visaType === 'partner' ? buildPartnerChildHref(profileKey, subpage.pathSuffix) : buildProtectionChildHref(profileKey, subpage.pathSuffix))
                                          : isRouteActive(subpage.href));
                                      const completionKey = (() => {
                                        if (profile.relationship === 'child') {
                                          return `${visaType}/children/${profileKey}/${subpage.pathSuffix}__${profileKey}`;
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
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navPush(buildHref(subpage.href, { profileId: profileKey }));
                                              setMobileMenuOpen(false);
                                              draftStore.setActiveProfile(profileKey);
                                            }}
                                            className={cn(
                                              "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                                              isActive
                                                ? "bg-[#EEF7F2] font-semibold text-[#244D42]"
                                                : "text-slate-600 hover:bg-slate-50"
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                                                isActive
                                                  ? "bg-[#244D42] text-white font-bold"
                                                  : isComplete
                                                    ? "bg-[#EEF7F2] text-[#244D42] font-semibold"
                                                    : "border border-slate-200 text-slate-400"
                                              )}
                                            >
                                              {isComplete && !isActive ? <Check className="h-3 w-3 stroke-[2.5]" /> : subStepNum}
                                            </span>
                                            <span className="flex-1 truncate">{subpage.title}</span>
                                            {isComplete && <Check className="h-3 w-3 text-[#244D42] shrink-0" />}
                                          </button>

                                          {profile.relationship === 'main_applicant' && (
                                            (visaType === 'temporary-work' && subpage.title === 'Contact Details') ||
                                            (visaType !== 'temporary-work' && subpage.title === 'Family')
                                          ) && (
                                              (() => {
                                                globalStepCounter += 1;
                                                const otherFamilyStepNum = globalStepCounter;
                                                const isOtherFamilyActive = internalPathname === nonMigratingBaseHref;
                                                const isOtherFamilyComplete = draftSnap.completionStatus?.[nonMigratingCompletionPrefix] === true;

                                                return (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      navPush(buildHref(nonMigratingBaseHref));
                                                      setMobileMenuOpen(false);
                                                    }}
                                                    className={cn(
                                                      "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                                                      isOtherFamilyActive
                                                        ? "bg-[#EEF7F2] font-semibold text-[#244D42]"
                                                        : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                  >
                                                    <span
                                                      className={cn(
                                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                                                        isOtherFamilyActive
                                                          ? "bg-[#244D42] text-white font-bold"
                                                          : isOtherFamilyComplete
                                                            ? "bg-[#EEF7F2] text-[#244D42] font-semibold"
                                                            : "border border-slate-200 text-slate-400"
                                                      )}
                                                    >
                                                      {isOtherFamilyComplete && !isOtherFamilyActive ? <Check className="h-3 w-3 stroke-[2.5]" /> : otherFamilyStepNum}
                                                    </span>
                                                    <span className="flex-1 truncate">Other Family</span>
                                                    {isOtherFamilyComplete && <Check className="h-3 w-3 text-[#244D42] shrink-0" />}
                                                  </button>
                                                );
                                              })()
                                            )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            );
                          });
                        })()}

                        {/* Other Family Non-migrating member entries */}
                        {(draftSnap.draft?.non_migrating_members || []).map((member) => {
                          const nmfKey = `nmf-${member.id}`;
                          const isNmfExpanded = isSectionExpanded(nmfKey);
                          const nmfName = [member.passport?.given_names, member.passport?.family_name]
                            .filter(Boolean).join(" ") || "Unnamed Member";
                          const isNmfActive = NON_MIGRATING_MEMBER_SUBPAGES.some(
                            sub => internalPathname === buildNonMigratingHref(member.id, sub.pathSuffix, visaType)
                          );
                          const isConfirmingDelete = deletingNmfId === member.id;

                          return (
                            <Collapsible
                              key={nmfKey}
                              open={isNmfExpanded || isNmfActive}
                              onOpenChange={() => toggleSection(nmfKey)}
                              className="pt-1"
                            >
                              <div className="space-y-1">
                                <CollapsibleTrigger asChild>
                                  <div
                                    className={cn(
                                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors group",
                                      isNmfActive && "bg-slate-100/80 text-slate-900"
                                    )}
                                  >
                                    <span className="truncate flex-1">
                                      <span className="uppercase text-[10px] font-bold text-slate-400 tracking-wider block">
                                        Other Family{member.relationship ? ` (${member.relationship})` : ''}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-800">{nmfName}</span>
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navPush(buildHref(`${nonMigratingBaseHref}?editNonMigratingId=${encodeURIComponent(member.id)}`));
                                          setMobileMenuOpen(false);
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                        title="Edit member"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </span>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingNmfId(isConfirmingDelete ? null : member.id);
                                        }}
                                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                                        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                        title="Remove member"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          "w-4 h-4 text-slate-400 transition-transform duration-200",
                                          (isNmfExpanded || isNmfActive) && "transform rotate-180"
                                        )}
                                      />
                                    </div>
                                  </div>
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

                                <CollapsibleContent className="overflow-hidden pl-3 border-l-2 border-slate-100 ml-3 space-y-0.5 mt-1">
                                  {NON_MIGRATING_MEMBER_SUBPAGES.map((sub) => {
                                    const href = buildNonMigratingHref(member.id, sub.pathSuffix, visaType);
                                    const isActive = internalPathname === href;
                                    return (
                                      <button
                                        key={sub.pathSuffix}
                                        type="button"
                                        onClick={() => {
                                          navPush(buildHref(href));
                                          setMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                                          isActive
                                            ? "bg-[#EEF7F2] font-semibold text-[#244D42]"
                                            : "text-slate-600 hover:bg-slate-50"
                                        )}
                                      >
                                        <span className="truncate">{sub.title}</span>
                                      </button>
                                    );
                                  })}
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
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                                (isRouteActive(route.href) || route.subpages?.some((sub) => isRouteActive(sub.href)))
                                  ? "bg-slate-100 text-slate-900"
                                  : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              <span className="truncate">{route.title}</span>
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0",
                                  isExpanded && "transform rotate-180"
                                )}
                              />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="overflow-hidden pl-3 border-l-2 border-slate-100 ml-3 space-y-0.5 mt-1">
                            {route.subpages.map((subpage) => {
                              globalStepCounter += 1;
                              const stepNum = globalStepCounter;
                              const isActive = isRouteActive(subpage.href);
                              const isComplete = isRouteCompleted(subpage.href);

                              return (
                                <button
                                  key={subpage.href}
                                  type="button"
                                  onClick={() => {
                                    navPush(buildHref(subpage.href));
                                    setMobileMenuOpen(false);
                                  }}
                                  className={cn(
                                    "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                                    isActive
                                      ? "bg-[#EEF7F2] font-semibold text-[#244D42]"
                                      : "text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                                      isActive
                                        ? "bg-[#244D42] text-white font-bold"
                                        : isComplete
                                          ? "bg-[#EEF7F2] text-[#244D42] font-semibold"
                                          : "border border-slate-200 text-slate-400"
                                    )}
                                  >
                                    {isComplete && !isActive ? <Check className="h-3 w-3 stroke-[2.5]" /> : stepNum}
                                  </span>
                                  <span className="flex-1 truncate">{subpage.title}</span>
                                  {isComplete && <Check className="h-3 w-3 text-[#244D42] shrink-0" />}
                                </button>
                              );
                            })}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  } else {
                    globalStepCounter += 1;
                    const stepNum = globalStepCounter;
                    const isActive = isRouteActive(route.href);
                    const isComplete = isRouteCompleted(route.href);

                    return (
                      <button
                        key={route.href}
                        type="button"
                        onClick={() => {
                          navPush(buildHref(route.href));
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                          isActive
                            ? "bg-[#EEF7F2] font-semibold text-[#244D42]"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs transition-colors",
                            isActive
                              ? "bg-[#244D42] font-bold text-white shadow-sm"
                              : isComplete
                                ? "bg-[#EEF7F2] text-[#244D42] font-semibold"
                                : "border border-slate-200 text-slate-400 font-medium"
                          )}
                        >
                          {isComplete && !isActive ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : stepNum}
                        </span>
                        <span className="flex-1 truncate">{route.title}</span>
                        {isComplete && <Check className="h-3.5 w-3.5 text-[#244D42] shrink-0" />}
                      </button>
                    );
                  }
                })}
              </nav>
            </ScrollArea>
          </aside>

          {/* Right Column: Form Canvas */}
          <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10">
            <div className="w-full">
              <DynamicQuestionnaireOverride
                ready={remoteQuestionnaireReady}
                route={internalPathname}
                visaContext={resolvedVisaContext}
                visaType={visaType}
              >
                {children}
              </DynamicQuestionnaireOverride>
            </div>
          </main>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}

