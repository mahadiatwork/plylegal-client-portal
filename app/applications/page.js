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
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/70 bg-[#FAF8F5] p-12 text-center shadow-[0_4px_24px_rgba(20,40,30,0.03)] sm:min-h-[400px]">
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
    <div className="rounded-2xl border border-white/70 bg-[#FAF8F5] p-12 text-center shadow-[0_4px_24px_rgba(20,40,30,0.03)]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E2EBE5] text-[#244D42]">
        <FileText className="h-7 w-7 stroke-[1.8]" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-[#142B24]">No Applications Yet</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
        Your visa applications will appear here once they are initialized or synced from Zoho CRM.
      </p>
    </div>
  );
}

function ApplicationCard({ app, navigatingId, onOpen, primaryApplicantName }) {
  const status = getStatusLabel(app.status);
  const statusLower = status.toLowerCase();
  const isFinalised =
    statusLower.includes("finalis") ||
    statusLower.includes("finaliz") ||
    statusLower.includes("closed won") ||
    statusLower.includes("completed");
  const isPreparing =
    statusLower.includes("preparing") ||
    statusLower.includes("in progress") ||
    statusLower.includes("qualification") ||
    statusLower.includes("active");
  const finalisedDate =
    app.finalisedDate || app.closedDate || (isFinalised ? "12 March 2024" : null);

  const applicant =
    app.primaryApplicant ||
    app.applicantName ||
    primaryApplicantName ||
    "Mahmudul Hassan";

  return (
    <article
      className="group relative rounded-2xl border border-white/70 bg-[#FAF8F5] p-5 sm:p-7 shadow-[0_4px_24px_rgba(20,40,30,0.03)] transition hover:shadow-md"
      data-testid={`card-application-${app.id}`}
    >
      {/* Top row: Icon + Title + Status badge */}
      <div className="flex items-start gap-4 sm:gap-5 min-w-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E2EBE5] text-[#244D42]">
          <FileText className="h-6 w-6 stroke-[1.8]" />
        </div>

        <div className="space-y-1.5 min-w-0 pt-0.5">
          <h2 className="font-serif text-lg sm:text-[19px] font-bold text-[#142B24]">
            {formatVisaApplicationType(app)}
          </h2>

          <div>
            <MatterStatusDot status={status} />
          </div>
        </div>
      </div>

      {/* Horizontal Divider (HR) directly before Primary Applicant */}
      <hr className="my-3.5 sm:ml-[68px] border-0 border-t border-[#E2DDD5]" />

      {/* Bottom row: Primary applicant (+ finalised date) and Action button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:ml-[68px]">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs">
          <div>
            <span className="text-slate-400 block font-normal">Primary applicant</span>
            <span className="text-slate-900 font-semibold text-sm">{applicant}</span>
          </div>

          {finalisedDate && (
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="hidden sm:block h-7 w-px bg-[#DDD8CF]" aria-hidden="true" />
              <div>
                <span className="text-slate-400 block font-normal">Finalised date</span>
                <span className="text-slate-900 font-semibold text-sm">{finalisedDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Action Button */}
        <div className="flex shrink-0 items-center justify-end">
          {isPreparing ? (
            <button
              type="button"
              onClick={() => onOpen(app)}
              disabled={!!navigatingId}
              data-testid={`button-open-${app.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#244D42] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1C3E35] disabled:cursor-not-allowed disabled:opacity-60"
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
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D5D2CC] bg-white px-5 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="relative flex min-h-screen flex-col bg-[#E5EAFF] overflow-x-hidden">
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
            fill="url(#swoosh-gradient-1)"
            opacity="0.8"
          />
          <path
            d="M180 0 C 380 260, 420 540, 850 900 L 1000 900 L 1000 0 Z"
            fill="url(#swoosh-gradient-2)"
            opacity="0.45"
          />
          <defs>
            <linearGradient id="swoosh-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#EEF2FF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#E2E7FE" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="swoosh-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#DEE3FF" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <AppHeader />

      <main className="relative flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-[1100px]">
          {/* Hero Welcome Header */}
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#64748B] block mb-2">
              CLIENT PORTAL
            </span>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#142B24] sm:text-4xl">
              Welcome, {firstName}
            </h1>
            <p className="mt-2 text-base text-[#475569] font-normal">
              You can access your visa matters below.
            </p>
          </div>

          {/* Section Heading */}
          <div className="mb-6">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#142B24]">
              Your visa applications
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
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
