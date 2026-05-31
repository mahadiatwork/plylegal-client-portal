"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CorrectionsPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [corrections, setCorrections] = useState([
    { id: '1', fieldName: '', details: '' }
  ]);
  const { toast } = useToast();
  const nextIdRef = useRef(2);
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
  
  const addCorrection = () => {
    const newId = nextIdRef.current.toString();
    nextIdRef.current += 1;
    setCorrections([...corrections, { id: newId, fieldName: '', details: '' }]);
  };
  
  const removeCorrection = (id) => {
    if (corrections.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one correction field is required.",
        variant: "destructive",
      });
      return;
    }
    setCorrections(corrections.filter(c => c.id !== id));
  };
  
  const updateCorrection = (id, field, value) => {
    setCorrections(corrections.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };
  
  const handleSubmit = () => {
    const validCorrections = corrections.filter(c => c.fieldName.trim() && c.details.trim());
    
    if (validCorrections.length === 0) {
      toast({
        title: "No corrections to submit",
        description: "Please fill in at least one correction with both field name and details.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Corrections submitted",
      description: `${validCorrections.length} correction(s) have been submitted successfully.`,
    });
    
    nextIdRef.current = 2;
    setCorrections([{ id: '1', fieldName: '', details: '' }]);
  };
  
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
        
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Document Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-[8.5/11] w-full border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <iframe
                      src="https://workdrive.zohoexternal.com/external/79e3de51fdf0de1b1e8ee5f9ad2d0ce041d27ac8d4d1e873eac828de0d162a55"
                      className="w-full h-full"
                      title="PDF Preview"
                      data-testid="iframe-pdf-preview"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Document Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {corrections.map((correction, index) => (
                    <div key={correction.id} className="space-y-4 pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-900">
                          Correction #{index + 1}
                        </Label>
                        {corrections.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCorrection(correction.id)}
                            data-testid={`button-remove-correction-${correction.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`fieldName-${correction.id}`} className="text-sm text-gray-700">
                          Field Name
                        </Label>
                        <Input
                          id={`fieldName-${correction.id}`}
                          type="text"
                          placeholder="e.g., Date of Birth"
                          value={correction.fieldName}
                          onChange={(e) => updateCorrection(correction.id, 'fieldName', e.target.value)}
                          data-testid={`input-field-name-${correction.id}`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`details-${correction.id}`} className="text-sm text-gray-700">
                          Details
                        </Label>
                        <Textarea
                          id={`details-${correction.id}`}
                          placeholder="Describe the correction needed..."
                          value={correction.details}
                          onChange={(e) => updateCorrection(correction.id, 'details', e.target.value)}
                          rows={3}
                          data-testid={`input-details-${correction.id}`}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCorrection}
                      className="flex-1"
                      data-testid="button-add-correction"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="flex-1 bg-[#022C22] hover:bg-[#022C22]"
                      data-testid="button-submit-corrections"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
