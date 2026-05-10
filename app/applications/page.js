"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, authStore } from "@/stores";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, Loader2, ClipboardList, AlertCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { formatVisaApplicationType, getApplicationSlug } from "@/lib/visaDisplay";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { Riple } from "react-loading-indicators";

export default function ApplicationsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  
  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);

  const [isSyncing, setIsSyncing] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);
  const [navigatingId, setNavigatingId] = useState(null);

  const [questionnaireCount, setQuestionnaireCount] = useState(null);
  const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
  const [questionnaireError, setQuestionnaireError] = useState(null);

  const fetchQuestionnaireCount = useCallback(async () => {
    const uid = authSnap.user?.id;
    if (!uid) return;
    const user = auth.currentUser;
    if (!user) {
      setQuestionnaireError("Please sign in again to load your questionnaire summary.");
      setQuestionnaireCount(null);
      return;
    }
    setQuestionnaireLoading(true);
    setQuestionnaireError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/questionnaires/count", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setQuestionnaireError("You need to be signed in to see how many questionnaires you have saved.");
        } else {
          setQuestionnaireError(data.error || "Could not load your questionnaire count.");
        }
        setQuestionnaireCount(null);
        return;
      }
      if (data.success && typeof data.count === "number") {
        setQuestionnaireCount(data.count);
      } else {
        setQuestionnaireError("Unexpected response from server.");
        setQuestionnaireCount(null);
      }
    } catch (err) {
      setQuestionnaireError(err.message || "Something went wrong. Please try again.");
      setQuestionnaireCount(null);
    } finally {
      setQuestionnaireLoading(false);
    }
  }, [authSnap.user?.id]);

  useEffect(() => {
    if (!authSnap.isAuthenticated || !authSnap.user?.id) {
      setQuestionnaireCount(null);
      setQuestionnaireError(null);
      setQuestionnaireLoading(false);
      return;
    }
    fetchQuestionnaireCount();
  }, [authSnap.isAuthenticated, authSnap.user?.id, fetchQuestionnaireCount]);

  const openApplication = (app) => {
    if (navigatingId) return; // prevent double-click
    setNavigatingId(app.id);
    const href = `/applications/${getApplicationSlug(app)}/${app.id}/questionnaire`;
    startNavigation(href);
    router.push(href);
  };
  useEffect(() => {
    if (authSnap.user?.id && !authSnap.userProfile) {
      authStore.loadUserProfile();
    }
  }, [authSnap.user?.id]);

  useEffect(() => {
    const initPageData = async () => {
      if (!authSnap.user?.id) return;

      if (!hasSynced) {
        setHasSynced(true);

        if (authSnap.userProfile?.zohoContactId) {
          try {
            const idToken = await auth.currentUser?.getIdToken();
            
            const response = await fetch('/api/applications/fetch-zoho-deals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: authSnap.user.id,
                zohoContactId: authSnap.userProfile.zohoContactId,
                idToken: idToken,
              }),
            });

            const result = await response.json();
            if (result.success) {
               applicationsStore.rawDealsData = result.rawDealsData || [];
            }
          } catch (error) {
            console.error('⚠️ Sync failed:', error.message);
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
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="font-semibold text-gray-900 text-2xl">Visa Applications</h1>
            <p className="text-sm text-gray-700 mt-1">Manage your visa applications</p>
          </div>

          {authSnap.user?.id && (
            <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                <ClipboardList className="h-5 w-5 text-primary shrink-0" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-medium text-gray-900">Saved questionnaires</h2>
                {questionnaireLoading ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                    <span>Loading your questionnaire summary…</span>
                  </div>
                ) : questionnaireError ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-start gap-2 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                      <span>{questionnaireError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchQuestionnaireCount()}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : questionnaireCount !== null ? (
                  <p className="mt-2 text-sm text-gray-700">
                    You have {questionnaireCount} saved questionnaire
                    {questionnaireCount === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 sm:p-32 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[450px]">
              <div className="relative">
                <Riple 
                  color="#1a4d3e" 
                  size="large" 
                  text="" 
                  textColor="" 
                />
              </div>
              <div className="mt-10 text-center px-4">
                <h3 className="text-lg font-semibold text-[#1a4d3e] animate-pulse">
                  Synchronizing Records
                </h3>
                <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                  Please wait a moment while we fetch your latest application updates from Zoho CRM.
                </p>
              </div>
            </div>
          ) : appsSnap.applications.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
              <p className="text-gray-600">Applications will appear here once they are synced from Zoho CRM.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile card layout */}
              <div className="sm:hidden space-y-3">
                {appsSnap.applications.map((app) => (
                  <div key={app.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm hover:border-primary/30 transition-colors active:bg-gray-50 cursor-pointer"
                    onClick={() => openApplication(app)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm font-bold text-gray-900 truncate">{app.reference || app.id}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatVisaApplicationType(app)}</p>
                      </div>
                      <StatusBadge status={app.status || 'Draft'} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 border-t pt-3">
                      <span>Updated: {app.updated || 'N/A'}</span>
                      <span className="text-primary font-bold flex items-center gap-1">
                        {navigatingId === app.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>Open <span className="text-xs">→</span></>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden sm:block bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Reference</th>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Type</th>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Status</th>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Updated</th>
                        <th className="py-3 px-4 text-right text-sm font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {appsSnap.applications.map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900">{app.reference || app.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700">{formatVisaApplicationType(app)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={app.status || 'Draft'} />
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700">{app.updated || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => openApplication(app)}
                                disabled={!!navigatingId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed min-w-[60px] justify-center"
                              >
                                {navigatingId === app.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}