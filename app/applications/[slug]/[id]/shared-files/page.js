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
  const fileIcon = normalized === "pdf"
    ? { label: "PDF", color: "#E64236" }
    : normalized === "word"
      ? { label: "W", color: "#2372D8" }
      : normalized === "excel"
        ? { label: "X", color: "#159B65" }
        : null;

  if (!fileIcon) return <FileText className="h-9 w-8 shrink-0 text-[#6B7B7C]" />;

  return (
    <span className="relative flex h-9 w-8 shrink-0 items-center justify-center" aria-label={`${fileIcon.label} file`}>
      <FileText className="h-9 w-8" fill={fileIcon.color} strokeWidth={1.5} style={{ color: fileIcon.color }} />
      <span className="absolute top-[13px] text-[8px] font-bold tracking-[-0.04em] text-white">{fileIcon.label}</span>
    </span>
  );
}

function folderSurface(title) {
  const normalized = String(title || "").toLowerCase();
  if (normalized.includes("lodged")) return "bg-[#FBE4E0]";
  if (normalized.includes("government")) return "bg-[#EEF0DF]";
  return "bg-[#E9F3ED]";
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
      const leftValue = sortField === "name" ? left.name : sortField === "fileType" ? left.fileType : sortField === "size" ? left.sizeValue : left.dateAddedValue;
      const rightValue = sortField === "name" ? right.name : sortField === "fileType" ? right.fileType : sortField === "size" ? right.sizeValue : right.dateAddedValue;
      const comparison = sortField === "dateAdded" || sortField === "size"
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
    <section className="rounded-xl border border-[#E8E6E2] bg-[#FCFBF8] px-5 py-4 shadow-[0_2px_5px_rgba(40,54,60,0.035)] sm:px-9">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-[#174D42] sm:h-24 sm:w-24 ${folderSurface(title)}`}><Folder className="h-10 w-10 stroke-[2.35]" /></div>
          <div><h2 className="font-serif text-2xl font-bold leading-tight text-[#103F37] sm:text-[32px]">{title}</h2><p className="mt-1 text-sm text-[#667579] sm:text-lg">{subtitle}</p></div>
        </div>
        <div className="relative w-full shrink-0 sm:w-[342px]"><Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[#174D42]" /><input type="text" placeholder="Search files..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-14 w-full rounded-[9px] border border-[#D8DCDD] bg-white py-3 pl-14 pr-4 text-base text-[#173F46] shadow-[0_1px_2px_rgba(20,45,50,0.04)] placeholder:text-[#78858A] focus:border-[#244D42] focus:outline-none focus:ring-2 focus:ring-[#244D42]/15" /></div>
      </div>

      <div className="mt-2 overflow-x-auto rounded-[10px] border border-[#E3E0D9]">
        <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-0">
          <colgroup><col className="w-[45%]" /><col className="w-[20%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[10%]" /></colgroup>
          <thead><tr className="bg-[#F2F0E8] text-sm font-semibold text-[#2A4D46]">
            <th className="px-5 py-3 text-left"><button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1.5 hover:text-[#103F37]">Name <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
            <th className="px-5 py-3 text-left"><button type="button" onClick={() => toggleSort("dateAdded")} className="inline-flex items-center gap-1.5 hover:text-[#103F37]">Date added <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
            <th className="px-5 py-3 text-left"><button type="button" onClick={() => toggleSort("fileType")} className="inline-flex items-center gap-1.5 hover:text-[#103F37]">File type <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
            <th className="px-5 py-3 text-left"><button type="button" onClick={() => toggleSort("size")} className="inline-flex items-center gap-1.5 hover:text-[#103F37]">Size <ArrowUpDown className="h-3.5 w-3.5" /></button></th><th className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody className="text-base text-[#173F46]">{filteredFiles.map((file) => (
            <tr key={file.id} className="border-t border-[#E6E4DF] transition-colors hover:bg-[#FAF9F4]">
              <td className="min-w-0 px-5 py-3 pr-4"><div className="flex min-w-0 items-center gap-4"><FileTypeIcon type={file.fileType} /><span className="truncate font-medium" title={file.name}>{file.name}</span></div></td>
              <td className="px-5 py-3 pr-4 text-sm text-[#5A6C73]">{file.dateAdded}</td><td className="px-5 py-3 pr-4 text-sm text-[#5A6C73]">{file.fileType}</td><td className="px-5 py-3 pr-4 text-sm text-[#5A6C73]">{file.size}</td>
              <td className="px-5 py-3 text-right"><div className="flex items-center justify-end gap-3">{file.url ? <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-[#C8D2C7] bg-[#FEFDF8] px-4 py-2 text-sm font-semibold text-[#17453B] transition hover:bg-[#F3F5EE] hover:text-[#103F37]"><span>View</span><ExternalLink className="h-4 w-4" /></a> : <span className="text-sm text-[#7A8585]">Unavailable</span>}<button type="button" aria-label={`More actions for ${file.name}`} className="rounded p-1.5 text-[#17453B] transition-colors hover:bg-[#EEF1EA]"><MoreVertical className="h-5 w-5" /></button></div></td>
            </tr>
          ))}</tbody>
        </table>
        {!filteredFiles.length ? <p className="py-8 text-center text-sm text-[#667579]">{search ? "No files match your search." : "No files in this folder yet."}</p> : null}
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
      return { id: item.id, category: item.category || "Uncategorized", name, dateAdded: formatDate(item.createdAt || item.updatedAt), dateAddedValue: new Date(item.createdAt || item.updatedAt || 0).getTime(), fileType: fileTypeFromName(item.fileName || name, item.mimeType), size: formatFileSize(item.size), sizeValue: Number(item.size) || 0, url: item.viewerUrl || item.url || item.externalUrl || "" };
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
    return <div className="flex min-h-screen flex-col bg-[#E6E8FA]"><AppHeader /><div className="flex flex-1 items-center justify-center p-8"><div className="rounded-xl border border-[#E8E6E2] bg-[#FCFBF8] p-8 text-center shadow-sm"><div className="text-sm font-medium text-[#5A6C73]">Loading files...</div></div></div></div>;
  }

  return <div className="flex min-h-screen flex-col bg-[#E6E8FA]">
    <AppHeader />
    <MatterWorkspaceHeader application={application} appId={appId} slug={slug} />
    <main className="flex-1 px-3 py-3 sm:px-5 sm:py-4 lg:px-6"><div className="mx-auto w-full max-w-none space-y-4">
      {loadError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div> : null}
      {!loadError && !files.length ? <div className="rounded-xl border border-[#E8E6E2] bg-[#FCFBF8] p-10 text-center shadow-sm"><FileSpreadsheet className="mx-auto h-12 w-12 text-[#AAB4B5]" /><h2 className="mt-4 font-serif text-xl font-bold text-[#103F37]">No shared files yet</h2><p className="mx-auto mt-2 max-w-md text-sm text-[#667579]">Files shared by your legal team will appear here when they are added to this matter.</p></div> : null}
      {sections.map((section) => <SharedFilesTable key={section.name} title={section.name} subtitle={section.description || "Files shared with you for this matter."} files={section.files} />)}
    </div></main>
  </div>;
}
