"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, draftStore, authStore } from "@/stores";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import {
  ArrowRight,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { buildIntakeHref, getIntakeRoutes } from "@/lib/routes";
import { formatVisaApplicationType, getApplicationSlug, normalizeApplicationSlug } from "@/lib/visaDisplay";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

function getParamValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getVisaContext(slug) {
  if (slug === "186") return "186";
  if (slug === "482") return "482";
  return null;
}

function getInternalVisaType(slug, application) {
  if (slug === "186" || slug === "482") return "temporary-work";
  if (slug === "820" || slug === "309" || slug === "partner") return "partner";
  if (slug === "protection") return "protection";

  const text = [application?.type, application?.visaTypeCode].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("protection")) return "protection";
  if (text.includes("partner")) return "partner";
  return "temporary-work";
}

function getStartHref(visaType) {
  if (visaType === "protection") return "/intake/protection/start";
  if (visaType === "partner") return "/intake/partner/start";
  return "/intake/temporary-work/start";
}

function getRouteSections(visaType, visaContext) {
  return getIntakeRoutes(visaType, visaContext)
    .filter((route) => !route.href.includes("/submit"))
    .map((route) => ({
      title: route.title,
      count: route.subpages?.length || 1,
      subpages: route.subpages || [],
    }));
}

function getTotalSectionCount(sections) {
  return sections.reduce((total, section) => total + section.count, 0);
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E4E9FF]">
      <div className="rounded-md border border-primary/10 bg-white px-8 py-7 text-center shadow-sm">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading application data...</p>
      </div>
    </div>
  );
}

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuestionnaireLoading, setIsQuestionnaireLoading] = useState(true);

  const applicationsSnap = useSnapshot(applicationsStore);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);

  const appId = getParamValue(params?.id);
  const slugFromUrl = getParamValue(params?.slug);

  const application = applicationsSnap.applications.find(
    (app) => String(app.id) === String(appId)
  );

  const applicationSlug = application
    ? getApplicationSlug(application)
    : normalizeApplicationSlug(slugFromUrl);
  const visaContext = getVisaContext(applicationSlug);
  const visaType = getInternalVisaType(applicationSlug, application);
  const applicationTypeLabel = application ? formatVisaApplicationType(application) : "Visa application";

  const routeSections = useMemo(
    () => getRouteSections(visaType, visaContext),
    [visaType, visaContext]
  );

  const routeSectionTotal = useMemo(() => getTotalSectionCount(routeSections), [routeSections]);

  const completionStatus = draftSnap.completionStatus || {};
  const completion = useMemo(
    () => draftStore.getCompletionPercentage(),
    [completionStatus, draftSnap.draft, draftSnap.visaContext]
  );
  const progress = {
    completed: completion.total > 0 ? completion.completed : 0,
    total: completion.total > 0 ? completion.total : routeSectionTotal,
    percentage: completion.total > 0 ? completion.percentage : 0,
  };
  const hasDraft = draftSnap.draft && Object.keys(draftSnap.draft).length > 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const userId = authSnap.user?.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        if (applicationsSnap.applications.length === 0) {
          await applicationsStore.loadApplications(userId);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);

  useEffect(() => {
    let cancelled = false;

    const loadQuestionnaire = async () => {
      if (!appId) {
        setIsQuestionnaireLoading(false);
        return;
      }

      setIsQuestionnaireLoading(true);

      try {
        if (visaContext) {
          draftStore.setVisaContext(visaContext);
        }

        draftStore.setApplicationId(appId);
        await draftStore.loadDraft(appId);
      } finally {
        if (!cancelled) {
          setIsQuestionnaireLoading(false);
        }
      }
    };

    loadQuestionnaire();

    return () => {
      cancelled = true;
    };
  }, [appId, visaContext]);

  const handleStartQuestionnaire = (event) => {
    event.preventDefault();
    if (!application || !applicationSlug) return;

    setIsNavigating(true);

    const route = buildIntakeHref({
      slug: applicationSlug,
      appId,
      internalHref: getStartHref(visaType),
    });

    startNavigation(route);
    router.push(route);
  };

  if (isLoading || isQuestionnaireLoading || draftSnap.isLoading) {
    return <LoadingState />;
  }

  if (!application) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E4E9FF] px-4">
        <div className="rounded-md border border-primary/10 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-primary">Application not found</h1>
          <p className="mt-2 text-sm text-slate-500">Return to your application list and open the matter again.</p>
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            onClick={() => {
              startNavigation("/applications");
              router.push("/applications");
            }}
          >
            Back to applications
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-[#E4E9FF]">
      <div className="hidden lg:block lg:w-[18.5rem] lg:flex-shrink-0">
        <AppSidebar mode="contextual" application={application} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0">
            <AppSidebar mode="contextual" application={application} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader variant="classic" onMenuClick={() => setSidebarOpen(true)} />

        <div className="lg:hidden">
          <PillNav appId={appId} slug={applicationSlug} />
        </div>

        <main className="flex-1 overflow-y-auto">
          <section className="mx-auto flex w-full max-w-[1608px] justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <div className="w-full max-w-[760px] rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary">
                <ClipboardList className="h-9 w-9" />
              </div>

              <h1 className="mx-auto mt-8 max-w-[28ch] text-center text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                {applicationTypeLabel} Questionnaire
              </h1>

              <p className="mx-auto mt-5 max-w-[52ch] text-center text-base leading-8 text-slate-600">
                This questionnaire helps us build your application properly from the beginning. If you are unsure about any question, let us know and we will guide you through it.
              </p>

              <div className="mx-auto mt-10 w-full max-w-[540px]">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-base font-semibold uppercase tracking-wide text-slate-900">Progress</h2>
                  <span className="text-base font-semibold text-primary">{progress.percentage}%</span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                <p className="mt-4 text-center text-sm text-slate-500">
                  {progress.completed} of {progress.total} sections complete
                </p>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleStartQuestionnaire}
                  disabled={isNavigating}
                  className="inline-flex min-h-12 min-w-[220px] items-center justify-center gap-2 rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-80"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {hasDraft ? "Continue" : "Start questionnaire"}
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
