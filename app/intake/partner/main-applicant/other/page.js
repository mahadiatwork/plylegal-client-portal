"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const formSchema = z.object({
  // Question 1: Other Names
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
    use_in_application: z.string().optional(),
  })).optional(),

  // Question 2: Chinese Commercial Code
  use_chinese_code: z.enum(["yes", "no"]),
  chinese_code: z.string().optional(),

  // Question 3: Russian Descent
  russian_descent: z.enum(["yes", "no"]),
  patronymic_family_name: z.string().optional(),
  patronymic_given_names: z.string().optional(),

  // Question 4: Previous Date of Birth
  has_prev_dob: z.enum(["yes", "no"]),
  prev_dobs: z.array(z.object({
    date_of_birth: z.string(),
    date_of_birth_day: z.string().optional(),
    date_of_birth_month: z.string().optional(),
    date_of_birth_year: z.string().optional(),
  })).optional(),
}).refine((data) => {
  if (data.use_chinese_code === "yes") {
    return data.chinese_code && data.chinese_code.trim().length > 0;
  }
  return true;
}, { message: "Chinese Commercial Code is required when 'Yes' is selected", path: ["chinese_code"] })
  .refine((data) => {
    if (data.russian_descent === "yes") {
      return data.patronymic_family_name && data.patronymic_family_name.trim().length > 0 &&
        data.patronymic_given_names && data.patronymic_given_names.trim().length > 0;
    }
    return true;
  }, { message: "Patronymic name fields are required when 'Yes' is selected", path: ["patronymic_family_name"] });

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
  use_in_application: z.string().optional(),
});

const prevDobDialogSchema = z.object({
  date_of_birth_day: z.string().optional(),
  date_of_birth_month: z.string().optional(),
  date_of_birth_year: z.string().optional(),
  date_of_birth: z.string().optional(),
}).refine((data) => {
  // Either all three fields are provided OR date_of_birth is provided
  if (data.date_of_birth) return true;
  return !!(data.date_of_birth_day && data.date_of_birth_month && data.date_of_birth_year);
}, {
  message: "Please provide a complete date of birth",
  path: ["date_of_birth"]
});

// Other Name Dialog Component
function OtherNameDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const initialHasEvidence = row?.has_evidence !== undefined ? row.has_evidence : "no";
  const initialUseInApplication = row?.use_in_application === "yes";
  const [hasEvidence, setHasEvidence] = useState(initialHasEvidence);
  const [useInApplication, setUseInApplication] = useState(initialUseInApplication);

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
      use_in_application: "no",
    },
  });

  useEffect(() => {
    if (row?.has_evidence !== undefined) {
      setHasEvidence(row.has_evidence);
      dialogForm.setValue("has_evidence", row.has_evidence);
    }
    if (row?.use_in_application !== undefined) {
      setUseInApplication(row.use_in_application === "yes");
      dialogForm.setValue("use_in_application", row.use_in_application);
    }
  }, [row]);

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dialogForm.handleSubmit(handleFormSubmit)(e);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-4">
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
          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
            {REASON_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.reason_for_change && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.reason_for_change.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="use_in_application"
          checked={useInApplication}
          onCheckedChange={(checked) => {
            setUseInApplication(checked);
            dialogForm.setValue("use_in_application", checked ? "yes" : "no");
          }}
        />
        <Label htmlFor="use_in_application" className="text-sm font-normal cursor-pointer">
          Use this name in the application
        </Label>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-3">Other Name Evidence</h3>

        <div className="mb-4">
          <Label className="text-sm font-normal mb-2 block">
            Do you have identity documents for this name?
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
                <SelectContent position="popper">
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
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
          type="button"
          onClick={handleSaveClick}
          className="bg-[#285646] hover:bg-[#1e4336] text-white"
          data-testid="button-ok"
        >
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

// Previous Date of Birth Dialog Component
function PreviousDOBDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;

  // Parse existing date_of_birth if it's in ISO format
  const parseExistingDate = (dateStr) => {
    if (!dateStr) return { day: "", month: "", year: "" };
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { day: "", month: "", year: "" };
      return {
        day: String(date.getDate()),
        month: String(date.getMonth() + 1),
        year: String(date.getFullYear()),
      };
    } catch {
      return { day: "", month: "", year: "" };
    }
  };

  const existingDate = row?.date_of_birth ? parseExistingDate(row.date_of_birth) : { day: "", month: "", year: "" };

  const dialogForm = useForm({
    resolver: zodResolver(prevDobDialogSchema),
    defaultValues: row ? {
      date_of_birth_day: existingDate.day,
      date_of_birth_month: existingDate.month,
      date_of_birth_year: existingDate.year,
      date_of_birth: row.date_of_birth || "",
    } : {
      date_of_birth_day: "",
      date_of_birth_month: "",
      date_of_birth_year: "",
      date_of_birth: "",
    },
  });

  const handleFormSubmit = (data) => {
    // Construct date_of_birth from day/month/year if provided
    let dateOfBirth = data.date_of_birth;
    if (!dateOfBirth && data.date_of_birth_day && data.date_of_birth_month && data.date_of_birth_year) {
      const month = data.date_of_birth_month.padStart(2, '0');
      const day = data.date_of_birth_day.padStart(2, '0');
      dateOfBirth = `${data.date_of_birth_year}-${month}-${day}`;
    }
    onSave({ date_of_birth: dateOfBirth });
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dialogForm.handleSubmit(handleFormSubmit)(e);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-4">
      <div>
        <Label>Date of Birth <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <Select
              value={dialogForm.watch("date_of_birth_day") || ""}
              onValueChange={(value) => {
                dialogForm.setValue("date_of_birth_day", value);
                dialogForm.setValue("date_of_birth", ""); // Clear the combined date when parts change
              }}
            >
              <SelectTrigger data-testid="select-dob-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={dialogForm.watch("date_of_birth_month") || ""}
              onValueChange={(value) => {
                dialogForm.setValue("date_of_birth_month", value);
                dialogForm.setValue("date_of_birth", ""); // Clear the combined date when parts change
              }}
            >
              <SelectTrigger data-testid="select-dob-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {months.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={dialogForm.watch("date_of_birth_year") || ""}
              onValueChange={(value) => {
                dialogForm.setValue("date_of_birth_year", value);
                dialogForm.setValue("date_of_birth", ""); // Clear the combined date when parts change
              }}
            >
              <SelectTrigger data-testid="select-dob-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {dialogForm.formState.errors.date_of_birth && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_of_birth.message}</p>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-dob"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSaveClick}
          className="bg-[#285646] hover:bg-[#1e4336] text-white"
          data-testid="button-save-dob"
        >
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);

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
      // FIX: Add all missing fields here with their default/initial values
      use_chinese_code: "no",
      chinese_code: "",
      russian_descent: "no",
      patronymic_family_name: "",
      patronymic_given_names: "",
      has_prev_dob: "no",
      prev_dobs: [],
    },
  });

  // Watch form values
  const hasOtherNames = form.watch("has_other_names");
  const otherNames = form.watch("other_names") || [];
  const useChineseCode = form.watch("use_chinese_code");
  const russianDescent = form.watch("russian_descent");
  const hasPrevDob = form.watch("has_prev_dob");
  const prevDobs = form.watch("prev_dobs") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.otherNames');

  // Populate Form
  useEffect(() => {
    const savedData = sectionData;

    // FIX: Only reset if we actually have data, preventing overwrites with empty objects
    if (savedData && Object.keys(savedData).length > 0) {

      // FIX: Helper to safely convert incoming DB data to Strings for Select components
      const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);

      const formData = {
        // FIX: Ensure all fields are explicitly loaded and default to something safe
        has_other_names: safeStr(savedData.has_other_names) || "no",
        other_names: savedData.other_names || [],

        use_chinese_code: safeStr(savedData.use_chinese_code) || "no",
        chinese_code: safeStr(savedData.chinese_code) || "",
        russian_descent: safeStr(savedData.russian_descent) || "no",
        patronymic_family_name: safeStr(savedData.patronymic_family_name) || "",
        patronymic_given_names: safeStr(savedData.patronymic_given_names) || "",
        has_prev_dob: safeStr(savedData.has_prev_dob) || "no",
        prev_dobs: savedData.prev_dobs || [],
      };

      // Use reset to properly update all form fields
      form.reset(formData);
    }
  }, [draftSnap.isLoading, JSON.stringify(sectionData), form]);

  const onSubmit = async (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Merge with existing section data to preserve other fields
      const existingData = draftStore.getSectionData('mainApplicant.otherNames') || {};
      const mergedData = { ...existingData, ...data };

      const result = await draftStore.saveSectionData("mainApplicant.otherNames", mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/other');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        startNavigation(next);
        if (next) router.push(next);
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
        setIsSaving(false);
      }
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
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
          title: "Validation error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Merge with existing section data to preserve other fields
      const existingData = draftStore.getSectionData('mainApplicant.otherNames') || {};
      const values = form.getValues();
      const mergedData = { ...existingData, ...values };

      const result = await draftStore.saveSectionData("mainApplicant.otherNames", mergedData);
      if (result.success) {
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
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save form data when it changes (with debounce)
  useEffect(() => {
    if (!draftSnap.currentApplicationId) return;
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    // Don't auto-save immediately after form reset or while loading
    if (draftSnap.isLoading) return;

    const timeoutId = setTimeout(() => {
      // Merge with existing section data
      const existingData = draftStore.getSectionData('mainApplicant.otherNames') || {};
      const mergedData = { ...existingData, ...watchedValues };
      draftStore.saveSectionData("mainApplicant.otherNames", mergedData);
    }, 1000); // Debounce: save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading]);

  // FIX: Update the synchronization logic for other_names
  const updateOtherNames = (newNames) => {
    form.setValue("other_names", newNames, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    // FIX: Merge with existing section data
    const existingData = draftStore.getSectionData('mainApplicant.otherNames') || {};
    const currentValues = form.getValues();
    draftStore.saveSectionData("mainApplicant.otherNames", {
      ...existingData,
      ...currentValues,
      other_names: newNames // Pass the new array explicitly
    });
  };

  // FIX: Update the synchronization logic for prev_dobs
  const updatePrevDobs = (newDobs) => {
    form.setValue("prev_dobs", newDobs, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    // FIX: Merge with existing section data
    const existingData = draftStore.getSectionData('mainApplicant.otherNames') || {};
    const currentValues = form.getValues();
    draftStore.saveSectionData("mainApplicant.otherNames", {
      ...existingData,
      ...currentValues,
      prev_dobs: newDobs // Pass the new array explicitly
    });
  };

  const otherNameColumns = [
    { key: "family_name", label: "Family Name" },
    { key: "given_names", label: "Given Names" },
    { key: "reason_for_change", label: "Reason for Change" },
  ];

  const prevDobColumns = [
    {
      key: "date_of_birth",
      label: "Date of Birth",
      format: (row) => {
        // Try to format from day/month/year if available
        if (row.date_of_birth_day && row.date_of_birth_month && row.date_of_birth_year) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIdx = parseInt(row.date_of_birth_month) - 1;
          if (monthIdx >= 0 && monthIdx < 12) {
            return `${row.date_of_birth_day} ${monthNames[monthIdx]} ${row.date_of_birth_year}`;
          }
        }
        // Fallback to date_of_birth string if available
        if (row.date_of_birth) {
          try {
            const date = new Date(row.date_of_birth);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
            }
          } catch {
            // Fall through
          }
        }
        return "";
      }
    },
  ];

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Main Applicant's Other Details</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          In this section, provide additional details about the main applicant.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-8">
            <h2 className="text-lg font-medium text-gray-900">Other Personal Details</h2>

            {/* Question 1: Other Names */}
            <div className="space-y-4">
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
                    Enter details of the other names you have been known by, including names before marriage
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
                    dialogTitle="Add other name"
                    testIdPrefix="other-name"
                  />
                </div>
              )}
            </div>

            {/* Question 2: Chinese Commercial Code */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-normal text-gray-900">
                  Do you use a Chinese Commercial Code for your name?
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
                {form.formState.errors.use_chinese_code?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.use_chinese_code.message}</p>
                )}
              </div>

              {useChineseCode === "yes" && (
                <div className="pl-0 mt-4">
                  <div>
                    <Label htmlFor="chinese_code">Chinese Commercial Code <span className="text-red-500">*</span></Label>
                    <Input
                      id="chinese_code"
                      {...form.register("chinese_code")}
                      placeholder="Enter Chinese Commercial Code"
                      data-testid="input-chinese-code"
                      className="mt-2"
                    />
                    {form.formState.errors.chinese_code?.message && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.chinese_code.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Question 3: Russian Descent */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-normal text-gray-900">
                  Are you of Russian descent?
                </Label>
                <RadioGroup
                  value={form.watch("russian_descent")}
                  onValueChange={(value) => form.setValue("russian_descent", value)}
                  className="flex gap-4 mt-2"
                  data-testid="radio-russian-descent"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="russian-descent-yes" data-testid="radio-russian-descent-yes" />
                    <Label htmlFor="russian-descent-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="russian-descent-no" data-testid="radio-russian-descent-no" />
                    <Label htmlFor="russian-descent-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.russian_descent?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.russian_descent.message}</p>
                )}
              </div>

              {russianDescent === "yes" && (
                <div className="pl-0 mt-4 space-y-4">
                  <p className="text-sm text-gray-600">
                    In English, write your Patronymic Name
                  </p>
                  <div>
                    <Label htmlFor="patronymic_family_name">Family Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="patronymic_family_name"
                      {...form.register("patronymic_family_name")}
                      placeholder="Enter Family Name"
                      data-testid="input-patronymic-family-name"
                      className="mt-2"
                    />
                    {form.formState.errors.patronymic_family_name?.message && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.patronymic_family_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="patronymic_given_names">Given Names <span className="text-red-500">*</span></Label>
                    <Input
                      id="patronymic_given_names"
                      {...form.register("patronymic_given_names")}
                      placeholder="Enter Given Names"
                      data-testid="input-patronymic-given-names"
                      className="mt-2"
                    />
                    {form.formState.errors.patronymic_given_names?.message && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.patronymic_given_names.message}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Question 4: Previous Date of Birth */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-normal text-gray-900">
                  Have you ever had a different Date of Birth?
                </Label>
                <RadioGroup
                  value={form.watch("has_prev_dob")}
                  onValueChange={(value) => form.setValue("has_prev_dob", value)}
                  className="flex gap-4 mt-2"
                  data-testid="radio-has-prev-dob"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="prev-dob-yes" data-testid="radio-prev-dob-yes" />
                    <Label htmlFor="prev-dob-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="prev-dob-no" data-testid="radio-prev-dob-no" />
                    <Label htmlFor="prev-dob-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.has_prev_dob?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.has_prev_dob.message}</p>
                )}
              </div>

              {hasPrevDob === "yes" && (
                <div className="pl-0 mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of your previous Birth Dates.
                  </p>
                  <RepeaterTable
                    data={prevDobs}
                    columns={prevDobColumns}
                    onAdd={(row) => updatePrevDobs([...prevDobs, row])}
                    onEdit={(index, row) => {
                      const updated = [...prevDobs];
                      updated[index] = row;
                      updatePrevDobs(updated);
                    }}
                    onDelete={(index) => {
                      const updated = prevDobs.filter((_, i) => i !== index);
                      updatePrevDobs(updated);
                    }}
                    DialogComponent={PreviousDOBDialog}
                    addButtonText="Add"
                    emptyMessage="No previous dates of birth added"
                    dialogTitle="Previous Date of Birth"
                    testIdPrefix="prev-dob"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Desktop Navigation */}
          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            nextLabel="Continue"
            loading={draftSnap.isSaving}
          />
        </form>
      </CardContent>

      {/* Mobile Navigation */}

    </Card>
  );
}
