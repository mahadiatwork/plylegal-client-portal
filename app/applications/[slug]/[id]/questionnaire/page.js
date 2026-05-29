"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, draftStore, authStore } from "@/stores";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Headphones,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { buildIntakeHref, getIntakeRoutes } from "@/lib/routes";
import { formatVisaApplicationType, getApplicationSlug } from "@/lib/visaDisplay";
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
  if (slug === "partner" || slug === "protection") return slug;

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

function InfoPanel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-md border border-emerald-950/10 bg-white/90 p-6 shadow-sm shadow-emerald-950/5 backdrop-blur">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="font-serif text-xl font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="pt-5">{children}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9f5]">
      <div className="rounded-md border border-emerald-950/10 bg-white px-8 py-7 text-center shadow-sm">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-900" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading application data...</p>
      </div>
    </div>
  );
}

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const sectionsRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSections, setShowSections] = useState(false);

  const applicationsSnap = useSnapshot(applicationsStore);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);

  const appId = getParamValue(params?.id);
  const slugFromUrl = getParamValue(params?.slug);

  const application = applicationsSnap.applications.find(
    (app) => String(app.id) === String(appId)
  );

  const applicationSlug = slugFromUrl || (application ? getApplicationSlug(application) : null);
  const visaContext = getVisaContext(applicationSlug);
  const visaType = getInternalVisaType(applicationSlug, application);
  const applicationTypeLabel = application ? formatVisaApplicationType(application) : "Visa application";

  const routeSections = useMemo(
    () => getRouteSections(visaType, visaContext),
    [visaType, visaContext]
  );

  const routeSectionTotal = useMemo(() => getTotalSectionCount(routeSections), [routeSections]);

  const completion = draftStore.getCompletionPercentage();
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
    if (!appId) return;

    if (visaContext) {
      draftStore.setVisaContext(visaContext);
    }

    draftStore.setApplicationId(appId);
    draftStore.loadDraft(appId);
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

  const handleViewSections = () => {
    setShowSections(true);
    window.requestAnimationFrame(() => {
      sectionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!application) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9f5] px-4">
        <div className="rounded-md border border-emerald-950/10 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-emerald-950">Application not found</h1>
          <p className="mt-2 text-sm text-slate-500">Return to your application list and open the matter again.</p>
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-950 px-5 text-sm font-semibold text-white transition hover:bg-emerald-900"
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
    <div className="flex min-h-[100dvh] overflow-hidden bg-[#f7f9f5]">
      <div className="hidden lg:block lg:w-[18.5rem] lg:flex-shrink-0">
        <AppSidebar mode="contextual" application={application} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0">
            <AppSidebar mode="contextual" application={application} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader variant="spacious" onMenuClick={() => setSidebarOpen(true)} />

        <div className="lg:hidden">
          <PillNav appId={appId} slug={applicationSlug} />
        </div>

        <main className="relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f7f9f5_0%,#fbfbf8_48%,#ffffff_100%)]">
          <section className="relative mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14 xl:px-16 2xl:px-20">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <ClipboardList className="h-5 w-5" />
                  </span>
                  Questionnaire
                </div>

                <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-tight text-emerald-950 sm:text-5xl">
                  {applicationTypeLabel} Questionnaire
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                  This questionnaire helps us build your application properly from the beginning. If you are unsure about any question, let us know and we will guide you through it.
                </p>

                <div className="mt-8 rounded-md border border-emerald-950/10 bg-white/90 p-6 shadow-sm shadow-emerald-950/5 backdrop-blur sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-base font-semibold text-slate-800">Progress</h2>
                    <span className="text-base font-semibold text-emerald-900">{progress.percentage}%</span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-emerald-950/10">
                    <div
                      className="h-full rounded-full bg-emerald-900 transition-all duration-500"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>

                  <p className="mt-6 text-center text-sm text-slate-500">
                    {progress.completed} of {progress.total} sections complete
                  </p>

                  <div className="mt-6 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleStartQuestionnaire}
                      disabled={isNavigating}
                      className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-emerald-950 px-5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-80"
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

                    <button
                      type="button"
                      onClick={handleViewSections}
                      className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-emerald-900/20 bg-white px-5 text-base font-semibold text-emerald-950 shadow-sm transition hover:border-emerald-900/40 hover:bg-emerald-50"
                    >
                      <Eye className="h-5 w-5" />
                      View sections
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <span>You can save your progress and return anytime.</span>
                </div>
              </div>

              <aside className="space-y-5">
                <InfoPanel icon={FileText} title="Before you begin">
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <Check className="h-5 w-5" />
                      </span>
                      <p className="text-sm leading-6 text-slate-600">
                        Have your personal, identity, travel, and employment details ready.
                      </p>
                    </div>
                    <div className="border-t border-slate-200" />
                    <div className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <p className="text-sm leading-6 text-slate-600">
                        Your answers are saved as you move through the questionnaire.
                      </p>
                    </div>
                  </div>
                </InfoPanel>

                <InfoPanel icon={Headphones} title="Need help?">
                  <p className="text-sm leading-6 text-slate-600">
                    Our team is here to support you every step of the way.
                  </p>
                  <a
                    href="mailto:admin@plylegal.com"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-950 transition hover:text-emerald-800"
                  >
                    Contact support
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </InfoPanel>
              </aside>
            </div>

            <section
              ref={sectionsRef}
              className={`mt-10 rounded-md border border-emerald-950/10 bg-white/90 p-6 shadow-sm shadow-emerald-950/5 transition ${
                showSections ? "block" : "hidden"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-emerald-950">Section overview</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {routeSectionTotal} sections are organized into {routeSections.length} groups for this application.
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-900">{progress.percentage}% complete</span>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {routeSections.map((section) => (
                  <div key={section.title} className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {section.count} {section.count === 1 ? "section" : "sections"}
                        </p>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
                        <FileText className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-12 flex items-center gap-5 text-sm text-slate-500">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="flex items-center gap-3 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                  <LockKeyhole className="h-4 w-4" />
                </span>
                Secure portal. Your privacy is our priority.
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
