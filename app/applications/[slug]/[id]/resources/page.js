"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookOpen, ExternalLink, FileText, Link as LinkIcon, StickyNote, Video } from "lucide-react";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeResource(docSnap) {
  const data = docSnap.data() || {};
  const type = String(data.type || "link").toLowerCase();

  return {
    id: docSnap.id,
    title: data.title || "Untitled resource",
    description: data.description || "",
    noteText: data.noteText || data.content || data.description || "",
    url: data.publicUrl || data.url || "",
    type,
    status: String(data.status || "active").toLowerCase(),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

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

function ResourceCard({ resource }) {
  const Icon = getResourceIcon(resource.type);
  const isLinkable = Boolean(resource.url);
  const content = (
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-[#DEE3FF]">
            <Icon className="w-5 h-5 text-[#285646]" />
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
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);

  useEffect(() => {
    const loadResources = async () => {
      if (!appId) return;
      setResourcesLoading(true);
      setResourcesError("");

      try {
        const resourcesRef = collection(db, "applications", appId, "resources");
        const resourcesSnap = await getDocs(resourcesRef);
        const loadedResources = resourcesSnap.docs
          .map(normalizeResource)
          .filter((resource) => resource.status !== "inactive" && resource.status !== "archived")
          .sort((a, b) => toMillis(b.createdAt || b.updatedAt) - toMillis(a.createdAt || a.updatedAt));

        setResources(loadedResources);
      } catch (error) {
        console.error("Error loading resources:", error);
        setResourcesError("We could not load your resources. Please refresh the page or contact Ply Legal.");
      } finally {
        setResourcesLoading(false);
      }
    };

    loadResources();
  }, [appId]);
  
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
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block">
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
      
      <div className="flex-1 flex flex-col">
        <AppHeader 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
        <div className="lg:hidden">
          <PillNav appId={appId} slug={slug} />
        </div>
        
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="font-serif text-3xl font-bold mb-3">Resources</h1>
              <p className="text-base text-muted-foreground leading-relaxed">
                View helpful links, documents, and videos shared by Ply Legal for this application.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="font-serif text-xl font-semibold mb-4">Application Resources</h2>
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
                      Ply Legal has not shared any resources for this application yet.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
              <div className="space-y-3">
                {resources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
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
