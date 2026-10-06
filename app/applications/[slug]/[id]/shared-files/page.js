"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore } from "@/stores/appDataStore";
import { authStore } from "@/stores/authStore";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import {
  Folder,
  FileText,
  Search,
  ExternalLink,
  MoreVertical,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_GOVERNMENT_CORRESPONDENCE = [
  { id: "gov-1", name: "Section 56 request.pdf", dateAdded: "18 Jul 2026", fileType: "PDF", size: "245 KB", url: "#" },
  { id: "gov-2", name: "Acknowledgement of application.pdf", dateAdded: "12 Jun 2026", fileType: "PDF", size: "412 KB", url: "#" },
  { id: "gov-3", name: "Health examination letter.docx", dateAdded: "03 Jun 2026", fileType: "Word", size: "178 KB", url: "#" },
  { id: "gov-4", name: "Bridging visa grant notification.pdf", dateAdded: "21 May 2026", fileType: "PDF", size: "320 KB", url: "#" },
];

const DEFAULT_LODGED_DOCUMENTS = [
  { id: "lodged-1", name: "Application form 482.pdf", dateAdded: "10 May 2026", fileType: "PDF", size: "620 KB", url: "#" },
  { id: "lodged-2", name: "Passport - Applicant.pdf", dateAdded: "10 May 2026", fileType: "PDF", size: "310 KB", url: "#" },
  { id: "lodged-3", name: "Employment reference letter - ABC Lifts.docx", dateAdded: "09 May 2026", fileType: "Word", size: "195 KB", url: "#" },
  { id: "lodged-4", name: "Skills and qualifications evidence.pdf", dateAdded: "08 May 2026", fileType: "PDF", size: "540 KB", url: "#" },
];

function FileTypeIcon({ type }) {
  const t = String(type || "").toLowerCase();
  if (t === "pdf") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded bg-red-500 text-[10px] font-bold text-white uppercase">
        PDF
      </span>
    );
  }
  if (t === "word" || t === "doc" || t === "docx") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-[10px] font-bold text-white uppercase">
        W
      </span>
    );
  }
  if (t === "excel" || t === "xls" || t === "xlsx") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded bg-emerald-600 text-[10px] font-bold text-white uppercase">
        X
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-500 text-[10px] font-bold text-white uppercase">
      FILE
    </span>
  );
}

function SharedFilesTable({ title, subtitle, files = [], searchPlaceholder = "Search files..." }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("dateAdded");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const q = search.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.fileType.toLowerCase().includes(q);
    });
  }, [files, search]);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F2] text-[#244D42]">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-900 sm:text-xl">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200/90 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#244D42] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[45%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
              <th className="pb-3 text-left">
                <button type="button" className="inline-flex items-center gap-1 hover:text-slate-700">
                  <span>Name</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="pb-3 text-left">
                <button type="button" className="inline-flex items-center gap-1 hover:text-slate-700">
                  <span>Date added</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="pb-3 text-left">
                <button type="button" className="inline-flex items-center gap-1 hover:text-slate-700">
                  <span>File type</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="pb-3 text-left">
                <button type="button" className="inline-flex items-center gap-1 hover:text-slate-700">
                  <span>Size</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredFiles.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileTypeIcon type={file.fileType} />
                    <span className="font-medium text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 pr-4 text-xs text-slate-600">
                  {file.dateAdded}
                </td>
                <td className="py-3.5 pr-4 text-xs font-medium text-slate-700">
                  {file.fileType}
                </td>
                <td className="py-3.5 pr-4 text-xs text-slate-500">
                  {file.size}
                </td>
                <td className="py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={file.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SharedFilesPage() {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);

  const applicationsSnap = useSnapshot(applicationsStore);
  const appDataSnap = useSnapshot(appDataStore);
  const authSnap = useSnapshot(authStore);

  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find((app) => app.id === appId);

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

        if (appId && !appDataSnap.cache[appId]?.deliverables) {
          appDataStore.loadDeliverables(appId);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);

  if (isLoading || !application) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
            <div className="text-sm font-medium text-slate-600">Loading files...</div>
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
        slug={slug}
      />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-[1608px] space-y-6">
          {/* Section 1: Government Correspondence */}
          <SharedFilesTable
            title="Government Correspondence"
            subtitle="Letters and correspondence from government bodies about your application."
            files={DEFAULT_GOVERNMENT_CORRESPONDENCE}
          />

          {/* Section 2: Lodged Documents */}
          <SharedFilesTable
            title="Lodged Documents"
            subtitle="A copy of the documents included in your application."
            files={DEFAULT_LODGED_DOCUMENTS}
          />
        </div>
      </main>
    </div>
  );
}
