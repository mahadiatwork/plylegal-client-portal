"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/firebase";
import { Download, ExternalLink, FileWarning, Loader2, Plus, RotateCw, Save, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function statusClass(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("complete") || text.includes("closed") || text.includes("resolved")) return "bg-green-100 text-green-800 border-green-200";
  if (text.includes("progress") || text.includes("review")) return "bg-blue-100 text-blue-800 border-blue-200";
  if (text.includes("reject") || text.includes("decline")) return "bg-red-100 text-red-800 border-red-200";
  return "bg-yellow-100 text-yellow-800 border-yellow-200";
}

const CORRECTION_MADE_STATUS = "correction made - notify client";

function isCompletedCorrection(correction) {
  return [correction.status, correction.detailStatus].some((status) => (
    String(status || "").trim().toLowerCase() === CORRECTION_MADE_STATUS
  ));
}

function correctionStatusLabel(correction) {
  return isCompletedCorrection(correction)
    ? "Correction Completed"
    : correction.status || correction.detailStatus || "No Status";
}

function correctionStatusClass(correction) {
  return isCompletedCorrection(correction)
    ? "bg-green-100 text-green-800 border-green-200"
    : statusClass(correction.status || correction.detailStatus);
}

function sortCorrectionsNewestFirst(corrections) {
  return corrections
    .map((correction, index) => ({
      correction,
      index,
      timestamp: Date.parse(correction.createdTime || correction.modifiedTime || ""),
    }))
    .sort((left, right) => {
      const leftHasTimestamp = Number.isFinite(left.timestamp);
      const rightHasTimestamp = Number.isFinite(right.timestamp);
      if (leftHasTimestamp && rightHasTimestamp && left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp;
      }
      if (leftHasTimestamp !== rightHasTimestamp) {
        return rightHasTimestamp ? 1 : -1;
      }
      return left.index - right.index;
    })
    .map(({ correction }) => correction);
}

export default function CorrectionsPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCorrections, setIsLoadingCorrections] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingCorrectionIds, setSavingCorrectionIds] = useState({});
  const [existingCorrections, setExistingCorrections] = useState([]);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [documentSelection, setDocumentSelection] = useState(null);
  const [documentPreview, setDocumentPreview] = useState({
    status: "idle",
    matterId: "",
    resourceId: "",
    documents: [],
    fileName: "",
    previewUrl: "",
    downloadUrl: "",
    error: "",
  });
  const [corrections, setCorrections] = useState([
    { id: '1', fieldName: '', pageNumber: '', questionNumber: '', details: '' }
  ]);
  const { toast } = useToast();
  const nextIdRef = useRef(2);
  const applicationsSnap = useSnapshot(applicationsStore);
  const authSnap = useSnapshot(authStore);
  
  const appId = params.id;
  const slug = params.slug;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const sortedExistingCorrections = sortCorrectionsNewestFirst(existingCorrections);
  const requestedCorrections = sortedExistingCorrections.filter((correction) => !isCompletedCorrection(correction));
  const completedCorrections = sortedExistingCorrections.filter(isCompletedCorrection);
  const documentPreviewBootstrapUrl = `/api/matters/${encodeURIComponent(appId || "")}/document-preview`;
  const requestedResourceId = documentSelection?.matterId === appId ? documentSelection.resourceId : "";
  const selectedResourceId = requestedResourceId || documentPreview.resourceId;
  const selectedDocument = documentPreview.documents.find((document) => document.id === selectedResourceId);
  const documentViewerUrl = documentPreview.previewUrl
    ? `${documentPreview.previewUrl}#page=1&zoom=100&navpanes=0`
    : "";

  useEffect(() => {
    if (!application || !appId) {
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    setDocumentPreview((current) => ({
      status: "loading", matterId: appId, resourceId: requestedResourceId,
      documents: current.matterId === appId ? current.documents : [],
      fileName: "", previewUrl: "", downloadUrl: "", error: "",
    }));

    async function preparePreview() {
      try {
        await auth.authStateReady?.();
        const idToken = await auth.currentUser?.getIdToken(previewAttempt > 0);
        if (!idToken) throw new Error("Please sign in again to view this document.");
        const response = await fetch(documentPreviewBootstrapUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(requestedResourceId ? { resourceId: requestedResourceId } : {}),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || "Preview unavailable");
        if (active) {
          setDocumentPreview({
            status: "ready",
            matterId: appId,
            resourceId: result.resourceId || "",
            documents: result.documents || [],
            fileName: result.fileName || "Document preview",
            previewUrl: result.previewUrl || "",
            downloadUrl: result.downloadUrl || "",
            error: "",
          });
        }
      } catch (error) {
        if (active) {
          setDocumentPreview((current) => ({
            ...current,
            status: "failed", fileName: "", previewUrl: "", downloadUrl: "",
            error: error.message || "Unable to load the document. Please try again.",
          }));
        }
      }
    }

    preparePreview();

    return () => {
      active = false;
      controller.abort();
    };
  }, [appId, application?.id, documentPreviewBootstrapUrl, previewAttempt, requestedResourceId]);

  const fetchCorrections = useCallback(async () => {
    if (!application?.zohoId) {
      setExistingCorrections([]);
      return;
    }

    setIsLoadingCorrections(true);
    try {
      const response = await fetch(`/api/corrections?dealId=${application.zohoId}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load corrections");
      }
      setExistingCorrections(result.corrections || []);
    } catch (error) {
      console.error("Error loading corrections:", error);
      toast({
        title: "Could not load corrections",
        description: error.message || "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCorrections(false);
    }
  }, [application?.zohoId, toast]);

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
    fetchCorrections();
  }, [fetchCorrections]);
  
  const addCorrection = () => {
    const newId = nextIdRef.current.toString();
    nextIdRef.current += 1;
    setCorrections([...corrections, {
      id: newId,
      fieldName: '',
      pageNumber: '',
      questionNumber: '',
      details: '',
    }]);
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
      c.id === id ? {
        ...c,
        [field]: value,
        documentName: c.documentName || selectedDocument?.fileName || "",
      } : c
    ));
  };

  const updateExistingCorrection = (id, value) => {
    setExistingCorrections(existingCorrections.map(c =>
      c.id === id ? { ...c, issueDescription: value } : c
    ));
  };
  
  const saveExistingCorrection = async (correction) => {
    if (!correction.issueDescription?.trim()) {
      toast({
        title: "Description required",
        description: "Please enter the correction details before saving.",
        variant: "destructive",
      });
      return;
    }

    setSavingCorrectionIds((ids) => ({ ...ids, [correction.id]: true }));
    try {
      const response = await fetch("/api/corrections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctionId: correction.correctionId || correction.id,
          detailId: correction.detailId,
          issueDescription: correction.issueDescription,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to save correction");
      }
      toast({ title: "Correction updated", description: "The description has been saved." });
    } catch (error) {
      console.error("Error saving correction:", error);
      toast({
        title: "Save failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCorrectionIds((ids) => ({ ...ids, [correction.id]: false }));
    }
  };
  
  const handleSubmit = async () => {
    if (!application?.zohoId) {
      toast({
        title: "Missing Matter",
        description: "This application is not linked to a Zoho Matter.",
        variant: "destructive",
      });
      return;
    }

    const validCorrections = corrections.filter(c => c.fieldName.trim() && c.details.trim());
    
    if (validCorrections.length === 0) {
      toast({
        title: "No corrections to submit",
        description: "Please fill in at least one correction with both field name and details.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: application.zohoId,
          subclass: slug,
          corrections: validCorrections.map((correction) => ({
            ...correction,
            details: correction.documentName
              ? `Document: ${correction.documentName}\n\n${correction.details}`
              : correction.details,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit corrections");
      }

      toast({
        title: "Corrections submitted",
        description: `${validCorrections.length} correction(s) have been submitted successfully.`,
      });

      nextIdRef.current = 2;
      setCorrections([{
        id: '1',
        fieldName: '',
        pageNumber: '',
        questionNumber: '',
        details: '',
      }]);
      await fetchCorrections();
    } catch (error) {
      console.error("Error submitting corrections:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="mx-auto max-w-[100rem]">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(26rem,1fr)]">
              <Card className="border-gray-200">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Document Preview</CardTitle>
                    {documentPreview.fileName ? (
                      <p className="mt-1 text-sm text-gray-500">{documentPreview.fileName}</p>
                    ) : null}
                  </div>
                  {documentPreview.downloadUrl ? (
                    <a
                      href={documentPreview.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#4F726B] underline"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {documentPreview.documents.length > 1 ? (
                    <div className="mb-4 space-y-2">
                      <Label htmlFor="review-document">Document to review</Label>
                      <select
                        id="review-document"
                        value={selectedResourceId}
                        onChange={(event) => setDocumentSelection({ matterId: appId, resourceId: event.target.value })}
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                        data-testid="select-review-document"
                      >
                        {documentPreview.documents.map((document) => (
                          <option key={document.id} value={document.id}>{document.fileName}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="h-[72vh] min-h-[42rem] max-h-[58rem] overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {documentPreview.status === "ready" ? (
                      <iframe
                        src={documentViewerUrl}
                        className="h-full w-full"
                        title="Document preview"
                        onError={() => setDocumentPreview((current) => ({ ...current, status: "failed" }))}
                        data-testid="iframe-document-preview"
                      />
                    ) : documentPreview.status === "loading" ? (
                      <div className="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading document preview...
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-gray-600" role="alert">
                        <FileWarning className="h-8 w-8 text-gray-400" />
                        <p>{documentPreview.error || "We could not preview this PDF. Please try again or open the document below."}</p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <Button type="button" variant="outline" onClick={() => setPreviewAttempt((attempt) => attempt + 1)}>
                            <RotateCw className="mr-2 h-4 w-4" />
                            Retry preview
                          </Button>
                          {documentPreview.previewUrl ? (
                            <a href={documentViewerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-[#4F726B] underline">
                              <ExternalLink className="h-4 w-4" />
                              Open
                            </a>
                          ) : null}
                          {documentPreview.downloadUrl ? (
                            <a href={documentPreview.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-[#4F726B] underline">
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg">Document Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <section aria-labelledby="new-corrections-heading" className="space-y-4">
                    <h3 id="new-corrections-heading" className="text-sm font-semibold text-gray-900">
                      New Corrections
                    </h3>

                    {corrections.map((correction, index) => (
                      <div key={correction.id} className="space-y-4 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
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

                        {correction.documentName ? (
                          <p className="text-xs text-gray-500">Document: {correction.documentName}</p>
                        ) : null}

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

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`pageNumber-${correction.id}`} className="text-sm text-gray-700">
                              Page No <span className="text-gray-400">(optional)</span>
                            </Label>
                            <Input
                              id={`pageNumber-${correction.id}`}
                              type="text"
                              placeholder="e.g., 4"
                              value={correction.pageNumber}
                              onChange={(e) => updateCorrection(correction.id, 'pageNumber', e.target.value)}
                              data-testid={`input-page-number-${correction.id}`}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`questionNumber-${correction.id}`} className="text-sm text-gray-700">
                              Question No <span className="text-gray-400">(optional)</span>
                            </Label>
                            <Input
                              id={`questionNumber-${correction.id}`}
                              type="text"
                              placeholder="e.g., 12A"
                              value={correction.questionNumber}
                              onChange={(e) => updateCorrection(correction.id, 'questionNumber', e.target.value)}
                              data-testid={`input-question-number-${correction.id}`}
                            />
                          </div>
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

                    <div className="flex gap-3 pt-2">
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
                        disabled={isSubmitting}
                        className="flex-1 bg-[#4F726B] hover:bg-[#4F726B]"
                        data-testid="button-submit-corrections"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </section>

                  <section aria-labelledby="requested-corrections-heading" className="space-y-4 border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="requested-corrections-heading" className="text-sm font-semibold text-gray-900">
                        Requested Corrections
                      </h3>
                      {isLoadingCorrections && (
                        <span className="flex items-center gap-2 text-xs text-gray-500">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading
                        </span>
                      )}
                    </div>

                    {!isLoadingCorrections && requestedCorrections.length === 0 && (
                      <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                        No requested corrections.
                      </div>
                    )}

                    {requestedCorrections.map((correction) => (
                      <div key={correction.id} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{correction.fieldName || correction.name || "Correction"}</p>
                            {correction.name && correction.name !== correction.fieldName && (
                              <p className="text-xs text-gray-500">{correction.name}</p>
                            )}
                            {(correction.pageNumber || correction.questionNumber) && (
                              <p className="mt-1 text-xs text-gray-500">
                                {[
                                  correction.pageNumber ? `Page ${correction.pageNumber}` : null,
                                  correction.questionNumber ? `Question ${correction.questionNumber}` : null,
                                ].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className={correctionStatusClass(correction)}>
                            {correctionStatusLabel(correction)}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`existing-details-${correction.id}`} className="text-sm text-gray-700">
                            Details
                          </Label>
                          <Textarea
                            id={`existing-details-${correction.id}`}
                            value={correction.issueDescription}
                            onChange={(e) => updateExistingCorrection(correction.id, e.target.value)}
                            rows={3}
                            data-testid={`input-existing-correction-details-${correction.id}`}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => saveExistingCorrection(correction)}
                            disabled={savingCorrectionIds[correction.id]}
                            data-testid={`button-save-existing-correction-${correction.id}`}
                          >
                            {savingCorrectionIds[correction.id] ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    ))}
                  </section>

                  <section aria-labelledby="completed-corrections-heading" className="space-y-4 border-t border-gray-200 pt-6">
                    <h3 id="completed-corrections-heading" className="text-sm font-semibold text-gray-900">
                      Completed Corrections
                    </h3>

                    {!isLoadingCorrections && completedCorrections.length === 0 && (
                      <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                        No completed corrections yet.
                      </div>
                    )}

                    {completedCorrections.map((correction) => (
                      <div key={correction.id} className="space-y-3 rounded-md border border-green-200 bg-green-50/40 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{correction.fieldName || correction.name || "Correction"}</p>
                            {correction.name && correction.name !== correction.fieldName && (
                              <p className="text-xs text-gray-500">{correction.name}</p>
                            )}
                            {(correction.pageNumber || correction.questionNumber) && (
                              <p className="mt-1 text-xs text-gray-500">
                                {[
                                  correction.pageNumber ? `Page ${correction.pageNumber}` : null,
                                  correction.questionNumber ? `Question ${correction.questionNumber}` : null,
                                ].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className={correctionStatusClass(correction)}>
                            {correctionStatusLabel(correction)}
                          </Badge>
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                          {correction.issueDescription || "No details provided."}
                        </p>
                      </div>
                    ))}
                  </section>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
