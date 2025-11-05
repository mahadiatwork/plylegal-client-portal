"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore, updateUpload } from "@/stores/appDataStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UploadsPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const applicationsSnap = useSnapshot(applicationsStore);
  const appDataSnap = useSnapshot(appDataStore);
  const { toast } = useToast();
  
  const appId = params.id;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const uploads = appDataSnap.cache[appId]?.uploads || [];
  
  const handleOpenDialog = (upload) => {
    setSelectedUpload(upload);
    setSelectedFile(null);
    setError("");
    setDialogOpen(true);
  };

  const handleFileChange = (e) => {
    setError("");
    const file = e.target.files?.[0];
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File exceeds 5 MB limit");
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload PDF, JPG, PNG, DOC, or TXT files only.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedUpload || !application) return;

    // Check if application has a zohoId (Deal ID)
    if (!application.zohoId) {
      toast({
        title: "Error",
        description: "Application is not linked to a Zoho CRM Deal. Please sync your application first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Show loading state
      const loadingToast = toast({
        title: "Uploading...",
        description: `Uploading ${selectedFile.name} to Zoho CRM...`,
      });

      // Create FormData to send file to API
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('dealId', application.zohoId);
      formData.append('documentName', selectedUpload.name);

      // Upload to Zoho CRM via API route
      const response = await fetch('/api/uploads/zoho', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to upload file to Zoho CRM');
      }

      // Update local state with "Uploaded" status
      updateUpload(appId, selectedUpload.id, {
        status: "Uploaded",
        uploadedAt: new Date().toISOString().split('T')[0],
      });

      toast({
        title: "File uploaded successfully",
        description: `${selectedFile.name} has been uploaded to Zoho CRM.`,
      });

      setDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Pending': 'bg-gray-100 text-gray-700',
      'Uploaded': 'bg-blue-100 text-blue-700 border border-blue-300',
      'Under Review': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      'Approved': 'bg-green-100 text-green-700 border border-green-300',
      'Rejected': 'bg-red-100 text-red-700 border border-red-300',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles['Pending']}`}>
        {status}
      </span>
    );
  };
  
  if (!application) {
    return <div>Loading...</div>;
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
          <PillNav appId={appId} />
        </div>
        
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="font-semibold text-gray-900 text-2xl mb-2">Upload Documents</h1>
              <p className="text-sm text-gray-700">
                Upload supporting documents for your visa application. Accepted formats: PDF, JPG, PNG, DOC, TXT (max 5MB).
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Document Name</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Status</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Upload Date</th>
                      <th className="py-3 px-4 text-right text-sm font-medium text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {uploads.map((upload) => (
                      <tr key={upload.id} className="hover:bg-gray-50 transition-colors" data-testid={`row-upload-${upload.id}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{upload.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(upload.status)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700">{upload.uploadedAt || '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button 
                            onClick={() => handleOpenDialog(upload)}
                            className="px-3 py-1.5 border border-[#285646] text-[#285646] rounded-md text-xs font-medium hover:bg-[#285646] hover:text-white transition"
                            data-testid={`button-upload-${upload.id}`}
                          >
                            <UploadIcon className="w-3 h-3 inline mr-1" />
                            Upload
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              {selectedUpload?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="file">Choose File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="mt-2"
                data-testid="input-file"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Maximum file size: 5 MB
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !!error}
                data-testid="button-confirm-upload"
                className="bg-[#285646] hover:bg-[#1f4236]"
              >
                Upload File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
