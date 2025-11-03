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
import { ExternalLink, Plus, FileText } from "lucide-react";
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
  
  const appsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  
  useEffect(() => {
    // Load applications for current user
    if (authSnap.user?.id) {
      applicationsStore.loadApplications(authSnap.user.id);
    }
  }, [authSnap.user?.id]);
  
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
                      {appsSnap.applications.map((app) => (
                        <tr 
                          key={app.id} 
                          className="hover:bg-gray-50 transition-colors"
                          data-testid={`row-application-${app.id}`}
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900" data-testid={`text-reference-${app.id}`}>
                              {app.reference}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700">{app.type}</span>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-700">{app.updated}</span>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
