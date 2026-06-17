"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, authStore } from "@/stores";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { formatVisaApplicationType, getApplicationSlug } from "@/lib/visaDisplay";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { Riple } from "react-loading-indicators";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function getTimestampDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value, fallback = "N/A") {
  const date = getTimestampDate(value);
  if (date) return DATE_FORMATTER.format(date);
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function getUpdatedValue(app) {
  return app.updated || app.lastUpdated || app.updatedAt || app.createdAt || app.created;
}

function getStatusLabel(status) {
  return typeof status === "string" && status.trim() ? status.trim() : "Draft";
}

function getApplicationTitle(app) {
  return app.reference || app.id || "Visa application";
}

function ApplicationsLoadingState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm sm:min-h-[450px] sm:p-32">
      <Riple color="#4F726B" size="large" text="" textColor="" />
      <div className="mt-10 px-4">
        <h3 className="font-sans text-lg font-semibold text-[#4F726B] animate-pulse">
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
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <FileText className="mx-auto mb-4 h-12 w-12 text-slate-400" />
      <h3 className="font-sans text-lg font-semibold text-slate-950">No Applications Yet</h3>
      <p className="mt-2 text-slate-600">
        Applications will appear here once they are synced from Zoho CRM.
      </p>
    </div>
  );
}

function ApplicationsTable({ applications, navigatingId, onOpen }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 justify-items-center md:hidden">
        {applications.map((app) => (
          <article
            key={app.id}
            className="w-full max-w-[25.875rem] rounded-xl border border-slate-200 bg-white p-[1rem] shadow-sm"
          >
            <div className="flex flex-wrap items-start gap-x-3 gap-y-4">
              <div className="min-w-0 grow basis-[11rem]">
                <p className="text-[0.75rem] font-medium uppercase tracking-[0.02em] text-slate-500 whitespace-nowrap break-normal">
                  Reference
                </p>
                <p className="mt-1 text-[1rem] font-semibold leading-5 text-slate-950 break-words">
                  {getApplicationTitle(app)}
                </p>
              </div>
              <StatusBadge
                status={getStatusLabel(app.status)}
                className="no-default-hover-elevate border-transparent bg-[#e8edf5] px-3 py-1 text-xs font-semibold text-[#4F726B] shadow-none"
              />

              <div className="min-w-0 grow basis-[11rem]">
                <p className="text-[0.75rem] font-medium uppercase tracking-[0.02em] text-slate-500 whitespace-nowrap break-normal">
                  Type
                </p>
                <p className="mt-1 text-[0.9375rem] leading-6 text-slate-700 break-words">
                  {formatVisaApplicationType(app)}
                </p>
              </div>

              <div className="min-w-[7.5rem] shrink-0">
                <p className="text-[0.75rem] font-medium uppercase tracking-[0.02em] text-slate-500 whitespace-nowrap break-normal">
                  Updated
                </p>
                <p className="mt-1 text-[0.9375rem] text-slate-700 whitespace-nowrap">
                  {formatDisplayDate(getUpdatedValue(app))}
                </p>
              </div>

              <div className="ml-auto self-end">
                <button
                  type="button"
                  onClick={() => onOpen(app)}
                  disabled={!!navigatingId}
                  data-testid={`button-open-${app.id}`}
                  className="inline-flex h-10 min-w-[5.25rem] items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[0.9375rem] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {navigatingId === app.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    "Open"
                  )}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[26%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50/50">
            <tr>
              <th className="px-4 py-4 text-left text-sm font-semibold text-slate-950 lg:px-6 lg:text-base">
                Reference
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-slate-950 lg:px-6 lg:text-base">
                Type
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-slate-950 lg:px-6 lg:text-base">
                Status
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-slate-950 lg:px-6 lg:text-base">
                Updated
              </th>
              <th className="px-4 py-4 text-right text-sm font-semibold text-slate-950 lg:px-6 lg:text-base">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {applications.map((app) => (
              <tr key={app.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-4 lg:px-6">
                  <span className="block truncate text-sm font-semibold text-slate-950 lg:text-base">
                    {getApplicationTitle(app)}
                  </span>
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <span className="block truncate text-sm text-slate-700 lg:text-base">
                    {formatVisaApplicationType(app)}
                  </span>
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <StatusBadge
                    status={getStatusLabel(app.status)}
                    className="no-default-hover-elevate border-transparent bg-[#e8edf5] px-3 py-1 text-xs font-semibold text-[#4F726B] shadow-none lg:text-sm"
                  />
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <span className="whitespace-nowrap text-sm text-slate-700 lg:text-base">
                    {formatDisplayDate(getUpdatedValue(app))}
                  </span>
                </td>
                <td className="px-4 py-4 text-right lg:px-6">
                  <button
                    type="button"
                    onClick={() => onOpen(app)}
                    disabled={!!navigatingId}
                    data-testid={`button-open-${app.id}`}
                    className="inline-flex h-10 min-w-[68px] items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 lg:min-w-[80px] lg:px-4"
                  >
                    {navigatingId === app.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      "Open"
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <div className="flex min-h-screen flex-col bg-[#E4E9FF]">
      <AppHeader variant="classic" />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-11 lg:px-8">
        <div className="mx-auto w-full max-w-[1608px]">
          <div className="mb-8">
            <h1 className="font-sans text-3xl !font-semibold text-slate-950">
              Visa Applications
            </h1>
            <p className="mt-2 text-lg text-slate-700">Manage your visa applications</p>
          </div>

          {isLoading ? (
            <ApplicationsLoadingState />
          ) : appsSnap.applications.length === 0 ? (
            <ApplicationsEmptyState />
          ) : (
            <ApplicationsTable
              applications={appsSnap.applications}
              navigatingId={navigatingId}
              onOpen={openApplication}
            />
          )}
        </div>
      </main>
    </div>
  );
}
