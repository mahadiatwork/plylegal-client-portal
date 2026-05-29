"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, authStore } from "@/stores";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ArrowRight,
  ChevronRight,
  CircleDot,
  Clock3,
  Inbox,
  Loader2,
  Search,
} from "lucide-react";
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
  return app.lastUpdated || app.updatedAt || app.updated || app.createdAt || app.created;
}

function getTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getApplicationTitle(app) {
  return getTrimmedString(app.reference) || getTrimmedString(app.type) || app.id || "Visa application";
}

function getReferenceLabel(app) {
  const reference = app.zohoId || app.id || app.reference;
  return reference ? `Reference ${reference}` : "Reference pending";
}

function getStatusLabel(status) {
  return getTrimmedString(status) || "Draft";
}

function normalizeStatus(status) {
  return getStatusLabel(status).toLowerCase();
}

function ApplicationsLoadingState() {
  return (
    <div className="rounded-md border border-emerald-950/10 bg-white p-12 shadow-sm sm:p-20">
      <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
        <Riple color="#1a4d3e" size="large" text="" textColor="" />
        <h3 className="mt-10 text-lg font-semibold text-emerald-950">Synchronizing records</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          Please wait while we fetch the latest application updates from Zoho CRM.
        </p>
      </div>
    </div>
  );
}

function ApplicationsEmptyState({ hasApplications }) {
  return (
    <div className="rounded-md border border-dashed border-emerald-950/20 bg-white/90 p-10 text-center shadow-sm sm:p-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
        {hasApplications ? <Search className="h-6 w-6" /> : <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-emerald-950">
        {hasApplications ? "No matching applications" : "No applications yet"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasApplications
          ? "Try a different search term or status filter to find the record you need."
          : "Applications will appear here once they are synced from Zoho CRM."}
      </p>
    </div>
  );
}

function OpenApplicationButton({ app, navigatingId, onOpen, compact = false }) {
  const isNavigating = navigatingId === app.id;

  return (
    <button
      type="button"
      onClick={() => onOpen(app)}
      disabled={!!navigatingId}
      aria-label={`Open ${getApplicationTitle(app)}`}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-900/25 bg-white px-4 text-sm font-semibold text-emerald-950 shadow-sm transition hover:border-emerald-900/50 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isNavigating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <span>{compact ? "Open" : "Open application"}</span>
          {compact ? <ChevronRight className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </>
      )}
    </button>
  );
}

function ApplicationsTable({ applications, navigatingId, onOpen }) {
  return (
    <div className="hidden overflow-hidden rounded-md border border-emerald-950/10 bg-white shadow-sm lg:block">
      <div className="grid grid-cols-[minmax(330px,1.4fr)_minmax(230px,0.8fr)_minmax(210px,0.7fr)_150px_120px] border-b border-slate-200 px-7 py-4 text-sm font-semibold text-slate-700">
        <span>Application</span>
        <span>Visa type</span>
        <span>Status</span>
        <span>Updated</span>
        <span className="text-right">Action</span>
      </div>

      <div className="divide-y divide-slate-200">
        {applications.map((app) => (
          <div
            key={app.id}
            className="grid min-h-[96px] grid-cols-[minmax(330px,1.4fr)_minmax(230px,0.8fr)_minmax(210px,0.7fr)_150px_120px] items-center px-7 py-5 transition hover:bg-emerald-50/40"
          >
            <div className="min-w-0 pr-6">
              <p className="truncate text-sm font-semibold text-slate-950">{getApplicationTitle(app)}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{getReferenceLabel(app)}</p>
            </div>

            <p className="pr-6 text-sm leading-6 text-slate-600">{formatVisaApplicationType(app)}</p>

            <div className="pr-6">
              <StatusBadge status={getStatusLabel(app.status)} className="bg-emerald-50 text-emerald-900" />
            </div>

            <p className="text-sm text-slate-600">{formatDisplayDate(getUpdatedValue(app))}</p>

            <div className="flex justify-end">
              <OpenApplicationButton app={app} navigatingId={navigatingId} onOpen={onOpen} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationsCardList({ applications, navigatingId, onOpen }) {
  return (
    <div className="space-y-3 lg:hidden">
      {applications.map((app) => (
        <div key={app.id} className="rounded-md border border-emerald-950/10 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-5 text-slate-950">{getApplicationTitle(app)}</p>
            <p className="mt-1 text-xs text-slate-500">{getReferenceLabel(app)}</p>
          </div>

          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Visa type</p>
              <p className="mt-1 leading-6 text-slate-700">{formatVisaApplicationType(app)}</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <StatusBadge status={getStatusLabel(app.status)} className="bg-emerald-50 text-emerald-900" />
              <span className="text-xs text-slate-500">{formatDisplayDate(getUpdatedValue(app))}</span>
            </div>
            <OpenApplicationButton app={app} navigatingId={navigatingId} onOpen={onOpen} />
          </div>
        </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

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
                idToken: idToken,
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

  const applications = useMemo(() => {
    return [...appsSnap.applications].sort((a, b) => {
      const aTime = getTimestampDate(getUpdatedValue(a))?.getTime() || 0;
      const bTime = getTimestampDate(getUpdatedValue(b))?.getTime() || 0;
      return bTime - aTime;
    });
  }, [appsSnap.applications]);

  const statusOptions = useMemo(() => {
    const statuses = applications.map((app) => getStatusLabel(app.status));
    return ["All", ...Array.from(new Set(statuses))];
  }, [applications]);

  useEffect(() => {
    if (!statusOptions.includes(selectedStatus)) {
      setSelectedStatus("All");
    }
  }, [selectedStatus, statusOptions]);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applications.filter((app) => {
      const matchesStatus =
        selectedStatus === "All" || normalizeStatus(app.status) === normalizeStatus(selectedStatus);

      if (!query) return matchesStatus;

      const searchable = [
        app.reference,
        app.id,
        app.zohoId,
        app.type,
        app.visaType,
        app.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchable.includes(query);
    });
  }, [applications, searchQuery, selectedStatus]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9f5]">
      <AppHeader variant="spacious" />

      <main className="relative flex-1 overflow-hidden bg-[linear-gradient(180deg,#f7f9f5_0%,#fbfbf8_46%,#ffffff_100%)]">
        <section className="relative mx-auto w-full max-w-[1680px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14 xl:px-16 2xl:px-24">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-emerald-950 sm:text-5xl lg:text-6xl">
              Visa applications
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Manage your visa applications and continue each questionnaire from one place.
            </p>
          </div>

          {isLoading ? (
            <div className="mt-8">
              <ApplicationsLoadingState />
            </div>
          ) : (
            <>
              <div className="mt-8 rounded-md border border-emerald-950/10 bg-white/90 p-4 shadow-sm shadow-emerald-950/5 backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <label className="relative block w-full lg:max-w-md">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by applicant, visa, or reference"
                      className="h-12 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-900 focus:ring-4 focus:ring-emerald-900/10"
                    />
                  </label>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {statusOptions.map((status) => {
                      const isSelected = selectedStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setSelectedStatus(status)}
                          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
                            isSelected
                              ? "border-emerald-900 bg-emerald-950 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-900/30 hover:bg-emerald-50"
                          }`}
                        >
                          {status === "All" ? <CircleDot className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                {applications.length === 0 || filteredApplications.length === 0 ? (
                  <ApplicationsEmptyState hasApplications={applications.length > 0} />
                ) : (
                  <>
                    <ApplicationsTable
                      applications={filteredApplications}
                      navigatingId={navigatingId}
                      onOpen={openApplication}
                    />
                    <ApplicationsCardList
                      applications={filteredApplications}
                      navigatingId={navigatingId}
                      onOpen={openApplication}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
