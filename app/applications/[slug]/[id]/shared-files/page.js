"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { ExternalLink, Folder, Loader2, RefreshCw } from "lucide-react";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import { auth } from "@/lib/firebase";

function ClientSharedFolder({ folder }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#E8E6E2] bg-[#FCFBF8] shadow-[0_2px_5px_rgba(40,54,60,0.035)]">
      <div className="flex flex-col gap-4 border-b border-[#E8E6E2] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E9F3ED] text-[#174D42]">
            <Folder className="h-7 w-7 stroke-[2.25]" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#103F37] sm:text-[30px]">Shared Files</h2>
            <p className="mt-1 text-sm text-[#667579] sm:text-base">Documents shared with you by your legal team.</p>
          </div>
        </div>
        <a
          href={folder.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#244D42] px-5 text-sm font-semibold text-white transition hover:bg-[#173F46]"
        >
          Open in WorkDrive
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {folder.mode === "embed" ? (
        <div className="bg-white p-2 sm:p-4">
          <iframe
            src={folder.url}
            title="Client shared WorkDrive folder"
            className="h-[68vh] min-h-[560px] w-full rounded-lg border border-[#E3E0D9] bg-white"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            allow="fullscreen"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <Folder className="h-12 w-12 text-[#AAB4B5]" />
          <h3 className="mt-4 font-serif text-xl font-bold text-[#103F37]">Your shared folder is ready</h3>
          <p className="mt-2 max-w-md text-sm text-[#667579]">Open the folder in WorkDrive to browse the files shared for this matter.</p>
        </div>
      )}
    </section>
  );
}

export default function SharedFilesPage() {
  const { id: appId, slug } = useParams();
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedFolder, setSharedFolder] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const application = applicationsSnap.applications.find((app) => app.id === appId);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadError("");
    setSharedFolder(null);

    async function loadFolder() {
      try {
        if (!authStore.isAuthenticated || !authStore.user) await authStore.checkSession();
        if (controller.signal.aborted) return;
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("Please sign in to view your shared files.");

        if (!applicationsStore.applications.some((app) => app.id === appId) && authStore.user?.id) {
          await applicationsStore.loadApplications(authStore.user.id);
        }
        if (controller.signal.aborted) return;

        const response = await fetch(`/api/matters/${encodeURIComponent(appId)}/shared-folder`, {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load your shared folder. Please try again.");
        }
        if (!controller.signal.aborted) setSharedFolder(data.sharedFolder || null);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error.message || "Unable to load your shared folder. Please try again.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadFolder();
    return () => controller.abort();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, reloadKey]);

  return (
    <div className="flex min-h-screen flex-col bg-[#E6E8FA]">
      <AppHeader />
      <MatterWorkspaceHeader application={application} appId={appId} slug={slug} />
      <main className="flex-1 px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <div className="mx-auto w-full max-w-none">
          {isLoading ? (
            <div role="status" className="flex items-center justify-center gap-3 rounded-xl border border-[#E8E6E2] bg-[#FCFBF8] p-10 text-sm text-[#5A6C73]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading your shared folder...
            </div>
          ) : loadError ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <p>{loadError}</p>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 font-semibold hover:bg-red-100">
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          ) : sharedFolder ? (
            <ClientSharedFolder folder={sharedFolder} />
          ) : (
            <div className="rounded-xl border border-[#E8E6E2] bg-[#FCFBF8] p-10 text-center shadow-sm">
              <Folder className="mx-auto h-12 w-12 text-[#AAB4B5]" />
              <h2 className="mt-4 font-serif text-xl font-bold text-[#103F37]">Your shared folder is not available yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#667579]">Documents shared by your legal team will appear here when your folder is ready.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
