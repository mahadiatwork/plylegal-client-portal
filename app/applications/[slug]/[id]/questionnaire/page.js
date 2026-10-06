"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, draftStore, authStore } from "@/stores";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import { QuestionnaireStepper } from "@/components/questionnaire/QuestionnaireStepper";
import {
  ArrowRight,
  HelpCircle,
  Info,
  Lock,
  Loader2,
  Check,
} from "lucide-react";
import { buildIntakeHref, getIntakeRoutes } from "@/lib/routes";
import {
  formatVisaApplicationType,
  getApplicationSlug,
  normalizeApplicationSlug,
  PARTNER_PUBLIC_SLUG,
  PROTECTION_PUBLIC_SLUG,
} from "@/lib/visaDisplay";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { cn } from "@/lib/utils";

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
  if (slug === PARTNER_PUBLIC_SLUG || slug === "309" || slug === "partner") return "partner";
  if (slug === PROTECTION_PUBLIC_SLUG || slug === "protection") return "protection";

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

const DEFAULT_STEPPER_SECTIONS = [
  { id: "getting-started", title: "Getting started", href: "/start" },
  { id: "applicant-details", title: "Applicant details", href: "/profile" },
  { id: "employment", title: "Employment", href: "/main-applicant/employment" },
  { id: "education", title: "Education", href: "/main-applicant/education" },
  { id: "english-language", title: "English language", href: "/main-applicant/language" },
  { id: "health-character", title: "Health and character", href: "/all-applicants/health" },
  { id: "sponsorship", title: "Sponsorship", href: "/spouse-partner/details" },
  { id: "review-submit", title: "Review and submit", href: "/submit" },
];

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();

  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuestionnaireLoading, setIsQuestionnaireLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(true);

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
  const normalizedSlugFromUrl = normalizeApplicationSlug(slugFromUrl);
  const visaContext = getVisaContext(applicationSlug);
  const visaType = getInternalVisaType(applicationSlug, application);

  useEffect(() => {
    if (!appId || !slugFromUrl || !applicationSlug) return;
    if (normalizedSlugFromUrl === applicationSlug && slugFromUrl === applicationSlug) return;

    router.replace(`/applications/${applicationSlug}/${appId}/questionnaire`);
  }, [appId, slugFromUrl, normalizedSlugFromUrl, applicationSlug, router]);

  const completion = draftStore.getCompletionPercentage();
  const progress = {
    completed: completion.total > 0 ? completion.completed : 6,
    total: completion.total > 0 ? completion.total : 23,
    percentage: completion.total > 0 ? completion.percentage : 26,
  };

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

  const handleContinue = () => {
    if (!application || !applicationSlug) return;
    setIsNavigating(true);

    const targetSubpath = getStartHref(visaType);
    const route = buildIntakeHref({
      slug: applicationSlug,
      appId,
      internalHref: targetSubpath,
    });

    startNavigation(route);
    router.push(route);
  };

  const handleSelectSection = (sec) => {
    if (!application || !applicationSlug) return;
    setIsNavigating(true);

    const route = buildIntakeHref({
      slug: applicationSlug,
      appId,
      internalHref: `/intake/${visaType}${sec.href}`,
    });

    startNavigation(route);
    router.push(route);
  };

  if (isLoading || isQuestionnaireLoading || draftSnap.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#244D42]" />
            <p className="mt-3 text-sm font-medium text-slate-600">Loading questionnaire...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
      <AppHeader />
      <MatterWorkspaceHeader
        application={application}
        appId={appId}
        slug={applicationSlug}
      />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full max-w-[1608px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Stepper Column */}
            <div className="lg:col-span-4 xl:col-span-3">
              <QuestionnaireStepper
                sections={DEFAULT_STEPPER_SECTIONS}
                activeSectionIndex={0}
                completedCount={progress.completed}
                totalCount={progress.total}
                onSelectSection={handleSelectSection}
              />
            </div>

            {/* Right Questionnaire Main Card */}
            <div className="lg:col-span-8 xl:col-span-9">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-10 shadow-sm">
                {/* Top Meta Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    SECTION 1 OF {progress.total}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Need help?</span>
                  </button>
                </div>

                {/* Section Title & Description */}
                <div className="pt-6">
                  <h2 className="font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Getting started
                  </h2>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <p>
                      This questionnaire is the foundation of your visa application. Please complete each section carefully and provide as much detail as you can. If you are unsure about any question, let us know and we will guide you through it.
                    </p>
                    <p>
                      Once submitted, we will review your responses and use this information to prepare your visa application.
                    </p>
                  </div>
                </div>

                {/* Info Callout Banner */}
                <div className="mt-6 rounded-xl border border-blue-100 bg-[#F0F5FF] p-4 sm:p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      <Info className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-slate-700">
                      <strong className="font-semibold text-slate-900">Accuracy matters.</strong> Incomplete or incorrect information can lead to delays, refusal, or visa cancellation. If you are unsure about anything, let us know.
                    </p>
                  </div>
                </div>

                {/* Checkbox Confirmation Card */}
                <div className="mt-6 rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm">
                  <label className="flex items-center gap-3.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={(e) => setIsConfirmed(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-[#244D42] focus:ring-[#244D42] cursor-pointer accent-[#244D42]"
                    />
                    <span className="text-sm font-medium text-slate-800">
                      I confirm that the information I provide will be accurate to the best of my knowledge.
                    </span>
                  </label>
                </div>

                {/* Footer Navigation Bar */}
                <div className="mt-10 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Lock className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>You can save your progress and return anytime.</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isNavigating || !isConfirmed}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#244D42] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1C3E35] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isNavigating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Continuing...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
