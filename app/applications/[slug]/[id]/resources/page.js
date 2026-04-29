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
import { BookOpen, ExternalLink, FileText, Heart, Shield, Globe, Info } from "lucide-react";

const resources = [
  {
    title: "Preparing your relationship evidence",
    description: "Guide on documenting your relationship for visa applications",
    url: "https://immi.homeaffairs.gov.au/visas/supporting/relationship",
    type: "Guide",
    icon: Heart,
  },
  {
    title: "Organise your health examination",
    description: "Information about health requirements and approved panel physicians",
    url: "https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/health",
    type: "Official Link",
    icon: Shield,
  },
  {
    title: "Organise your police clearances",
    description: "Character requirements and how to obtain police certificates",
    url: "https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/character",
    type: "Official Link",
    icon: Shield,
  },
  {
    title: "Applying for Medicare",
    description: "How to apply for Medicare while your visa is being processed",
    url: "https://www.servicesaustralia.gov.au/medicare",
    type: "Guide",
    icon: Heart,
  },
  {
    title: "Global visa processing times",
    description: "Check current processing times for different visa types",
    url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-processing-times",
    type: "Link",
    icon: Globe,
  },
  {
    title: "Australian Values Statement",
    description: "Information about Australian values and the values statement",
    url: "https://immi.homeaffairs.gov.au/help-support/values/statement",
    type: "Document",
    icon: FileText,
  },
  {
    title: "Arranging biometrics",
    description: "How to provide biometric information for your visa application",
    url: "https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/biometrics",
    type: "Guide",
    icon: Info,
  },
];

function ResourceCard({ resource }) {
  const Icon = resource.icon;
  
  return (
    <Card className="rounded-xl shadow-sm hover-elevate transition-all duration-200">
      <a 
        href={resource.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block"
        data-testid={`link-resource-${resource.title.toLowerCase().replace(/\s+/g, '-')}`}
      >
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
                <CardDescription className="text-sm">
                  {resource.description}
                </CardDescription>
                <div className="mt-2">
                  <span className="inline-flex items-center text-xs text-muted-foreground">
                    {resource.type}
                  </span>
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          </div>
        </CardHeader>
      </a>
    </Card>
  );
}

export default function ResourcesPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
                These resources provide official guidance and helpful references for your visa journey.
                Always verify details on official government websites before taking any action.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="font-serif text-xl font-semibold mb-4">Documents & Evidence</h2>
              <div className="space-y-3">
                {resources.slice(0, 1).map((resource, index) => (
                  <ResourceCard key={index} resource={resource} />
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="font-serif text-xl font-semibold mb-4">Health & Police Checks</h2>
              <div className="space-y-3">
                {resources.slice(1, 3).map((resource, index) => (
                  <ResourceCard key={index} resource={resource} />
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="font-serif text-xl font-semibold mb-4">Lodgement & Status</h2>
              <div className="space-y-3">
                {resources.slice(3, 5).map((resource, index) => (
                  <ResourceCard key={index} resource={resource} />
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-serif text-xl font-semibold mb-4">Other Guides</h2>
              <div className="space-y-3">
                {resources.slice(5).map((resource, index) => (
                  <ResourceCard key={index} resource={resource} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
