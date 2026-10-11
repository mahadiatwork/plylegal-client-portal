"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import { auth } from "@/lib/firebase";
import {
  Folder,
  FileText,
  Search,
  ExternalLink,
  MoreVertical,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";

function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fileTypeFromName(name, mimeType) {
  const extension = String(name || "").split(".").pop()?.toLowerCase();
  if (extension === "pdf" || mimeType === "application/pdf") return "PDF";
  if (["doc", "docx"].includes(extension) || String(mimeType || "").includes("word")) return "Word";
  if (["xls", "xlsx", "csv"].includes(extension) || String(mimeType || "").includes("excel")) return "Excel";
  if (["ppt", "pptx"].includes(extension)) return "PowerPoint";
  return extension ? extension.toUpperCase() : "File";
}

function FileTypeIcon({ type }) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "pdf") {
    return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EF4444] text-[10px] font-bold uppercase text-white shadow-xs">PDF</span>;
  }
  if (normalized === "word") {
    return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB] text-[10px] font-bold uppercase text-white shadow-xs">W</span>;
  }
  if (normalized === "excel") {
    return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10B981] text-[10px] font-bold uppercase text-white shadow-xs">X</span>;
  }
  return <FileText className="h-6 w-6 shrink-0 text-slate-500" />;
}

function SharedFilesTable({ title, subtitle, files = [] }) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("dateAdded");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = files.filter((file) =>
      !query || [file.name, file.fileType].some((value) => String(value || "").toLowerCase().includes(query)),
    );

    return [...filtered].sort((left, right) => {
      const leftValue = sortField === "name" ? left.name : sortField === "fileType" ? left.fileType : left.dateAddedValue;
      const rightValue = sortField === "name" ? right.name : sortField === "fileType" ? right.fileType : right.dateAddedValue;
      const comparison = sortField === "dateAdded"
        ? Number(leftValue || 0) - Number(rightValue || 0)
        : String(leftValue || "").localeCompare(String(rightValue || ""), undefined, { sensitivity: "base" });
      return sortAsc ? comparison : -comparison;
    });
  }, [files, search, sortAsc, sortField]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc((current) => !current);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F2] text-[#244D42]"><Folder className="h-5 w-5" /></div>
          <div><h2 className="font-serif text-lg font-bold text-slate-900 sm:text-xl">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div>
        </div>
        <div className="relative w-full sm:w-60"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search files..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200/90 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-[#244D42] focus:outline-none" /></div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] table-fixed">
          <colgroup><col className="w-[45%]" /><col className="w-[20%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[10%]" /></colgroup>
          <thead><tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
            <th className="pb-3 text-left"><button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-slate-700">Name <ArrowUpDown className="h-3 w-3" /></button></th>
            <th className="pb-3 text-left"><button type="button" onClick={() => toggleSort("dateAdded")} className="inline-flex items-center gap-1 hover:text-slate-700">Date added <ArrowUpDown className="h-3 w-3" /></button></th>
            <th className="pb-3 text-left"><button type="button" onClick={() => toggleSort("fileType")} className="inline-flex items-center gap-1 hover:text-slate-700">File type <ArrowUpDown className="h-3 w-3" /></button></th>
            <th className="pb-3 text-left">Size</th><th className="pb-3 text-right">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 text-sm">{filteredFiles.map((file) => (
            <tr key={file.id} className="transition-colors hover:bg-slate-50/50">
              <td className="min-w-0 py-3.5 pr-4"><div className="flex min-w-0 items-center gap-3"><FileTypeIcon type={file.fileType} /><span className="truncate font-medium text-slate-800" title={file.name}>{file.name}</span></div></td>
              <td className="py-3.5 pr-4 text-xs text-slate-600">{file.dateAdded}</td><td className="py-3.5 pr-4 text-xs font-medium text-slate-700">{file.fileType}</td><td className="py-3.5 pr-4 text-xs text-slate-500">{file.size}</td>
              <td className="py-3.5 text-right"><div className="flex items-center justify-end gap-2">{file.url ? <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"><span>View</span><ExternalLink className="h-3 w-3 text-slate-400" /></a> : <span className="text-xs text-slate-400">Unavailable</span>}<button type="button" aria-label={`More actions for ${file.name}`} className="rounded p-1 text-slate-400 transition-colors hover:text-slate-700"><MoreVertical className="h-4 w-4" /></button></div></td>
            </tr>
          ))}</tbody>
        </table>
        {!filteredFiles.length ? <p className="py-8 text-center text-sm text-slate-500">{search ? "No files match your search." : "No files in this folder yet."}</p> : null}
      </div>
    </section>
  );
}

function normalizeCategories(categories, items) {
  const byKey = new Map();
  for (const category of categories || []) {
    const name = typeof category === "string" ? category.trim() : String(category?.name || "").trim();
    if (name) byKey.set(name.toLowerCase(), { name, description: category?.description || "" });
  }
  for (const item of items || []) {
    const name = String(item.category || "Uncategorized").trim() || "Uncategorized";
    if (!byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), { name, description: "" });
  }
  if (!byKey.has("uncategorized")) byKey.set("uncategorized", { name: "Uncategorized", description: "" });
  return [...byKey.values()];
}

export default function SharedFilesPage() {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState("");
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find((app) => app.id === appId);

  const loadFiles = useCallback(async () => {
    if (!appId) return;
    setLoadError("");
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("Missing authentication token");
    const response = await fetch(`/api/resources/matter?applicationId=${encodeURIComponent(appId)}&source=sharedFiles`, { headers: { Authorization: `Bearer ${idToken}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.error || "Failed to load shared files");
    const nextItems = (data.items || []).map((item) => {
      const name = item.name || item.fileName || "Untitled file";
      return { id: item.id, category: item.category || "Uncategorized", name, dateAdded: formatDate(item.createdAt || item.updatedAt), dateAddedValue: new Date(item.createdAt || item.updatedAt || 0).getTime(), fileType: fileTypeFromName(item.fileName || name, item.mimeType), size: formatFileSize(item.size), url: item.viewerUrl || item.url || item.externalUrl || "" };
    });
    setFiles(nextItems);
    setCategories(normalizeCategories(data.categories, nextItems));
  }, [appId]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        if (!authSnap.isAuthenticated && !authSnap.user) await authStore.checkSession();
        if (applicationsSnap.applications.length === 0 && authSnap.user?.id) await applicationsStore.loadApplications(authSnap.user.id);
        await loadFiles();
      } catch (error) {
        if (mounted) setLoadError(error.message || "We could not load shared files.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [applicationsSnap.applications.length, authSnap.isAuthenticated, authSnap.user?.id, loadFiles]);

  const sections = useMemo(() => categories
    .map((category) => ({
      ...category,
      files: files.filter((file) => file.category.toLowerCase() === category.name.toLowerCase()),
    }))
    .filter((section) => section.name.toLowerCase() !== "uncategorized" || section.files.length > 0), [categories, files]);

  if (isLoading || !application) {
    return <div className="flex min-h-screen flex-col bg-[#F4F7FB]"><AppHeader /><div className="flex flex-1 items-center justify-center p-8"><div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm"><div className="text-sm font-medium text-slate-600">Loading files...</div></div></div></div>;
  }

  return <div className="flex min-h-screen flex-col bg-[#F4F7FB]">
    <AppHeader />
    <MatterWorkspaceHeader application={application} appId={appId} slug={slug} />
    <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"><div className="mx-auto w-full max-w-[1608px] space-y-6">
      {loadError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div> : null}
      {!loadError && !files.length ? <div className="rounded-2xl border border-slate-200/90 bg-white p-10 text-center shadow-sm"><FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 font-serif text-xl font-bold text-slate-900">No shared files yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Files shared by your legal team will appear here when they are added to this matter.</p></div> : null}
      {sections.map((section) => <SharedFilesTable key={section.name} title={section.name} subtitle={section.description || "Files shared with you for this matter."} files={section.files} />)}
    </div></main>
  </div>;
}
