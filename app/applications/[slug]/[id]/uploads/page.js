"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore, updateUpload } from "@/stores/appDataStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, ChevronDown, Trash2 } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

function getMatterDocumentName(doc = {}) {
  const idSuffix = doc.id ? String(doc.id).slice(-6) : 'Unknown';
  return doc.Name ||
    doc.Matter_Document_Name ||
    doc.Document_Name ||
    doc.File_Name ||
    doc.matter_document_name ||
    doc.document_name ||
    doc.file_name ||
    doc.name ||
    `Document ${idSuffix}`;
}

function getMatterDocumentComment(doc = {}) {
  return doc.Decline_Reason ||
    doc.Comments ||
    doc.Rejection_Comments ||
    doc.comments ||
    doc.rejection_comments ||
    doc.decline_reason ||
    '';
}

export default function UploadsPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [matterDocuments, setMatterDocuments] = useState([]);
  const [documentsJson, setDocumentsJson] = useState(null);
  const [loadingMatterDocs, setLoadingMatterDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const applicationsSnap = useSnapshot(applicationsStore);
  const appDataSnap = useSnapshot(appDataStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  
  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const uploads = appDataSnap.cache[appId]?.uploads || [];

  // Load applications and uploads data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Wait for auth to be ready
        if (!authSnap.isAuthenticated && !authSnap.user) {
          // Check session first
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

        // Load uploads data from localStorage (synchronous operation)
        if (appId) {
          appDataStore.loadUploads(appId);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);

  // Fetch documents_json from Deal
  useEffect(() => {
    const fetchDocumentsJson = async () => {
      if (!application?.zohoId) {
        return;
      }

      try {
        const response = await fetch(`/api/deals/${application.zohoId}`);
        const result = await response.json();
        
        if (result.success && result.deal?.documents_json) {
          const jsonData = typeof result.deal.documents_json === 'string' 
            ? JSON.parse(result.deal.documents_json) 
            : result.deal.documents_json;
          console.log('📋 documents_json received:', JSON.stringify(jsonData, null, 2));
          setDocumentsJson(jsonData);
        } else {
          console.log('📋 No documents_json found in Deal');
          setDocumentsJson(null);
        }
      } catch (error) {
        console.error('Error fetching documents_json:', error);
        setDocumentsJson(null);
      }
    };

    if (application?.zohoId && !isLoading) {
      fetchDocumentsJson();
    }
  }, [application?.zohoId, isLoading]);

  // Fetch Matter Documents from Zoho CRM
  useEffect(() => {
    const fetchMatterDocuments = async () => {
      if (!application?.zohoId) {
        setLoadingMatterDocs(false);
        return;
      }

      setLoadingMatterDocs(true);
      try {
        const response = await fetch(`/api/uploads/matter-documents?dealId=${application.zohoId}`);
        const result = await response.json();
        
        if (result.success) {
          const docs = result.documents || [];
          console.log('📦 Matter Documents received:', JSON.stringify(docs, null, 2));
          setMatterDocuments(docs);
        } else {
          console.error('Error fetching matter documents:', result.error);
        }
      } catch (error) {
        console.error('Error fetching matter documents:', error);
      } finally {
        setLoadingMatterDocs(false);
      }
    };

    if (application?.zohoId && !isLoading) {
      fetchMatterDocuments();
    }
  }, [application?.zohoId, isLoading]);
  
  const handleOpenDialog = (doc) => {
    // Create a compatible upload object from Matter Document
    // Use "Name" key as primary source for document name
    const documentName = doc.Name || doc.Matter_Document_Name || doc.Document_Name || doc.File_Name || 'Document';
    const uploadObj = {
      id: doc.id,
      name: documentName,
      status: doc.Document_Status || 'Pending',
      matterDocumentId: doc.id,
      matterDocumentName: documentName
    };
    setSelectedUpload(uploadObj);
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
    if (!selectedFile || !selectedUpload || !application || uploading) return;

    // Check if application has a zohoId (Deal ID)
    if (!application.zohoId) {
      toast({
        title: "Error",
        description: "Application is not linked to a Zoho CRM Deal. Please sync your application first.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
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
      // Use matterDocumentName if it's a Matter Document, otherwise use the upload name
      const documentName = selectedUpload.matterDocumentName || selectedUpload.name;
      formData.append('documentName', documentName);

      // Upload to Zoho CRM via API route
      const response = await fetch('/api/uploads/zoho', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      console.log('📤 Upload API response:', result);

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.message || 'Failed to upload file to Zoho CRM';
        console.error('❌ Upload failed:', errorMsg);
        console.error('Response details:', result);
        throw new Error(errorMsg);
      }

      console.log('✅ Upload API call successful');

      toast({
        title: "File uploaded successfully",
        description: `${selectedFile.name} has been uploaded and is now awaiting approval.`,
      });

      // Refresh Matter Documents after successful upload to get updated status
      if (application.zohoId) {
        const refreshResponse = await fetch(`/api/uploads/matter-documents?dealId=${application.zohoId}`);
        const refreshResult = await refreshResponse.json();
        if (refreshResult.success) {
          setMatterDocuments(refreshResult.documents || []);
        }
      }

      setDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Pending': 'bg-gray-100 text-gray-700',
      'Not Submitted Yet': 'bg-purple-100 text-purple-700 border border-purple-300',
      'Uploaded': 'bg-blue-100 text-blue-700 border border-blue-300',
      'Awaiting Approval': 'bg-orange-100 text-orange-700 border border-orange-300',
      'Under Review': 'bg-yellow-100 text-yellow-700 border border-yellow-300',
      'Approved': 'bg-green-100 text-green-700 border border-green-300',
      'Rejected': 'bg-red-100 text-red-700 border border-red-300',
      'Declined': 'bg-red-100 text-red-700 border border-red-300',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles['Pending']}`}>
        {status || 'Pending'}
      </span>
    );
  };

  const formatDate = (dateString, status) => {
    // Don't show date for "Not Submitted Yet" documents
    if (!dateString || status === 'Not Submitted Yet' || status === 'Pending') {
      return '—';
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const canUpload = (status) => {
    // Always allow uploads - users can upload multiple documents
    return true;
  };

  const renderUploadButton = (doc, status) => {
    const uploadAllowed = canUpload(status);

    return uploadAllowed ? (
      <button
        type="button"
        onClick={() => handleOpenDialog(doc)}
        className="inline-flex items-center justify-center gap-1 rounded-md border border-[#4F726B] px-3 py-1.5 text-xs font-medium text-[#4F726B] transition hover:bg-[#4F726B] hover:text-white"
      >
        <UploadIcon className="w-3 h-3" />
        Upload
      </button>
    ) : (
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center justify-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-400 opacity-50"
      >
        <UploadIcon className="w-3 h-3" />
        Upload
      </button>
    );
  };

  const renderMobileDocumentCard = (doc, statusFallback = 'Not Submitted Yet') => {
    const status = doc.Document_Status || statusFallback;
    const documentName = getMatterDocumentName(doc);
    const comment = getMatterDocumentComment(doc);

    return (
      <div key={doc.id || documentName} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
          <div className="min-w-0 flex-1">
            <div className="break-words text-sm font-medium text-gray-800">{documentName}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {getStatusBadge(status)}
              {renderUploadButton(doc, status)}
            </div>
            <div className="mt-3 text-xs font-medium uppercase text-gray-500">Comments</div>
            <div className="mt-1 break-words text-sm text-gray-700">
              {comment || <span className="text-xs text-gray-400">No comments</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Organize documents by categories from documents_json
  // IMPORTANT: All document data (names, status, comments) comes from Zoho Matter Documents
  // JSON is ONLY used for categorization and ordering
  const organizedDocuments = useMemo(() => {
    // If no Zoho documents, return empty
    if (!Array.isArray(matterDocuments) || matterDocuments.length === 0) {
      return { categories: [], uncategorized: [] };
    }

    // If no documents_json, show all Zoho documents as uncategorized
    if (!documentsJson) {
      return { categories: [], uncategorized: matterDocuments };
    }

    // Parse documents_json structure
    // Expected structure: { categories: [{ name: "...", items: [{ name: "...", serial: 1 }] }] }
    const categories = documentsJson.categories || documentsJson || [];
    
    console.log('📋 documents_json structure:', JSON.stringify(documentsJson, null, 2));
    console.log('📦 Matter Documents count:', matterDocuments.length);
    
    // Create maps from JSON for matching (reverse lookup)
    // Map: serial/item name → { category, itemIndex }
    const jsonItemBySerial = {};
    const jsonItemByName = {};
    const jsonItemByNameNormalized = {}; // For fuzzy matching
    
    categories.forEach(category => {
      const categoryName = category.name || 'Unnamed Category';
      const categoryItems = category.items || [];
      
      categoryItems.forEach((item, itemIndex) => {
        // Map by serial
        if (item.serial !== null && item.serial !== undefined && item.serial !== '') {
          const serialStr = String(item.serial);
          const serialNum = Number(item.serial);
          jsonItemBySerial[serialStr] = { category: categoryName, itemIndex };
          jsonItemBySerial[serialNum] = { category: categoryName, itemIndex };
        }
        
        // Map by name - check multiple field names (text, name, title)
        // JSON structure may use item.text, item.name, or item.title
        const itemNameValue = item.text || item.name || item.title;
        if (itemNameValue) {
          const itemName = itemNameValue.toLowerCase().trim();
          jsonItemByName[itemName] = { category: categoryName, itemIndex };
          
          // Also create normalized version for fuzzy matching
          const fuzzyName = itemName
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .trim();
          jsonItemByNameNormalized[fuzzyName] = { category: categoryName, itemIndex };
        }
      });
    });

    console.log('🔍 JSON items by serial:', Object.keys(jsonItemBySerial));
    console.log('🔍 JSON items by name (sample):', Object.keys(jsonItemByName).slice(0, 5));

    // Now match each Zoho document to a JSON item
    // Structure: { category: { documents: [{ doc, itemIndex }] } }
    const documentsByCategory = {};
    const matchedDocumentIds = new Set();
    
    matterDocuments.forEach(doc => {
      const docSerial = doc.document_Serial || doc.Document_Serial;
      const docName = doc.Name || doc.Matter_Document_Name || doc.Document_Name || doc.File_Name || '';
      
      let matchedJsonItem = null;
      let matchMethod = null;
      
      // Try to match by serial first
      if (docSerial !== null && docSerial !== undefined && docSerial !== '') {
        const serialStr = String(docSerial);
        const serialNum = Number(docSerial);
        matchedJsonItem = jsonItemBySerial[serialStr] || jsonItemBySerial[serialNum];
        if (matchedJsonItem) {
          matchMethod = 'serial';
        }
      }
      
      // If no match by serial, try exact name match
      if (!matchedJsonItem && docName) {
        const docNameNormalized = docName.toLowerCase().trim();
        matchedJsonItem = jsonItemByName[docNameNormalized];
        if (matchedJsonItem) {
          matchMethod = 'exact-name';
        }
      }
      
      // If still no match, try fuzzy name matching
      if (!matchedJsonItem && docName) {
        const docNameFuzzy = docName.toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s]/g, '')
          .trim();
        
        // Try exact fuzzy match
        matchedJsonItem = jsonItemByNameNormalized[docNameFuzzy];
        if (matchedJsonItem) {
          matchMethod = 'fuzzy-name';
        } else {
          // Try partial matching
          for (const [normalizedName, jsonItem] of Object.entries(jsonItemByNameNormalized)) {
            if (docNameFuzzy.includes(normalizedName) || normalizedName.includes(docNameFuzzy)) {
              const shorter = docNameFuzzy.length < normalizedName.length ? docNameFuzzy : normalizedName;
              const longer = docNameFuzzy.length >= normalizedName.length ? docNameFuzzy : normalizedName;
              if (longer.includes(shorter) && shorter.length >= 10) {
                matchedJsonItem = jsonItem;
                matchMethod = 'partial-name';
                break;
              }
            }
          }
        }
      }
      
      // Log matching results
      if (matchedJsonItem) {
        console.log(`✅ Matched Zoho document "${docName}" (serial: ${docSerial}) to category "${matchedJsonItem.category}" item index ${matchedJsonItem.itemIndex} via ${matchMethod}`);
        
        // Add to category
        if (!documentsByCategory[matchedJsonItem.category]) {
          documentsByCategory[matchedJsonItem.category] = [];
        }
        documentsByCategory[matchedJsonItem.category].push({
          doc,
          itemIndex: matchedJsonItem.itemIndex
        });
        matchedDocumentIds.add(doc.id);
      } else {
        console.log(`❌ No JSON match for Zoho document "${docName}" (serial: ${docSerial})`);
      }
    });

    // Sort documents within each category by their matched item index (JSON order)
    Object.keys(documentsByCategory).forEach(categoryName => {
      documentsByCategory[categoryName].sort((a, b) => a.itemIndex - b.itemIndex);
    });

    // Build organized categories structure
    const organizedCategories = categories.map(category => {
      const categoryName = category.name || 'Unnamed Category';
      const categoryDocuments = documentsByCategory[categoryName] || [];
      
      return {
        name: categoryName,
        documents: categoryDocuments.map(item => item.doc) // Extract just the doc, sorted by itemIndex
      };
    }).filter(category => category.documents.length > 0); // Only show categories that have documents

    // Find uncategorized documents (not matched to any JSON item)
    const uncategorized = matterDocuments.filter(doc => !matchedDocumentIds.has(doc.id));
    
    console.log(`📊 Organization complete: ${organizedCategories.length} categories, ${uncategorized.length} uncategorized documents`);

    return {
      categories: organizedCategories,
      uncategorized
    };
  }, [documentsJson, matterDocuments]);
  
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
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="font-semibold text-gray-900 text-2xl mb-2">Upload Documents</h1>
              <p className="text-sm text-gray-700">
                Upload supporting documents for your visa application. Accepted formats: PDF, JPG, PNG, DOC, TXT (max 5MB).
              </p>
            </div>

            {loadingMatterDocs ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
                <div className="text-gray-500">Loading documents...</div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Render Categories */}
                {organizedDocuments.categories.map((category) => {
                  const isExpanded = expandedCategories[category.name] ?? true;
                  
                  return (
                    <Collapsible
                      key={category.name}
                      open={isExpanded}
                      onOpenChange={(open) => setExpandedCategories(prev => ({ ...prev, [category.name]: open }))}
                    >
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        {/* Category Header */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-3 flex-1">
                            <CollapsibleTrigger asChild>
                              <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                                <ChevronDown className={cn(
                                  "w-5 h-5 text-gray-500 transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              </button>
                            </CollapsibleTrigger>
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          </div>
                          <button className="p-1 hover:bg-gray-200 rounded transition-colors text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Category Content */}
                        <CollapsibleContent>
                          <div className="p-4">
                            <div className="space-y-3 lg:hidden">
                              {category.documents.map((doc) => renderMobileDocumentCard(doc, 'Not Submitted Yet'))}
                            </div>
                            <div className="hidden overflow-x-auto lg:block">
                              <table className="w-full table-fixed">
                                <colgroup>
                                  <col className="w-[40%]" />
                                  <col className="w-[15%]" />
                                  <col className="w-[30%]" />
                                  <col className="w-[15%]" />
                                </colgroup>
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Document Name</th>
                                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Status</th>
                                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Comments</th>
                                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-900">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {category.documents.map((doc, index) => {
                                    // ALL data comes from Zoho document - never from JSON
                                    // Use "Name" key as primary source, then fallback to other Zoho fields
                                    const documentName = getMatterDocumentName(doc);
                                    const status = doc.Document_Status || 'Not Submitted Yet';
                                    const comment = getMatterDocumentComment(doc);
                                    
                                    return (
                                      <tr key={doc.id || index} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 truncate" title={documentName}>
                                              {documentName}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-3 px-4">
                                          {getStatusBadge(status)}
                                        </td>
                                        <td className="py-3 px-4">
                                          {comment ? (
                                            <span className="text-sm text-gray-700 truncate block" title={comment}>
                                              {comment}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-gray-400">—</span>
                                          )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                          {renderUploadButton(doc, status)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}

                {/* Uncategorized Documents */}
                {organizedDocuments.uncategorized.length > 0 && (
                  <Collapsible defaultOpen={true}>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                            <h3 className="font-semibold text-gray-900">Uncategorized</h3>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="p-4">
                          <div className="space-y-3 lg:hidden">
                            {organizedDocuments.uncategorized.map((doc) => renderMobileDocumentCard(doc, 'Pending'))}
                          </div>
                          <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full table-fixed">
                              <colgroup>
                                <col className="w-[40%]" />
                                <col className="w-[15%]" />
                                <col className="w-[30%]" />
                                <col className="w-[15%]" />
                              </colgroup>
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Document Name</th>
                                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Status</th>
                                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-900">Comments</th>
                                  <th className="py-3 px-4 text-right text-sm font-medium text-gray-900">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {organizedDocuments.uncategorized.map((doc) => {
                                  const status = doc.Document_Status || 'Pending';
                                  // Use "Name" key as primary source, then fallback to other fields
                                  const documentName = getMatterDocumentName(doc);
                                  const comment = getMatterDocumentComment(doc);
                                  
                                  return (
                                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                          <span className="text-sm text-gray-700 truncate" title={documentName}>
                                            {documentName}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        {getStatusBadge(status)}
                                      </td>
                                      <td className="py-3 px-4">
                                        {comment ? (
                                          <span className="text-sm text-gray-700 truncate block" title={comment}>
                                            {comment}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        {renderUploadButton(doc, status)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {/* Show message if no documents at all */}
                {organizedDocuments.categories.length === 0 && organizedDocuments.uncategorized.length === 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
                    <div className="text-gray-500">No documents found</div>
                  </div>
                )}
              </div>
            )}
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
                disabled={!selectedFile || !!error || uploading}
                data-testid="button-confirm-upload"
                className="bg-[#4F726B] hover:bg-[#4F726B]"
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
