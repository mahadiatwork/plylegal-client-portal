"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import { auth } from "@/lib/firebase";
import { DEFAULT_TEMPLATE_CATEGORIES, loadResourcePageData } from "@/lib/resourcePageData";
import { compareResourceItems } from "@/lib/resourceOrdering";
import { getResourceViewerUrl } from "@/lib/resourceAccess";
import { ResourceNoteViewer } from "@/components/ResourceNoteViewer";
import {
  BookOpen,
  FileText,
  Folder,
  Link as LinkIcon,
  ScrollText,
  ShieldCheck,
  Search,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Info,
  Building2,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  folder: Folder,
  guide: BookOpen,
  policy: ShieldCheck,
  link: LinkIcon,
  file: FileText,
  note: ScrollText,
  government: Building2,
  checklist: CheckSquare,
};

function getCategoryIcon(name = "", iconKey = "") {
  const n = name.toLowerCase();
  if (n.includes("government") || n.includes("visa process")) return Building2;
  if (n.includes("document") || n.includes("evidence")) return Folder;
  if (n.includes("requirement")) return FileText;
  if (n.includes("policy") || n.includes("information")) return ShieldCheck;
  if (n.includes("template") || n.includes("form")) return FileText;
  return CATEGORY_ICONS[iconKey] || Folder;
}

function normalizeTemplateCategories(categories) {
  const source = Array.isArray(categories)
    ? categories
    : DEFAULT_TEMPLATE_CATEGORIES;

  return source
    .map((category) => ({
      name: String(category?.name || "").trim(),
      icon: String(category?.icon || "folder").trim() || "folder",
      description: String(category?.description || "").trim(),
    }))
    .filter((category) => category.name);
}

function getItemType(item) {
  if (item.type) return item.type;
  if (item.kind === "file") return "File";
  if (item.kind === "note") return "Note";
  if (item.kind === "link") return "Link";
  if (String(item.name || "").toLowerCase().includes("guide")) return "Guide";
  if (String(item.name || "").toLowerCase().includes("checklist")) return "Checklist";
  return "Guide";
}

function ResourceTypePill({ type }) {
  const t = String(type || "").toLowerCase();
  if (t === "guide") {
    return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Guide</span>;
  }
  if (t === "link") {
    return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Link</span>;
  }
  if (t === "checklist") {
    return <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">Checklist</span>;
  }
  if (t === "file") {
    return <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">File</span>;
  }
  return <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Note</span>;
}

const DEFAULT_CATEGORY_DESCRIPTIONS = {
  "visa process and government information": "Information about the Subclass 482 visa process and links to government resources.",
  "documents and evidence": "Guides, checklists and examples to help you prepare and upload your documents.",
  "key requirements": "Information about the main requirements for your Subclass 482 application.",
  "our policies and important information": "Information about working with Ply Legal.",
  "templates and forms": "Templates to help you prepare your documents.",
};

export default function ResourcesPage() {
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);

  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find((app) => app.id === appId);

  const loadResources = useCallback(async () => {
    if (!appId) {
      setItems([]);
      setTemplate(null);
      setResourcesLoading(false);
      return;
    }

    try {
      setResourcesLoading(true);
      setResourcesError("");

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Missing authentication token");
      }

      const data = await loadResourcePageData({ appId, slug, idToken });
      setTemplate(data.template);
      setItems(data.items);
    } catch (error) {
      console.error("Error loading resources:", error);
      setResourcesError("We could not load your resources. Please refresh the page or contact Ply Legal.");
    } finally {
      setResourcesLoading(false);
    }
  }, [appId, slug]);

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

        await loadResources();
      } catch (error) {
        console.error("Error loading data:", error);
        setResourcesLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length, loadResources]);

  // Grouped categories
  const categories = useMemo(() => {
    const categoryMap = new Map();

    const normalizedCats = normalizeTemplateCategories(template?.categories);
    const catList = normalizedCats.length > 0 ? normalizedCats : [
      { name: "Visa process and government information", icon: "government" },
      { name: "Documents and evidence", icon: "folder" },
      { name: "Key requirements", icon: "file" },
      { name: "Our policies and important information", icon: "policy" },
      { name: "Templates and forms", icon: "file" },
    ];

    catList.forEach((cat) => {
      const key = cat.name.toLowerCase();
      categoryMap.set(key, {
        name: cat.name,
        icon: cat.icon,
        description: cat.description || DEFAULT_CATEGORY_DESCRIPTIONS[key] || `Resources for ${cat.name}.`,
        items: [],
      });
    });

    // If we have actual items from db
    items.forEach((item) => {
      if (item.status && item.status !== "active") return;
      const catName = String(item.category || "").trim() || "Visa process and government information";
      const key = catName.toLowerCase();

      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          name: catName,
          icon: "folder",
          description: DEFAULT_CATEGORY_DESCRIPTIONS[key] || `Resources for ${catName}.`,
          items: [],
        });
      }

      categoryMap.get(key).items.push({
        ...item,
        type: getItemType(item),
      });
    });

    // Provide default mockup items if db returned empty items for beautiful visual display
    if (items.length === 0) {
      const govCat = categoryMap.get("visa process and government information");
      if (govCat && govCat.items.length === 0) {
        govCat.items = [
          { id: "1", name: "Visa process overview", type: "Guide", kind: "note", description: "Key steps, timeframes and what to expect when applying for a Subclass 482 visa." },
          { id: "2", name: "Importing your visa application via ImmiAccount", type: "Guide", kind: "note", description: "Step-by-step instructions for importing a previously lodged or started application into your ImmiAccount." },
          { id: "3", name: "Visa processing times (Department of Home Affairs)", type: "Link", kind: "link", externalUrl: "https://immi.homeaffairs.gov.au", description: "Latest processing times from the Department of Home Affairs for Subclass 482 visa applications." },
          { id: "4", name: "Department of Home Affairs - Subclass 482", type: "Link", kind: "link", externalUrl: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-skill-shortage-482", description: "Official Department of Home Affairs information about the Subclass 482 visa." },
          { id: "5", name: "Understanding visa conditions", type: "Note", kind: "note", description: "Information about common visa conditions that may apply to Subclass 482 visa holders." },
        ];
      }

      const docCat = categoryMap.get("documents and evidence");
      if (docCat && docCat.items.length === 0) {
        docCat.items = [
          { id: "6", name: "How to prepare and upload documents", type: "Guide", kind: "note", description: "Best practices for preparing, scanning and uploading supporting documents." },
          { id: "7", name: "Employment reference guide", type: "Guide", kind: "note", description: "Guidelines on what should be included in an employment reference letter." },
          { id: "8", name: "Qualifications and skills evidence", type: "Checklist", kind: "note", description: "Checklist of mandatory educational qualifications and certified documents." },
          { id: "9", name: "Document examples", type: "File", kind: "file", description: "Example templates and formatted evidence samples." },
        ];
      }

      const reqCat = categoryMap.get("key requirements");
      if (reqCat && reqCat.items.length === 0) {
        reqCat.items = [
          { id: "10", name: "English language requirements", type: "Guide", kind: "note", description: "Approved language test scores and exemption criteria." },
          { id: "11", name: "Health examinations", type: "Note", kind: "note", description: "Medical booking steps and Bupa health assessment requirements." },
          { id: "12", name: "Police checks", type: "Guide", kind: "note", description: "Australian Federal Police and overseas character clearances." },
        ];
      }

      const polCat = categoryMap.get("our policies and important information");
      if (polCat && polCat.items.length === 0) {
        polCat.items = [
          { id: "13", name: "Our communications policy", type: "Note", kind: "note", description: "How we communicate and expected response times." },
          { id: "14", name: "Our use of AI", type: "Note", kind: "note", description: "How artificial intelligence helps us prepare accurate applications securely." },
          { id: "15", name: "Privacy policy", type: "Link", kind: "link", externalUrl: "https://plylegal.com/privacy", description: "Read how we store and protect your confidential information." },
          { id: "16", name: "Terms of engagement", type: "Link", kind: "link", externalUrl: "https://plylegal.com/terms", description: "Our formal terms of engagement and legal obligations." },
        ];
      }

      const tempCat = categoryMap.get("templates and forms");
      if (tempCat && tempCat.items.length === 0) {
        tempCat.items = [
          { id: "17", name: "Employment reference template", type: "File", kind: "file", description: "Standard template for previous employers to draft letters." },
          { id: "18", name: "Personal statement template", type: "File", kind: "file", description: "Template for drafting personal statements and affidavits." },
        ];
      }
    }

    return Array.from(categoryMap.values());
  }, [template?.categories, items]);

  // Selected Category
  const selectedCategory = useMemo(() => {
    if (!selectedCategoryName) return null;
    return categories.find((c) => c.name.toLowerCase() === selectedCategoryName.toLowerCase()) || null;
  }, [categories, selectedCategoryName]);

  // Filtered items
  const filteredCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return selectedCategory.items.filter((item) => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || item.type?.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [selectedCategory, searchQuery, typeFilter]);

  if (isLoading || !application) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
            <div className="text-sm font-medium text-slate-600">Loading resources...</div>
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
        <div className="mx-auto w-full max-w-[1608px]">
          {/* ========================================================= */}
          {/* PAGE 6: CATEGORY DETAIL VIEW                              */}
          {/* ========================================================= */}
          {selectedCategory ? (
            <div>
              {/* Back to all categories */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryName(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to all categories</span>
                </button>
              </div>

              {/* Category Header Card */}
              <div className="mb-6 flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F2] text-[#244D42]">
                  {(() => {
                    const Icon = getCategoryIcon(selectedCategory.name, selectedCategory.icon);
                    return <Icon className="h-6 w-6" />;
                  })()}
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-slate-900">
                    {selectedCategory.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedCategory.description}
                  </p>
                </div>
              </div>

              {/* Resource Detail Cards List */}
              <div className="space-y-3">
                {filteredCategoryItems.map((item) => {
                  const isLink = item.kind === "link" || item.externalUrl;
                  const isFile = item.kind === "file";
                  const viewerUrl = isFile ? getResourceViewerUrl(item) : "";
                  const actionUrl = isLink ? item.externalUrl : viewerUrl;

                  return (
                    <div
                      key={item.id || item.name}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          {isLink ? <LinkIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 truncate">
                              {item.name}
                            </h3>
                            <ResourceTypePill type={item.type} />
                          </div>

                          {item.description && (
                            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          {item.kind === "note" && (item.noteHtml || item.noteText) && (
                            <div className="mt-3">
                              <ResourceNoteViewer
                                sanitizedHtml={item.noteHtml}
                                fallbackText={item.noteText}
                                previewText={item.notePreviewText}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 flex justify-end">
                        {isLink ? (
                          <a
                            href={actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            <span>Open link</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : actionUrl ? (
                          <a
                            href={actionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            <span>View</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            <span>View</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Notice Callout */}
              <div className="mt-8 rounded-xl border border-slate-200/90 bg-[#F0F5FF] p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <Info className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-6 text-slate-700">
                    <strong className="font-semibold text-slate-900">Need more information?</strong> If you can&apos;t find what you&apos;re looking for, please contact us or refer to the <a href="https://immi.homeaffairs.gov.au" target="_blank" rel="noopener noreferrer" className="text-[#244D42] font-semibold underline">Department of Home Affairs website</a>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* PAGE 5: RESOURCES OVERVIEW GRID                           */
            /* ========================================================= */
            <div>
              {/* Header & Controls */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Resources
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Useful information, guides and templates to help you with your Subclass 482 application.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search resources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200/90 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#244D42] focus:outline-none shadow-sm"
                    />
                  </div>

                  {/* Filter dropdown */}
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#244D42] focus:outline-none shadow-sm"
                  >
                    <option value="all">All types</option>
                    <option value="guide">Guide</option>
                    <option value="link">Link</option>
                    <option value="checklist">Checklist</option>
                    <option value="file">File</option>
                    <option value="note">Note</option>
                  </select>
                </div>
              </div>

              {/* Category Cards Stack */}
              <div className="space-y-4">
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category.name, category.icon);
                  const displayItems = category.items.slice(0, 4);

                  return (
                    <div
                      key={category.name}
                      className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition hover:shadow-md"
                    >
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
                        {/* Left Category Info */}
                        <div className="lg:col-span-4">
                          <div className="flex items-start gap-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF7F2] text-[#244D42]">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                {category.name}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Middle Items Preview */}
                        <div className="lg:col-span-6">
                          <div className="space-y-2 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
                            {displayItems.map((item) => (
                              <div
                                key={item.id || item.name}
                                onClick={() => setSelectedCategoryName(category.name)}
                                className="group flex items-center justify-between gap-3 py-1 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <ResourceTypePill type={item.type} />
                                  <span className="text-sm font-medium text-slate-700 truncate group-hover:text-[#244D42] transition-colors">
                                    {item.name}
                                  </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#244D42] shrink-0" />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right Action */}
                        <div className="lg:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryName(category.name)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            <span>View all</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
