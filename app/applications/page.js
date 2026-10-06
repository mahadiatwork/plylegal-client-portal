"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, authStore } from "@/stores";
import { AppHeader } from "@/components/AppHeader";
import { MatterStatusDot } from "@/components/MatterWorkspaceHeader";
import { FileText, Loader2, ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase";
import { formatVisaApplicationType, getApplicationSlug } from "@/lib/visaDisplay";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { Riple } from "react-loading-indicators";

function getStatusLabel(status) {
  return typeof status === "string" && status.trim() ? status.trim() : "Draft";
}

function ApplicationsLoadingState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm sm:min-h-[400px]">
      <Riple color="#244D42" size="large" text="" textColor="" />
      <div className="mt-8 px-4">
        <h3 className="font-serif text-lg font-semibold text-[#244D42] animate-pulse">
          Synchronizing Records
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
          Please wait a moment while we fetch your latest application updates from Zoho CRM.
        </p>
      </div>
    </div>
  );
}

function ApplicationsEmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF7F2] text-[#244D42]">
        <FileText className="h-7 w-7" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-slate-900">No Applications Yet</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
        Your visa applications will appear here once they are initialized or synced from Zoho CRM.
      </p>
    </div>
  );
}

function ApplicationCard({ app, navigatingId, onOpen, primaryApplicantName }) {
  const status = getStatusLabel(app.status);
  const statusLower = status.toLowerCase();
  const isFinalised = statusLower.includes("finalis") || statusLower.includes("finaliz") || statusLower.includes("closed won") || statusLower.includes("completed");
  const isPreparing = statusLower.includes("preparing") || statusLower.includes("in progress") || statusLower.includes("qualification") || statusLower.includes("active");
  const finalisedDate = app.finalisedDate || app.closedDate || (isFinalised ? "12 March 2024" : null);

  const applicant = app.primaryApplicant || app.applicantName || primaryApplicantName || "Primary Applicant";

  return (
    <article
      className="group relative rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition hover:shadow-md hover:border-slate-300/90"
      data-testid={`card-application-${app.id}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left icon & content */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F2] text-[#244D42]">
            <FileText className="h-6 w-6" />
          </div>

          <div className="space-y-1.5 min-w-0">
            <h2 className="font-serif text-lg font-bold text-slate-900 sm:text-xl">
              {formatVisaApplicationType(app)}
            </h2>

            <div className="pt-0.5">
              <MatterStatusDot status={status} />
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Primary applicant</span>
                <span className="text-slate-800 font-semibold text-sm">{applicant}</span>
              </div>

              {finalisedDate && (
                <div>
                  <span className="text-slate-400 block font-medium">Finalised date</span>
                  <span className="text-slate-800 font-semibold text-sm">{finalisedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Button */}
        <div className="flex shrink-0 items-center justify-end pt-2 sm:pt-0">
          {isPreparing ? (
            <button
              type="button"
              onClick={() => onOpen(app)}
              disabled={!!navigatingId}
              data-testid={`button-open-${app.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#244D42] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1C3E35] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {navigatingId === app.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <>
                  <span>Open matter</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(app)}
              disabled={!!navigatingId}
              data-testid={`button-view-${app.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {navigatingId === app.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <>
                  <span>View</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ApplicationsList({ applications, navigatingId, onOpen, primaryApplicantName }) {
  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <ApplicationCard
          key={app.id}
          app={app}
          navigatingId={navigatingId}
          onOpen={onOpen}
          primaryApplicantName={primaryApplicantName}
        />
      ))}
    </div>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();

  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);

  const [isSyncing, setIsSyncing] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);
  const [navigatingId, setNavigatingId] = useState(null);

  const userDisplayName =
    authSnap.userProfile?.name ||
    authSnap.userProfile?.displayName ||
    authSnap.user?.displayName ||
    (authSnap.user?.email ? authSnap.user.email.split("@")[0] : "Mahmudul");

  const firstName = userDisplayName.split(" ")[0] || userDisplayName;

  const openApplication = (app) => {
    if (navigatingId) return;
    setNavigatingId(app.id);
    const href = `/applications/${getApplicationSlug(app)}/${app.id}/questionnaire`;
    startNavigation(href);
    router.push(href);
  };

  useEffect(() => {
    if (authSnap.user?.id && !authSnap.userProfile) {
      authStore.loadUserProfile();
    }
  }, [authSnap.user?.id, authSnap.userProfile]);

  useEffect(() => {
    const initPageData = async () => {
      if (!authSnap.user?.id) return;

      if (!hasSynced) {
        setHasSynced(true);

        if (authSnap.userProfile?.zohoContactId) {
          try {
            const idToken = await auth.currentUser?.getIdToken();

            const response = await fetch("/api/applications/fetch-zoho-deals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: authSnap.user.id,
                zohoContactId: authSnap.userProfile.zohoContactId,
                idToken,
                source: "applications-page",
              }),
            });

            const result = await response.json();
            if (result.success) {
              applicationsStore.rawDealsData = result.rawDealsData || [];
            }
          } catch (error) {
            console.error("Sync failed:", error.message);
          }
        }

        await applicationsStore.loadApplications(authSnap.user.id);
        setIsSyncing(false);
      }
    };

    if (authSnap.user?.id && authSnap.userProfile !== undefined) {
      initPageData();
    }
  }, [authSnap.user?.id, authSnap.userProfile, hasSynced]);

  const isLoading = appsSnap.isLoading || isSyncing;

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
      <AppHeader />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-[1100px]">
          {/* Hero Welcome Header */}
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 block mb-1">
              CLIENT PORTAL
            </span>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Welcome, {firstName}
            </h1>
            <p className="mt-2 text-base text-slate-600">
              You can access your visa matters below.
            </p>
          </div>

          {/* Section Heading */}
          <div className="mb-4">
            <h2 className="font-serif text-xl font-bold text-slate-900">
              Your visa applications
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              View and manage your current and past visa applications.
            </p>
          </div>

          {isLoading ? (
            <ApplicationsLoadingState />
          ) : appsSnap.applications.length === 0 ? (
            <ApplicationsEmptyState />
          ) : (
            <ApplicationsList
              applications={appsSnap.applications}
              navigatingId={navigatingId}
              onOpen={openApplication}
              primaryApplicantName={userDisplayName}
            />
          )}
        </div>
      </main>
    </div>
  );
}
