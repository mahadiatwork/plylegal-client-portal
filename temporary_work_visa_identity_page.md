Here is the breakdown of the problems and the fix.

🚨 The 3 Critical Issues Detected
The "Snapshot" Reference Crash (CRITICAL)

The Bug: In your code, you defined const draftSnap = useSnapshot(draftStore);. However, later in the code (inside a useEffect and a variable declaration), you try to use a variable named snapshot.

The Result: snapshot is undefined. This will cause the app to crash or simply fail to load any saved data, making it look like your data is gone.

The Fix: Change snapshot to draftSnap.

Duplicate Data Loading Logic (Race Condition)

The Bug: You have two useEffect hooks trying to do the exact same thing (load data into the form).

The Result: They fight each other. Since one of them uses the broken snapshot variable, it might overwrite valid data loaded by the first one with undefined, causing data loss on refresh.

The Syntax Error (The Red Screen)

The Bug: Error: Expected '</', got 'jsx text'.

The Cause: This is usually caused by a tiny typo in the FormNavigation component or the closing tags immediately following it. Often, it's a missing forward slash / in a self-closing tag (e.g., <FormNavigation ... > instead of <FormNavigation ... />) or a stray character typed by accident.

🛠️ The Fix: Complete Code
Here is the corrected IdentityPage component. I have removed the duplicate logic, fixed the variable names, added the safeStr helper (to prevent Select dropdowns from appearing empty), and fixed the syntax error.

TypeScript

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";

// ... [Keep your formSchema, Constants, and Dialog Components exactly as they were] ...
// (I am omitting the schema/dialog code here to save space, paste them back in from your original code)

// ... [PASTE formSchema HERE] ...
// ... [PASTE CITIZENSHIP_REASON_OPTIONS etc. HERE] ...
// ... [PASTE CitizenshipDialog HERE] ...
// ... [PASTE PassportDialog HERE] ...
// ... [PASTE IdentityDocumentDialog HERE] ...

export default function IdentityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore); // ✅ Correct variable name

  const visaType = getVisaTypeFromPath(pathname);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Load Application ID
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_current_citizen: "yes",
      stateless_explanation: "",
      has_been_citizen: "no",
      citizenships: [],
      has_passport: "no",
      passports: [],
      has_identity_document: "no",
      identity_documents: [],
    },
  });

  // 2. Load Saved Data (Fixed Logic)
  useEffect(() => {
    // ✅ FIX: Use draftSnap, not snapshot
    const savedData = draftSnap.draft?.temporary_work_identity;

    if (savedData && Object.keys(savedData).length > 0) {
      
      // ✅ FIX: Helper to prevent "Empty Select" bugs
      const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);

      const formData = {
        is_current_citizen: safeStr(savedData.is_current_citizen) || "yes",
        stateless_explanation: safeStr(savedData.stateless_explanation),
        has_been_citizen: safeStr(savedData.has_been_citizen) || "no",
        citizenships: savedData.citizenships || [],
        has_passport: safeStr(savedData.has_passport) || "no",
        passports: savedData.passports || [],
        has_identity_document: safeStr(savedData.has_identity_document) || "no",
        identity_documents: savedData.identity_documents || [],
      };
      
      form.reset(formData);
    }
  }, [draftSnap.draft?.temporary_work_identity, form]);

  // ✅ NOTE: I removed the duplicate useEffect that referenced 'snapshot'. 
  // You only need the one above.

  const isCurrentCitizen = form.watch("is_current_citizen");
  const hasBeenCitizen = form.watch("has_been_citizen");
  const hasPassport = form.watch("has_passport");
  const hasIdentityDocument = form.watch("has_identity_document");

  const citizenships = form.watch("citizenships") || [];
  const passports = form.watch("passports") || [];
  const identityDocuments = form.watch("identity_documents") || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = form.getValues();
      const result = await draftStore.saveSectionData("temporary_work_identity", data);

      if (result.success) {
        // Optional: You can remove markPageComplete here if you only want it on "Continue"
        // draftStore.markPageComplete("temporary-work/main-applicant/identity"); 
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const result = await draftStore.saveSectionData("temporary_work_identity", data);

      if (result.success) {
        // Mark complete on navigation
        await draftStore.markPageComplete(`${visaType}/main-applicant/identity`, null, "temporary_work_identity");
        
        const nextRoute = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        if (nextRoute) {
          router.push(nextRoute);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const previousRoute = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (previousRoute) {
      router.push(previousRoute);
    }
  };

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity</h1>
              <p className="text-gray-600">
                In this section, provide details about the main applicant's identity.
              </p>
            </div>

            <div className="space-y-8">
              {/* Question 1: Are you currently a Citizen? */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Are you currently a Citizen of any Country?
                </Label>
                <RadioGroup
                  value={isCurrentCitizen}
                  onValueChange={(value) => form.setValue("is_current_citizen", value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="current-citizen-yes" />
                    <Label htmlFor="current-citizen-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="current-citizen-no" />
                    <Label htmlFor="current-citizen-no" className="ml-2 cursor-pointer font-normal">No</Label>
                  </div>
                </RadioGroup>

                {isCurrentCitizen === "no" && (
                  <div className="mt-4">
                    <Label htmlFor="stateless_explanation" className="text-sm font-normal mb-2 block">
                      You have answered that you are not a Citizen of any country. You must provide details of how, when and why you are stateless
                    </Label>
                    <Textarea
                      id="stateless_explanation"
                      {...form.register("stateless_explanation")}
                      rows={4}
                    />
                    {form.formState.errors.stateless_explanation && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.stateless_explanation.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Question 2: Have you ever been a Citizen? */}
              {isCurrentCitizen === "no" && (
                <div>
                  <Label className="text-base font-medium mb-3 block">
                    Have you ever been a Citizen of any Country?
                  </Label>
                  <RadioGroup
                    value={hasBeenCitizen}
                    onValueChange={(value) => form.setValue("has_been_citizen", value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="yes" id="been-citizen-yes" />
                      <Label htmlFor="been-citizen-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="no" id="been-citizen-no" />
                      <Label htmlFor="been-citizen-no" className="ml-2 cursor-pointer font-normal">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Repeater: Citizenships */}
              {hasBeenCitizen === "yes" && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Citizenships</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all Citizenships that you hold or have previously held
                  </p>
                  <RepeaterTable
                    data={citizenships}
                    columns={[
                      { key: "country", label: "Country" },
                      { key: "how_obtained", label: "How obtained?" },
                      { key: "date_obtained_day", label: "Date Obtained", format: (row) => `${row.date_obtained_day || ''} ${row.date_obtained_month || ''} ${row.date_obtained_year || ''}` },
                    ]}
                    onAdd={(newRow) => {
                      const updated = [...citizenships, newRow];
                      form.setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true });
                    }}
                    onEdit={(index, updatedRow) => {
                      const updated = [...citizenships];
                      updated[index] = updatedRow;
                      form.setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true });
                    }}
                    onDelete={(index) => {
                      const updated = citizenships.filter((_, i) => i !== index);
                      form.setValue("citizenships", updated, { shouldValidate: true, shouldDirty: true });
                    }}
                    DialogComponent={CitizenshipDialog}
                    addButtonText="Add"
                    testIdPrefix="citizenship"
                  />
                  {form.formState.errors.citizenships && (
                    <p className="text-sm text-red-600 mt-2">{form.formState.errors.citizenships.message}</p>
                  )}
                </div>
              )}

              {/* Question 3: Passports */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Do you currently hold or have you ever held a Passport or Travel Document?
                </Label>
                <RadioGroup
                  value={hasPassport}
                  onValueChange={(value) => form.setValue("has_passport", value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="passport-yes" />
                    <Label htmlFor="passport-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="passport-no" />
                    <Label htmlFor="passport-no" className="ml-2 cursor-pointer font-normal">No</Label>
                  </div>
                </RadioGroup>

                {hasPassport === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Passports/Travel Documents</h3>
                    <RepeaterTable
                      data={passports}
                      columns={[
                        { key: "document_number", label: "Document Number" },
                        { key: "name", label: "Name" },
                        { key: "nationality", label: "Nationality" },
                        { key: "document_status", label: "Status" },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...passports, newRow];
                        form.setValue("passports", updated, { shouldValidate: true, shouldDirty: true });
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...passports];
                        updated[index] = updatedRow;
                        form.setValue("passports", updated, { shouldValidate: true, shouldDirty: true });
                      }}
                      onDelete={(index) => {
                        const updated = passports.filter((_, i) => i !== index);
                        form.setValue("passports", updated, { shouldValidate: true, shouldDirty: true });
                      }}
                      DialogComponent={PassportDialog}
                      addButtonText="Add"
                      testIdPrefix="passport"
                    />
                    {form.formState.errors.passports && (
                      <p className="text-sm text-red-600 mt-2">{form.formState.errors.passports.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Question 4: Identity Documents */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Do you hold a government issued Identity Document or Identity Number?
                </Label>
                <RadioGroup
                  value={hasIdentityDocument}
                  onValueChange={(value) => form.setValue("has_identity_document", value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="identity-doc-yes" />
                    <Label htmlFor="identity-doc-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="identity-doc-no" />
                    <Label htmlFor="identity-doc-no" className="ml-2 cursor-pointer font-normal">No</Label>
                  </div>
                </RadioGroup>

                {hasIdentityDocument === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Other Identity Documents</h3>
                    <RepeaterTable
                      data={identityDocuments}
                      columns={[
                        { key: "document_type", label: "Type" },
                        { key: "identification_number", label: "Number" },
                        { key: "name", label: "Name" },
                        { key: "country_of_issue", label: "Country" },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...identityDocuments, newRow];
                        form.setValue("identity_documents", updated, { shouldValidate: true, shouldDirty: true });
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...identityDocuments];
                        updated[index] = updatedRow;
                        form.setValue("identity_documents", updated, { shouldValidate: true, shouldDirty: true });
                      }}
                      onDelete={(index) => {
                        const updated = identityDocuments.filter((_, i) => i !== index);
                        form.setValue("identity_documents", updated, { shouldValidate: true, shouldDirty: true });
                      }}
                      DialogComponent={IdentityDocumentDialog}
                      addButtonText="Add"
                      testIdPrefix="identity-doc"
                    />
                    {form.formState.errors.identity_documents && (
                      <p className="text-sm text-red-600 mt-2">{form.formState.errors.identity_documents.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ✅ FIX: Cleaned up structure to prevent syntax errors */}
            <FormNavigation
              loading={isSaving}
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              saveLabel="Save Draft"
              nextLabel="Continue"
            />
          </div>
        </div>
      </form>
    </div>
  );
}