"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceCenterItem } from "@/components/ResourceCenterItem";
import { auth } from "@/lib/firebase";
import { DEFAULT_TEMPLATE_CATEGORIES, loadResourcePageData } from "@/lib/resourcePageData";
import { compareResourceItems } from "@/lib/resourceOrdering";
import {
  BookOpen,
  FileText,
  Folder,
  Link as LinkIcon,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

const CATEGORY_ICONS = {
  folder: Folder,
  guide: BookOpen,
  policy: ShieldCheck,
  link: LinkIcon,
  file: FileText,
  note: ScrollText,
};

function normalizeTemplateCategories(categories) {
  const source = Array.isArray(categories)
    ? categories
    : DEFAULT_TEMPLATE_CATEGORIES;

  return source
    .map((category) => ({
      name: String(category?.name || "").trim(),
      icon: String(category?.icon || "folder").trim() || "folder",
    }))
    .filter((category) => category.name);
}

function categoryDisplayPriority(category) {
  const name = category.name.trim().toLowerCase();
  if (name === "for this matter") return 0;
  if (name === "uncategorized") return 2;
  return 1;
}

function groupResourcesByCategory(categories, items) {
  const categoryMap = new Map();

  normalizeTemplateCategories(categories).forEach((category) => {
    categoryMap.set(category.name.toLowerCase(), {
      ...category,
      items: [],
    });
  });

  items.forEach((item) => {
    if (item.status && item.status !== "active") return;
    if (item.kind !== "note" && item.kind !== "file" && !item.externalUrl) return;

    const categoryName = String(item.category || "").trim() || "Uncategorized";
    const key = categoryName.toLowerCase();

    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        name: categoryName,
        icon: "folder",
        items: [],
      });
    }

    categoryMap.get(key).items.push(item);
  });

  return Array.from(categoryMap.values())
    .map((category) => ({
      ...category,
      items: category.items.sort(compareResourceItems),
    }))
    .filter((category) => category.items.length > 0)
    .sort((left, right) => categoryDisplayPriority(left) - categoryDisplayPriority(right));
}

function CategoryIcon({ icon }) {
  const Icon = CATEGORY_ICONS[icon] || Folder;

  return (
    <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#EEF7F2] text-[#255E4A]">
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function ResourcesPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);

  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find((app) => app.id === appId);

  const groupedResources = useMemo(() => {
    return groupResourcesByCategory(template?.categories, items);
  }, [template?.categories, items]);

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

  if (isLoading || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-background">
      <div className="hidden lg:block lg:w-[18.5rem] lg:flex-shrink-0">
        <AppSidebar mode="contextual" application={application} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <AppSidebar mode="contextual" application={application} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="lg:hidden">
          <PillNav appId={appId} slug={slug} />
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-bold mb-3">Resources</h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                We have included these resources to provide useful information relevant to your visa matter.
              </p>
            </div>

            <div className="mb-8">
              {resourcesLoading ? (
                <Card className="rounded-lg shadow-sm">
                  <CardHeader>
                    <CardDescription>Loading resources...</CardDescription>
                  </CardHeader>
                </Card>
              ) : resourcesError ? (
                <Card className="rounded-lg shadow-sm border-red-200 bg-red-50">
                  <CardHeader>
                    <CardDescription className="text-red-700">{resourcesError}</CardDescription>
                  </CardHeader>
                </Card>
              ) : groupedResources.length === 0 ? (
                <Card className="rounded-lg shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">No resources available yet</CardTitle>
                    <CardDescription>
                      Resources for your visa type will appear here once they are published.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="space-y-8">
                  {groupedResources.map((category) => (
                    <section key={category.name}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <CategoryIcon icon={category.icon} />
                          <h2 className="truncate font-serif text-xl font-semibold text-gray-900">{category.name}</h2>
                        </div>
                        <span className="inline-flex h-7 items-center rounded-full bg-[#EEF7F2] px-3 text-xs font-semibold text-[#255E4A]">
                          {category.items.length} {category.items.length === 1 ? "resource" : "resources"}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 border-t border-[#DDE7E1] pt-3">
                        {category.items.map((item) => (
                          <ResourceCenterItem key={`${item.resourceSource || "resource"}:${item.id}`} item={item} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
