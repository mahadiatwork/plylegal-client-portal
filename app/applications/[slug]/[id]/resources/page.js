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
import { auth } from "@/lib/firebase";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Folder,
  Link as LinkIcon,
} from "lucide-react";

function buildTree(items) {
  const map = {};
  const roots = [];

  items.forEach((item) => {
    map[item.id] = { ...item, children: [] };
  });

  items.forEach((item) => {
    const node = map[item.id];
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(node);
    } else if (!item.parentId) {
      roots.push(node);
    }
  });

  return roots;
}

function getItemIcon(kind) {
  if (kind === "folder") return Folder;
  if (kind === "file") return FileText;
  return LinkIcon;
}

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isFolder = node.kind === "folder";
  const Icon = getItemIcon(node.kind);
  const hasExternalUrl = Boolean(node.externalUrl);

  if (isFolder) {
    return (
      <div>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-[#DEE3FF]/50 transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-[#4F726B] flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#4F726B] flex-shrink-0" />
          )}
          <Folder className="h-4 w-4 text-[#4F726B] flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children.length > 0 && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const content = (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[#DEE3FF]/50 transition-colors">
      <Icon className="h-4 w-4 text-[#4F726B] flex-shrink-0" />
      <span className="flex-1 truncate">{node.name}</span>
      {hasExternalUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
    </div>
  );

  if (hasExternalUrl) {
    return (
      <a
        href={node.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`link-resource-${node.name.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {content}
      </a>
    );
  }

  return <div className="opacity-60 cursor-default">{content}</div>;
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

  const tree = useMemo(() => buildTree(items), [items]);

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

      const response = await fetch(`/api/resources/template?applicationId=${appId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load resources");
      }

      setTemplate(data.template || null);
      setItems(data.items || []);
    } catch (error) {
      console.error("Error loading resources:", error);
      setResourcesError("We could not load your resources. Please refresh the page or contact Ply Legal.");
    } finally {
      setResourcesLoading(false);
    }
  }, [appId]);

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
                These resources provide official guidance and helpful references for your visa journey.
                Always verify details on official government websites before taking any action.
              </p>
            </div>

            <div className="mb-8">
              {resourcesLoading ? (
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardDescription>Loading resources...</CardDescription>
                  </CardHeader>
                </Card>
              ) : resourcesError ? (
                <Card className="rounded-xl shadow-sm border-red-200 bg-red-50">
                  <CardHeader>
                    <CardDescription className="text-red-700">{resourcesError}</CardDescription>
                  </CardHeader>
                </Card>
              ) : items.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">No resources available yet</CardTitle>
                    <CardDescription>
                      Resources for your visa type will appear here once they are published.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div>
                  {template?.title && (
                    <h2 className="font-serif text-2xl font-semibold mb-4">{template.title}</h2>
                  )}
                  <div className="rounded-xl border bg-white shadow-sm p-4">
                    {tree.map((node) => (
                      <TreeNode key={node.id} node={node} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
