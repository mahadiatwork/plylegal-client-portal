"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// StickyNav import removed
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

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

const otherNameDialogSchema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
  reason_for_change: z.string().min(1, "Reason for change is required"),
  has_evidence: z.string().min(1, "Please select yes or no"),
  evidence_type: z.string().optional(),
  document_issue_day: z.string().optional(),
  document_issue_month: z.string().optional(),
  document_issue_year: z.string().optional(),
  document_reference_number: z.string().optional(),
  issuing_country: z.string().optional(),
  issuing_state: z.string().optional(),
  place_of_issue: z.string().optional(),
});

function OtherNameDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const [hasEvidence, setHasEvidence] = useState(row?.has_evidence || "no");

  const dialogForm = useForm({
    resolver: zodResolver(otherNameDialogSchema),
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
    onSave(data);
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
        <Label htmlFor="family_name">Family Name <span className="text-red-500">*</span></Label>
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
        <Label htmlFor="given_names">Given Names <span className="text-red-500">*</span></Label>
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
        <Label htmlFor="reason_for_change">Reason for Change <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("reason_for_change")}
          onValueChange={(value) => dialogForm.setValue("reason_for_change", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-reason-for-change">
            <SelectValue placeholder="Choose Reason for Change" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto z-[9999]">
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
            Do you have evidence of this Other Name? <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={hasEvidence}
            onValueChange={(value) => {
              setHasEvidence(value);
              dialogForm.setValue("has_evidence", value, { shouldValidate: true });
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
          {dialogForm.formState.errors.has_evidence && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.has_evidence.message}</p>
          )}
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
                <SelectContent position="popper" className="z-[9999]">
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
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto z-[9999]">
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
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto z-[9999]">
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
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto z-[9999]">
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
  use_chinese_code: z.enum(["yes", "no"]).optional(),
  chinese_code: z.string().optional(),
});

export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      use_chinese_code: "no",
      chinese_code: "",
    },
  });

  // Watch form values
  const hasOtherNames = form.watch("has_other_names");
  const otherNames = form.watch("other_names") || [];
  const useChineseCode = form.watch("use_chinese_code");

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_spouse_other || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        has_other_names: savedData.has_other_names || "no",
        other_names: savedData.other_names || [],
        use_chinese_code: savedData.use_chinese_code || "no",
        chinese_code: savedData.chinese_code || "",
      });
    }
  }, [draftSnap.draft?.protection_spouse_other]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_spouse_other", data);
      await draftStore.markPageComplete(`${visaType}/spouse-partner/other-details`);
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      startNavigation(next);
      if (next) router.push(next);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(prev);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
        return;
      }
      const formData = form.getValues();
      console.log("Saving protection_spouse_other data:", formData);
      const result = await draftStore.saveSectionData("protection_spouse_other", formData);

      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        console.error("Save failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOtherNames = (newNames) => {
    form.setValue("other_names", newNames, { shouldValidate: true });
    draftStore.saveSectionData("protection_spouse_other", { ...form.getValues(), other_names: newNames });
  };

  const otherNameColumns = [
    { key: "family_name", label: "Family Name" },
    { key: "given_names", label: "Given Names" },
    { key: "reason_for_change", label: "Reason for Change" },
  ];

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Other Personal Details</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          In this section, provide additional details about the main applicant's spouse/partner.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-8">

            {/* Question 1: Other Names */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-normal text-gray-900">
                  Has your Spouse/Partner ever had or been known by any other Name or Alias, or had a different name spelling?
                </Label>
                <RadioGroup
                  value={form.watch("has_other_names")}
                  onValueChange={(value) => form.setValue("has_other_names", value)}
                  className="flex gap-4 mt-2"
                  data-testid="radio-has-other-names"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="other-names-yes" data-testid="radio-other-names-yes" />
                    <Label htmlFor="other-names-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="other-names-no" data-testid="radio-other-names-no" />
                    <Label htmlFor="other-names-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.has_other_names?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.has_other_names.message}</p>
                )}
              </div>

              {hasOtherNames === "yes" && (
                <div className="pl-0 mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of the other names your Spouse/Partner has been known by, including names before marriage
                  </p>
                  <RepeaterTable
                    data={otherNames}
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
                    DialogComponent={OtherNameDialog}
                    addButtonText="Add"
                    emptyMessage="No other names added"
                    dialogTitle="Other Name"
                    testIdPrefix="other-name"
                  />
                </div>
              )}
            </div>

            {/* Question 2: Chinese Commercial Code */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-normal text-gray-900">
                  Does your Spouse/Partner use a Chinese Commercial Code for their name?
                </Label>
                <RadioGroup
                  value={form.watch("use_chinese_code")}
                  onValueChange={(value) => form.setValue("use_chinese_code", value)}
                  className="flex gap-4 mt-2"
                  data-testid="radio-use-chinese-code"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="chinese-code-yes" data-testid="radio-chinese-code-yes" />
                    <Label htmlFor="chinese-code-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="chinese-code-no" data-testid="radio-chinese-code-no" />
                    <Label htmlFor="chinese-code-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {useChineseCode === "yes" && (
                <div className="pl-0 mt-4">
                  <Label htmlFor="chinese_code">Chinese Commercial Code</Label>
                  <Input
                    id="chinese_code"
                    {...form.register("chinese_code")}
                    className="max-w-md mt-1"
                    data-testid="input-chinese-code"
                    placeholder="Enter your Chinese Commercial Code"
                  />
                </div>
              )}
            </div>

          </div>
          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            loading={isSaving}
            submitting={isSubmitting}
            disabledNext={!form.formState.isValid}
          />
        </form>
      </CardContent>
    </Card>
  );
}
