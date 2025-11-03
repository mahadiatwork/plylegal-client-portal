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
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";

const formSchema = z.object({
  has_other_names: z.enum(["yes", "no"]),
  other_names: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    reason_for_change: z.string(),
    has_evidence: z.string().optional(),
    evidence_type: z.string().optional(),
    document_issue_day: z.string().optional(),
    document_issue_month: z.string().optional(),
    document_issue_year: z.string().optional(),
    document_reference_number: z.string().optional(),
    issuing_country: z.string().optional(),
    issuing_state: z.string().optional(),
    place_of_issue: z.string().optional(),
  })).optional(),
});

const REASON_OPTIONS = [
  "Adoption",
  "Alternative spelling",
  "Anglicisation of name",
  "Birth",
  "Cultural origins",
  "Divorce",
  "Gender change",
  "Maiden name",
  "Marriage",
  "Name in full",
  "Nickname",
  "Preferred name",
  "Prefix and/or suffix",
  "Religious name",
  "Reordering of name",
  "Split or joining name",
  "Transliteration",
  "Truncation",
  "Other"
];

const EVIDENCE_TYPE_OPTIONS = [
  "Adoption papers",
  "Deed Poll/Change of Name Certificate",
  "Divorce Certificate",
  "Marriage Certificate",
  "Other Document"
];

const dialogSchema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
  reason_for_change: z.string().min(1, "Reason for change is required"),
  has_evidence: z.string(),
  evidence_type: z.string().optional(),
  document_issue_day: z.string().optional(),
  document_issue_month: z.string().optional(),
  document_issue_year: z.string().optional(),
  document_reference_number: z.string().optional(),
  issuing_country: z.string().optional(),
  issuing_state: z.string().optional(),
  place_of_issue: z.string().optional(),
});

function OtherNameDialog({ row, onSubmit, onCancel }) {
  const initialHasEvidence = row?.has_evidence !== undefined ? row.has_evidence : "no";
  const [hasEvidence, setHasEvidence] = useState(initialHasEvidence);
  
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: row || {
      family_name: "",
      given_names: "",
      reason_for_change: "",
      has_evidence: "no",
      evidence_type: "",
      document_issue_day: "",
      document_issue_month: "",
      document_issue_year: "",
      document_reference_number: "",
      issuing_country: "",
      issuing_state: "",
      place_of_issue: "",
    },
  });

  useEffect(() => {
    if (row?.has_evidence !== undefined) {
      setHasEvidence(row.has_evidence);
      dialogForm.setValue("has_evidence", row.has_evidence);
    }
  }, [row]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }} 
      className="space-y-4"
    >
      <div>
        <Label htmlFor="family_name">Family Name</Label>
        <Input
          id="family_name"
          {...dialogForm.register("family_name")}
          data-testid="input-family-name"
        />
        {dialogForm.formState.errors.family_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.family_name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="given_names">Given Names</Label>
        <Input
          id="given_names"
          {...dialogForm.register("given_names")}
          data-testid="input-given-names"
        />
        {dialogForm.formState.errors.given_names && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.given_names.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="reason_for_change">Reason for Change</Label>
        <Select
          value={dialogForm.watch("reason_for_change")}
          onValueChange={(value) => dialogForm.setValue("reason_for_change", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-reason-for-change">
            <SelectValue placeholder="Choose Reason for Change" />
          </SelectTrigger>
          <SelectContent>
            {REASON_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.reason_for_change && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.reason_for_change.message}</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-3">Other Name Evidence</h3>
        
        <div className="mb-4">
          <Label className="text-sm font-normal mb-2 block">
            Do you have evidence of this Other Name?
          </Label>
          <RadioGroup
            value={hasEvidence}
            onValueChange={(value) => {
              setHasEvidence(value);
              dialogForm.setValue("has_evidence", value);
            }}
            className="flex gap-4"
            data-testid="radio-has-evidence"
          >
            <div className="flex items-center" data-testid="radio-evidence-yes">
              <RadioGroupItem value="yes" id="evidence-yes" />
              <Label htmlFor="evidence-yes" className="ml-2 cursor-pointer font-normal">
                Yes
              </Label>
            </div>
            <div className="flex items-center" data-testid="radio-evidence-no">
              <RadioGroupItem value="no" id="evidence-no" />
              <Label htmlFor="evidence-no" className="ml-2 cursor-pointer font-normal">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {hasEvidence === "yes" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="evidence_type">Evidence Type</Label>
              <Select
                value={dialogForm.watch("evidence_type")}
                onValueChange={(value) => dialogForm.setValue("evidence_type", value)}
              >
                <SelectTrigger data-testid="select-evidence-type">
                  <SelectValue placeholder="Choose Evidence Type" />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Date of Document Issue</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={dialogForm.watch("document_issue_day")}
                  onValueChange={(value) => dialogForm.setValue("document_issue_day", value)}
                >
                  <SelectTrigger data-testid="select-document-day">
                    <SelectValue placeholder="Choose Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={dialogForm.watch("document_issue_month")}
                  onValueChange={(value) => dialogForm.setValue("document_issue_month", value)}
                >
                  <SelectTrigger data-testid="select-document-month">
                    <SelectValue placeholder="Choose Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={dialogForm.watch("document_issue_year")}
                  onValueChange={(value) => dialogForm.setValue("document_issue_year", value)}
                >
                  <SelectTrigger data-testid="select-document-year">
                    <SelectValue placeholder="Choose Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="document_reference_number">Document Reference Number</Label>
              <Input
                id="document_reference_number"
                {...dialogForm.register("document_reference_number")}
                data-testid="input-document-reference"
              />
            </div>

            <div>
              <Label htmlFor="issuing_country">Issuing Country</Label>
              <Input
                id="issuing_country"
                placeholder="Choose country"
                {...dialogForm.register("issuing_country")}
                data-testid="input-issuing-country"
              />
            </div>

            <div>
              <Label htmlFor="issuing_state">Issuing State / Province</Label>
              <Input
                id="issuing_state"
                {...dialogForm.register("issuing_state")}
                data-testid="input-issuing-state"
              />
            </div>

            <div>
              <Label htmlFor="place_of_issue">Place of Issue / Issuing Authority</Label>
              <Input
                id="place_of_issue"
                {...dialogForm.register("place_of_issue")}
                data-testid="input-place-of-issue"
              />
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-[#285646] hover:bg-[#1e4336] text-white"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  // Set application ID from URL params if available
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
      has_other_names: "no",
      other_names: [],
    },
  });

  const hasOtherNames = form.watch("has_other_names");
  const otherNames = form.watch("other_names") || [];

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_other || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, []);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("protection_other", data);
    await draftStore.markPageComplete(`${visaType}/main-applicant/other`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("protection_other", values);
    if (result.success) {
      await draftStore.markPageComplete(`${visaType}/main-applicant/other`);
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  const updateOtherNames = (newNames) => {
    form.setValue("other_names", newNames, { shouldValidate: true });
    draftStore.saveSectionData("protection_other", { ...form.getValues(), other_names: newNames });
  };

  const otherNameColumns = [
    { key: "family_name", label: "Family Name" },
    { key: "given_names", label: "Given Names" },
    { key: "reason_for_change", label: "Reason for Change" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-8 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Main Applicant's Other Details</h1>
            <p className="text-sm text-gray-600 mt-2">
              In this section, provide additional details about the main applicant.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-8 space-y-8">
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Other Personal Details</h2>

              <div>
                <Label className="text-base font-normal text-gray-900">
                  Have you ever had or been known by any other Name or Alias, or had a different name spelling?
                </Label>
                <RadioGroup
                  value={form.watch("has_other_names")}
                  onValueChange={(value) => form.setValue("has_other_names", value)}
                  className="flex gap-4 mt-2"
                  data-testid="radio-has-other-names"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="yes" data-testid="radio-yes" />
                    <Label htmlFor="yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="no" data-testid="radio-no" />
                    <Label htmlFor="no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.has_other_names?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.has_other_names.message}</p>
                )}
              </div>

                {hasOtherNames === "yes" && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Enter details of the other names you have been known by, including names before marriage
                    </p>
                    <RepeaterTable
                      rows={otherNames}
                      columns={otherNameColumns}
                      onAdd={(row) => updateOtherNames([...otherNames, row])}
                      onEdit={(index, row) => {
                        const updated = [...otherNames];
                        updated[index] = row;
                        updateOtherNames(updated);
                      }}
                      onDelete={(index) => {
                        const updated = otherNames.filter((_, i) => i !== index);
                        updateOtherNames(updated);
                      }}
                      dialogForm={(row, onSubmit, onCancel) => (
                        <OtherNameDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                      )}
                      addButtonText="Add"
                      emptyMessage="No other names added"
                    />
                  </div>
                )}
              </div>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center justify-between pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  className="min-h-9"
                  data-testid="button-previous"
                >
                  ← Previous
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSave}
                    className="min-h-9"
                    data-testid="button-save"
                  >
                    Save
                  </Button>
                  <Button
                    type="submit"
                    className="min-h-9 bg-[#285646] hover:bg-[#1e4336] text-white"
                    data-testid="button-continue"
                  >
                    Continue →
                  </Button>
                </div>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Navigation */}
      <StickyNav
        onPrevious={handlePrevious}
        onNext={form.handleSubmit(onSubmit)}
        onSave={handleSave}
        nextLabel="Continue"
        previousTestId="button-previous-mobile"
        nextTestId="button-continue-mobile"
        saveTestId="button-save-mobile"
      />
    </div>
  );
}
