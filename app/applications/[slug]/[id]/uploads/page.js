"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { appDataStore, updateUpload } from "@/stores/appDataStore";
import { authStore } from "@/stores/authStore";
import { AppHeader } from "@/components/AppHeader";
import { MatterWorkspaceHeader } from "@/components/MatterWorkspaceHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Upload as UploadIcon,
  FileText,
  BriefcaseBusiness,
  ChevronDown,
  Folder,
} from "lucide-react";
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

function getDocumentStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized.includes("approved") || normalized.includes("verified")) {
    return {
      label: status || "Approved",
      dotClass: "bg-[#17824D]",
      className: "bg-[#E1F3E8] text-[#28734F]",
    };
  }

  if (normalized.includes("awaiting") || normalized.includes("review")) {
    return {
      label: status,
      dotClass: "bg-[#D88A00]",
      className: "bg-[#FFF0D6] text-[#A76709]",
    };
  }

  if (normalized.includes("reject") || normalized.includes("decline")) {
    return {
      label: status,
      dotClass: "bg-[#C53B3B]",
      className: "bg-[#FDE4E4] text-[#A52F2F]",
    };
  }

  return {
    label: status || "Not Submitted Yet",
    dotClass: "bg-[#7137D9]",
    className: "bg-[#EEE8FF] text-[#6638B8]",
  };
}

function getCategoryIcon(categoryName) {
  const name = String(categoryName || "").toLowerCase();

  if (name.includes("identity")) return FileText;
  if (name.includes("employment")) return BriefcaseBusiness;
  return Folder;
}

function getCategoryTone(categoryName) {
  const name = String(categoryName || "").toLowerCase();

  if (name.includes("identity")) return "bg-[#EAF3E8] text-[#244D42]";
  if (name.includes("employment")) return "bg-[#FBEAE5] text-[#8B4D45]";
  return "bg-[#EEF1E7] text-[#244D42]";
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
    const { label, dotClass, className } = getDocumentStatus(status);

    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium sm:text-sm", className)}>
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
        {label}
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
    return true;
  };

  const renderUploadButton = (doc, status) => {
    return (
      <button
        type="button"
        onClick={() => handleOpenDialog(doc)}
        aria-label={`Upload ${getMatterDocumentName(doc)}`}
        className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-md border border-[#9DBBB2] bg-white px-3.5 py-2 text-sm font-semibold text-[#173F46] shadow-xs transition hover:border-[#244D42] hover:bg-[#F5FAF7]"
      >
        <UploadIcon className="h-4 w-4 text-[#244D42]" />
        <span>Upload</span>
      </button>
    );
  };

  const renderMobileDocumentCard = (doc, statusFallback = 'Not Submitted Yet') => {
    const status = doc.Document_Status || statusFallback;
    const documentName = getMatterDocumentName(doc);
    const comment = getMatterDocumentComment(doc);

    return (
      <div key={doc.id || documentName} className="rounded-lg border border-[#E5E5DE] bg-white p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#173F46]" />
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
        documents: categoryDocuments.map(item => item.doc), // Extract just the doc, sorted by itemIndex
      };
    });

    // Find uncategorized documents (not matched to any JSON item)
    const uncategorized = matterDocuments.filter(doc => !matchedDocumentIds.has(doc.id));
    
    console.log(`📊 Organization complete: ${organizedCategories.length} categories, ${uncategorized.length} uncategorized documents`);

    return {
      categories: organizedCategories,
      uncategorized
    };
  }, [documentsJson, matterDocuments]);

  const renderDocumentTable = (documents) => {
    if (documents.length === 0) {
      return (
        <div className="border-t border-[#E8E7E0] px-5 py-5 text-sm text-slate-500">
          No documents are required in this section yet.
        </div>
      );
    }

    return (
      <>
        <div className="space-y-3 px-3 py-3 lg:hidden">
          {documents.map((doc) => renderMobileDocumentCard(doc, "Not Submitted Yet"))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[720px] table-fixed">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[18%]" />
              <col className="w-[32%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="border-b border-[#E8E7E0] bg-[#FCFBF7]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#173F46]">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#173F46]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#173F46]">Comments</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#173F46]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEBE5]">
              {documents.map((doc, index) => {
                const documentName = getMatterDocumentName(doc);
                const status = doc.Document_Status || "Not Submitted Yet";
                const comment = getMatterDocumentComment(doc);

                return (
                  <tr key={doc.id || index} className="transition-colors hover:bg-[#FCFCF9]">
                    <td className="px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-[18px] w-[18px] shrink-0 text-[#173F46]" />
                        <span className="truncate text-sm font-medium text-[#173F46]" title={documentName}>
                          {documentName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(status)}</td>
                    <td className="px-4 py-3.5">
                      {comment ? (
                        <span className="block truncate text-sm text-slate-600" title={comment}>
                          {comment}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">{renderUploadButton(doc, status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderCategoryCard = (category, categoryKey = category.name) => {
    const isExpanded = expandedCategories[categoryKey] ?? category.documents.length > 0;
    const CategoryIcon = getCategoryIcon(category.name);

    return (
      <Collapsible
        key={categoryKey}
        open={isExpanded}
        onOpenChange={(open) => setExpandedCategories((previous) => ({ ...previous, [categoryKey]: open }))}
      >
        <div className="overflow-hidden rounded-xl border border-[#E5E3DA] bg-white">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 bg-[#F8F5EC] px-4 py-3.5 text-left transition-colors hover:bg-[#F3F0E7] sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", getCategoryTone(category.name))}>
                  <CategoryIcon className="h-5 w-5" />
                </span>
                <h3 className="truncate font-serif text-base font-semibold text-[#173F46] sm:text-lg">
                  {category.name}
                </h3>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-[#173F46] transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {renderDocumentTable(category.documents)}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };
  
  if (isLoading || !application) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F6F8FC]">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
            <div className="text-sm font-medium text-slate-600">Loading documents...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7FB]">
      <AppHeader />
      <MatterWorkspaceHeader
        application={application}
        appId={appId}
        slug={slug}
      />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-[1608px]">
          <div className="rounded-2xl border border-[#E1E4E0] bg-white p-5 shadow-[0_8px_30px_rgba(25,55,65,0.04)] sm:p-8">
            <div className="mb-7">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#173F46] sm:text-[30px]">
                Upload your documents
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#617684] sm:text-base">
                Please upload the documents listed below. We will review them and let you know if anything else is required.
              </p>
              <p className="mt-1 text-sm text-[#617684]">
                Accepted formats: PDF, JPG, PNG, DOC, TXT (max 5MB per file).
              </p>
            </div>

            {loadingMatterDocs ? (
              <div className="rounded-xl border border-[#E5E3DA] bg-[#FCFBF7] p-8 text-center">
                <div className="text-sm font-medium text-slate-500">Loading documents...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {organizedDocuments.categories.map((category) => renderCategoryCard(category))}

                {organizedDocuments.uncategorized.length > 0 && renderCategoryCard({
                  name: "Other documents (if applicable)",
                  documents: organizedDocuments.uncategorized,
                }, "__uncategorized")}

                {organizedDocuments.categories.length === 0 && organizedDocuments.uncategorized.length === 0 && (
                  <div className="rounded-xl border border-[#E5E3DA] bg-[#FCFBF7] p-8 text-center text-sm text-slate-500">
                    No documents found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

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
                className="bg-[#244D42] hover:bg-[#1C3E35] text-white"
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
