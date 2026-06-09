"use client";

import { useState, useEffect, useMemo } from "react";
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
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  ShieldCheck,
  StickyNote,
  Video,
} from "lucide-react";

const RESOURCE_SECTION_ORDER = ["documents", "health", "lodgement", "guides"];

const RESOURCE_SECTIONS = {
  documents: {
    label: "Documents & Evidence",
    icon: FileText,
  },
  health: {
    label: "Health & Police Checks",
    icon: ShieldCheck,
  },
  lodgement: {
    label: "Lodgement & Status",
    icon: ClipboardCheck,
  },
  guides: {
    label: "Other Guides",
    icon: BookOpen,
  },
};

function getResourceIcon(type) {
  if (type === "document" || type === "file") return FileText;
  if (type === "guide") return BookOpen;
  if (type === "video") return Video;
  if (type === "note") return StickyNote;
  return LinkIcon;
}

function getResourceTypeLabel(type) {
  if (!type) return "Resource";
  return type.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeSectionKey(value) {
  const text = String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .trim();

  if (!text) return "";
  if (text.includes("document") || text.includes("evidence")) return "documents";
  if (text.includes("health") || text.includes("police")) return "health";
  if (text.includes("lodgement") || text.includes("status")) return "lodgement";
  if (text.includes("guide")) return "guides";
  return "";
}

function getResourceSectionKey(resource) {
  const explicit = normalizeSectionKey(resource.category);
  if (explicit) return explicit;

  const text = `${resource.title} ${resource.description} ${resource.noteText}`.toLowerCase();

  if (text.includes("relationship evidence") || text.includes("evidence")) return "documents";
  if (
    text.includes("health") ||
    text.includes("police") ||
    text.includes("character") ||
    text.includes("biometric")
  ) {
    return "health";
  }
  if (
    text.includes("medicare") ||
    text.includes("processing time") ||
    text.includes("lodgement") ||
    text.includes("status")
  ) {
    return "lodgement";
  }

  return "guides";
}

function ResourceCard({ resource }) {
  const Icon = getResourceIcon(resource.type);
  const isLinkable = Boolean(resource.url);
  const content = (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-[#DEE3FF]">
            <Icon className="w-5 h-5 text-[#4F726B]" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold mb-1">
              {resource.title}
            </CardTitle>
            <CardDescription className="text-sm whitespace-pre-wrap">
              {resource.noteText || resource.description}
            </CardDescription>
            <div className="mt-2">
              <span className="inline-flex items-center text-xs text-muted-foreground">
                {getResourceTypeLabel(resource.type)}
              </span>
            </div>
          </div>
        </div>
        {isLinkable && <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </div>
    </CardHeader>
  );

  return (
    <Card className="rounded-xl shadow-sm hover-elevate transition-all duration-200">
      {isLinkable ? (
        <a 
          href={resource.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
          data-testid={`link-resource-${resource.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {content}
      </a>
      ) : (
        <div className="block">
          {content}
        </div>
      )}
    </Card>
  );
}

export default function ResourcesPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState("");
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  
  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const groupedResources = useMemo(() => {
    const grouped = {
      documents: [],
      health: [],
      lodgement: [],
      guides: [],
    };

    resources.forEach((resource) => {
      const key = getResourceSectionKey(resource);
      if (!grouped[key]) {
        grouped.guides.push(resource);
        return;
      }
      grouped[key].push(resource);
    });

    return RESOURCE_SECTION_ORDER
      .map((key) => ({
        key,
        ...RESOURCE_SECTIONS[key],
        resources: grouped[key],
      }))
      .filter((section) => section.resources.length > 0);
  }, [resources]);

  const loadResources = async () => {
    if (!appId) {
      setResources([]);
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

      const response = await fetch(`/api/resources/shared?applicationId=${appId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to load shared resources");
      }

      setResources(data.resources || []);
    } catch (error) {
      console.error("Error loading shared resources:", error);
      setResourcesError("We could not load your resources. Please refresh the page or contact Ply Legal.");
    } finally {
      setResourcesLoading(false);
    }
  };

  // Load applications data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Wait for auth to be ready
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const userId = authSnap.user?.id;
        if (!userId) {
          setIsLoading(false);
          return;
        }

        // Load applications if not already loaded
        if (applicationsSnap.applications.length === 0) {
          await applicationsStore.loadApplications(userId);
        }

        await loadResources();
      } catch (error) {
        console.error('Error loading data:', error);
        setResourcesLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);
  
  // Show loading state while data is being loaded
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
              ) : resources.length === 0 ? (
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">No resources available yet</CardTitle>
                    <CardDescription>
                      No shared resources are available yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="space-y-8">
                  {groupedResources.map((section) => {
                    const SectionIcon = section.icon;
                    return (
                      <section key={section.key}>
                        <div className="mb-4 flex items-center gap-2">
                          <SectionIcon className="h-5 w-5 text-[#4F726B]" />
                          <h2 className="font-serif text-2xl font-semibold">{section.label}</h2>
                        </div>
                        <div className="space-y-3">
                          {section.resources.map((resource) => (
                            <ResourceCard key={resource.id} resource={resource} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
