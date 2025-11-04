"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore, authStore } from "@/stores";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Plus, FileText, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { nanoid } from "nanoid";

const VISA_TYPES = [
  { value: "partner", label: "Partner Visa (820/801)" },
  { value: "protection", label: "Protection Visa" },
  { value: "temporary-work", label: "Temporary Work Visa" },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVisaType, setSelectedVisaType] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showRawDeals, setShowRawDeals] = useState(false);
  const [isFetchingDeals, setIsFetchingDeals] = useState(false);
  
  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  
  // Load user profile first
  useEffect(() => {
    if (authSnap.user?.id && !authSnap.userProfile) {
      console.log('📋 Loading user profile...');
      authStore.loadUserProfile();
    }
  }, [authSnap.user?.id]);

  // Load applications from Firebase (they should already be synced from Zoho on login)
  // Also fetch from Zoho if not already in Firebase (fallback)
  useEffect(() => {
    const loadApplications = async () => {
      if (authSnap.user?.id) {
        // First, load from Firebase
        await applicationsStore.loadApplications(authSnap.user.id);
        
        // If no applications found and user has zohoContactId, fetch from Zoho
        if (appsSnap.applications.length === 0 && authSnap.userProfile?.zohoContactId) {
          console.log('📋 No applications in Firebase, fetching from Zoho...');
          try {
            const response = await fetch('/api/applications/fetch-zoho-deals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: authSnap.user.id,
                zohoContactId: authSnap.userProfile.zohoContactId,
              }),
            });

            const result = await response.json();
            if (result.success) {
              applicationsStore.rawDealsData = result.rawDealsData || [];
              console.log(`✅ ${result.applicationsCount || 0} applications saved to Firebase`);
              console.log('📋 Reloading applications from Firebase...');
              // Reload from Firebase after saving
              const reloadedApps = await applicationsStore.loadApplications(authSnap.user.id);
              console.log(`✅ Loaded ${reloadedApps?.length || 0} applications from Firebase`);
              console.log('📋 Applications in store:', reloadedApps);
            }
          } catch (error) {
            console.error('⚠️ Failed to fetch deals:', error.message);
          }
        }
      }
    };
    
    loadApplications();
  }, [authSnap.user?.id, authSnap.userProfile?.zohoContactId, appsSnap.applications.length]);
  
  const handleCreateApplication = async () => {
    if (!selectedVisaType) {
      toast({
        title: "Selection Required",
        description: "Please select a visa type.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const visaTypeObj = VISA_TYPES.find(v => v.value === selectedVisaType);
      const appId = nanoid(12);
      const now = new Date();
      
      const newApp = {
        id: appId,
        userId: authSnap.user.id,
        reference: `PLY-${appId.toUpperCase()}`,
        type: visaTypeObj.label,
        visaTypeCode: selectedVisaType,
        status: "draft",
        updated: now.toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        zohoId: null, // Will be set when synced from ZOHO CRM
      };
      
      const result = await applicationsStore.createApplication(newApp);
      
      if (result.success) {
        toast({
          title: "Application Created",
          description: `Reference: ${newApp.reference}`,
        });
        setDialogOpen(false);
        setSelectedVisaType("");
        
        // Navigate to questionnaire
        router.push(`/applications/${appId}/questionnaire`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create application.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating application:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block">
        <AppSidebar mode="global" />
      </div>
      
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <AppSidebar mode="global" onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col">
        <AppHeader 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="font-semibold text-gray-900 text-2xl">Visa Applications</h1>
                <p className="text-sm text-gray-700 mt-1">Manage your visa applications</p>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#285646] hover:bg-[#1f4236]"
                    data-testid="button-create-application"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Application
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Application</DialogTitle>
                    <DialogDescription>
                      Select the visa type for your application
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="visa-type">Visa Type *</Label>
                      <Select 
                        value={selectedVisaType} 
                        onValueChange={setSelectedVisaType}
                      >
                        <SelectTrigger id="visa-type" data-testid="select-visa-type">
                          <SelectValue placeholder="Select visa type" />
                        </SelectTrigger>
                        <SelectContent>
                          {VISA_TYPES.map((visa) => (
                            <SelectItem key={visa.value} value={visa.value}>
                              {visa.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setSelectedVisaType("");
                      }}
                      disabled={isCreating}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateApplication}
                      disabled={isCreating || !selectedVisaType}
                      className="bg-[#285646] hover:bg-[#1f4236]"
                      data-testid="button-confirm-create"
                    >
                      {isCreating ? "Creating..." : "Create Application"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p><strong>Debug:</strong> Applications in store: {appsSnap.applications.length}</p>
                <p><strong>Raw Deals:</strong> {Array.isArray(appsSnap.rawDealsData) ? appsSnap.rawDealsData.length : 'null'}</p>
                <p><strong>User ID:</strong> {authSnap.user?.id || 'none'}</p>
                <p><strong>Zoho Contact ID:</strong> {authSnap.userProfile?.zohoContactId || 'none'}</p>
              </div>
            )}
            
            {appsSnap.isLoading ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-600">Loading applications...</p>
              </div>
            ) : appsSnap.applications.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
                <p className="text-gray-600 mb-6">Get started by creating your first visa application.</p>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-[#285646] hover:bg-[#1f4236]"
                  data-testid="button-create-first-application"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Application
                </Button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Reference</th>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Type</th>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Status</th>
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Updated</th>
                        <th className="py-3 px-4 text-right text-sm font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {appsSnap.applications.map((app) => {
                        console.log('📋 Rendering application:', app.id, app.reference, app.type, app.status);
                        return (
                          <tr 
                            key={app.id} 
                            className="hover:bg-gray-50 transition-colors"
                            data-testid={`row-application-${app.id}`}
                          >
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium text-gray-900" data-testid={`text-reference-${app.id}`}>
                                {app.reference || app.id}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-700">{app.type || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={app.status || 'Draft'} />
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-700">{app.updated || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => router.push(`/applications/${app.id}/questionnaire`)}
                                  data-testid={`button-open-${app.id}`}
                                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition"
                                >
                                  Open
                                </button>
                                <button
                                  onClick={() => router.push(`/applications/${app.id}/review`)}
                                  data-testid={`button-review-${app.id}`}
                                  className="px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-900 transition flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Review & PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Raw Deals Data JSON Display */}
            <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="w-full px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Raw Deals Data from Zoho CRM (JSON)
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({Array.isArray(appsSnap.rawDealsData) ? appsSnap.rawDealsData.length : appsSnap.rawDealsData ? 1 : 0} deals)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {authSnap.userProfile?.zohoContactId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsFetchingDeals(true);
                        try {
                          console.log('🔄 Manual refresh: Fetching deals from Zoho via API...');
                          const response = await fetch('/api/applications/fetch-zoho-deals', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: authSnap.user.id,
                              zohoContactId: authSnap.userProfile.zohoContactId,
                            }),
                          });

            const result = await response.json();

            if (result.success) {
              // Store raw deals data in store
              applicationsStore.rawDealsData = result.rawDealsData || [];
              console.log(`✅ ${result.applicationsCount || 0} applications saved to Firebase`);
              // Reload applications from Firebase
              const reloadedApps = await applicationsStore.loadApplications(authSnap.user.id);
              console.log(`✅ Loaded ${reloadedApps?.length || 0} applications from Firebase`);
              toast({
                title: "Success",
                description: `Fetched ${result.rawDealsData?.length || 0} deals and saved ${result.applicationsCount || 0} applications to Firebase`,
              });
            } else {
              throw new Error(result.error || 'Failed to fetch deals');
            }
                        } catch (error) {
                          console.error('❌ Error fetching deals:', error);
                          toast({
                            title: "Error",
                            description: error.message || "Failed to fetch deals",
                            variant: "destructive",
                          });
                        } finally {
                          setIsFetchingDeals(false);
                        }
                      }}
                      disabled={isFetchingDeals}
                    >
                      {isFetchingDeals ? "Fetching..." : "Refresh from Zoho"}
                    </Button>
                  )}
                  <button
                    onClick={() => setShowRawDeals(!showRawDeals)}
                    className="p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    {showRawDeals ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
              
              {showRawDeals && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      This is the raw JSON data fetched from Zoho CRM's Deals related list
                    </p>
                    {appsSnap.rawDealsData && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(appsSnap.rawDealsData, null, 2));
                          toast({
                            title: "Copied!",
                            description: "Raw deals JSON copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy JSON
                      </Button>
                    )}
                  </div>
                  {appsSnap.rawDealsData ? (
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                      {JSON.stringify(appsSnap.rawDealsData, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No deals data available. Click "Refresh from Zoho" to fetch.</p>
                      {!authSnap.userProfile?.zohoContactId && (
                        <p className="text-sm mt-2 text-orange-600">
                          No Zoho Contact ID found in user profile.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
