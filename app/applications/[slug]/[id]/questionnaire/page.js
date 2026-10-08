"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, draftStore, authStore } from "@/stores";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import { Loader2, ArrowRight } from "lucide-react";
import { buildIntakeHref } from "@/lib/routes";
import {
  getApplicationSlug,
  normalizeApplicationSlug,
  PARTNER_PUBLIC_SLUG,
  PROTECTION_PUBLIC_SLUG,
} from "@/lib/visaDisplay";
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

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();

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
  const normalizedSlugFromUrl = normalizeApplicationSlug(slugFromUrl);
  const visaContext = getVisaContext(applicationSlug);
  const visaType = getInternalVisaType(applicationSlug, application);

  // Normalize slug in URL if needed
  useEffect(() => {
    if (!appId || !slugFromUrl || !applicationSlug) return;
    if (normalizedSlugFromUrl === applicationSlug && slugFromUrl === applicationSlug) return;

    router.replace(`/applications/${applicationSlug}/${appId}/questionnaire`);
  }, [appId, slugFromUrl, normalizedSlugFromUrl, applicationSlug, router]);

  // Load session and applications
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

  // Load draft for this application
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

  // Smart router: Once data is ready, seamlessly forward to the appropriate real intake page
  useEffect(() => {
    if (isLoading || isQuestionnaireLoading || draftSnap.isLoading || !application || !applicationSlug) return;

    const isStarted = draftSnap.draft?.started === true;
    const targetSubpath = isStarted ? `/intake/${visaType}/profile` : getStartHref(visaType);

    const destination = buildIntakeHref({
      slug: applicationSlug,
      appId,
      internalHref: targetSubpath,
      visaType,
      visaContext,
    });

    startNavigation(destination);
    router.replace(destination);
  }, [
    isLoading,
    isQuestionnaireLoading,
    draftSnap.isLoading,
    application,
    applicationSlug,
    draftSnap.draft?.started,
    visaType,
    visaContext,
    appId,
    router,
    startNavigation,
  ]);

  if (isLoading || isQuestionnaireLoading || draftSnap.isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
        <AppHeader />
        <MatterWorkspaceHeader
          application={application}
          appId={appId}
          slug={applicationSlug}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm max-w-sm w-full">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#244D42]" />
            <p className="mt-4 text-sm font-semibold text-slate-800">Opening questionnaire...</p>
            <p className="mt-1 text-xs text-slate-500">Loading your saved answers and sections.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm max-w-md w-full">
            <h1 className="font-serif text-2xl font-bold text-slate-900">Application not found</h1>
            <p className="mt-2 text-sm text-slate-600">Return to your applications list to select your matter.</p>
            <button
              type="button"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#244D42] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1C3E35]"
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
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm max-w-sm w-full">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#244D42]" />
          <p className="mt-4 text-sm font-semibold text-slate-800">Opening questionnaire...</p>
        </div>
      </div>
    </div>
  );
}

