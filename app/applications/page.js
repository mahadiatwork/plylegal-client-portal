"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, authStore } from "@/stores";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText } from "lucide-react";
import { auth } from "@/lib/firebase";
import { formatVisaApplicationType } from "@/lib/visaDisplay";
import { Riple } from "react-loading-indicators";

export default function ApplicationsPage() {
  const router = useRouter();
  
  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);

  const [isSyncing, setIsSyncing] = useState(true);
  const [hasSynced, setHasSynced] = useState(false);
  
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
                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm hover:border-primary/30 transition-colors active:bg-gray-50"
                    onClick={() => router.push(`/applications/${app.id}/questionnaire`)}
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
                      <span className="text-primary font-bold flex items-center gap-1">Open <span className="text-xs">→</span></span>
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
                                onClick={() => router.push(`/applications/${app.id}/questionnaire`)}
                                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition"
                              >
                                Open
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