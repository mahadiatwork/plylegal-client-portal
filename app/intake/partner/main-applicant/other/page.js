"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { FormNavigation } from "@/components/FormNavigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { otherSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { z } from "zod";

// Constants
const REASON_OPTIONS = [
  "Marriage",
  "Divorce",
  "Deed Poll",
  "Alias",
  "Spelling Variation",
  "Adoption",
  "Religious Name",
  "Translation/Transliteration",
  "Other"
];

const EVIDENCE_TYPE_OPTIONS = [
  "Adoption papers",
  "Deed Poll/Change of Name Certificate",
  "Divorce Certificate",
  "Marriage Certificate",
  "Other Document"
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

// Other Name Dialog Schema
const otherNameDialogSchema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
  reason_for_change: z.string().min(1, "Reason for change is required"),
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
});

function OtherNameDialog({ row, onSubmit, onCancel }) {
  const initialHasEvidence = row?.has_evidence !== undefined ? row.has_evidence : "No";
  const initialUseInApplication = row?.use_in_application === "Yes";
  const [hasEvidence, setHasEvidence] = useState(initialHasEvidence);
  const [useInApplication, setUseInApplication] = useState(initialUseInApplication);

  const dialogForm = useForm({
    resolver: zodResolver(otherNameDialogSchema),
    defaultValues: row || {
      family_name: "",
      given_names: "",
      reason_for_change: "",
      has_evidence: "No",
      evidence_type: "",
      document_issue_day: "",
      document_issue_month: "",
      document_issue_year: "",
      document_reference_number: "",
      issuing_country: "",
      issuing_state: "",
      place_of_issue: "",
      use_in_application: "No",
    },
  });

  useEffect(() => {
    if (row?.has_evidence !== undefined) {
      setHasEvidence(row.has_evidence);
      dialogForm.setValue("has_evidence", row.has_evidence);
    }
    if (row?.use_in_application !== undefined) {
      setUseInApplication(row.use_in_application === "Yes");
      dialogForm.setValue("use_in_application", row.use_in_application);
    }
  }, [row, dialogForm]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

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

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="use_in_application"
          checked={useInApplication}
          onCheckedChange={(checked) => {
            setUseInApplication(checked);
            dialogForm.setValue("use_in_application", checked ? "Yes" : "No");
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
              <RadioGroupItem value="Yes" id="evidence-yes" />
              <Label htmlFor="evidence-yes" className="ml-2 cursor-pointer font-normal">
                Yes
              </Label>
            </div>
            <div className="flex items-center" data-testid="radio-evidence-no">
              <RadioGroupItem value="No" id="evidence-no" />
              <Label htmlFor="evidence-no" className="ml-2 cursor-pointer font-normal">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {hasEvidence === "Yes" && (
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
          className="bg-primary text-primary-foreground"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

function PrevDobDialog({ row, onSubmit, onCancel }) {
  // Parse row data - it could be a string date or an object with day/month/year
  const parseDate = (dateValue) => {
    if (!dateValue) return { day: "", month: "", year: "" };
    if (typeof dateValue === "object" && dateValue.day && dateValue.month && dateValue.year) {
      return dateValue;
    }
    if (typeof dateValue === "string" && dateValue) {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return {
          day: date.getDate().toString(),
          month: (date.getMonth() + 1).toString(),
          year: date.getFullYear().toString(),
        };
      }
    }
    return { day: "", month: "", year: "" };
  };

  const initialDate = parseDate(row);

  const dialogForm = useForm({
    defaultValues: initialDate,
  });

  const handleFormSubmit = (data) => {
    if (!data.day || !data.month || !data.year) {
      dialogForm.setError("day", { message: "Date of birth is required" });
      return;
    }
    // Format as ISO date string for storage
    const day = parseInt(data.day);
    const month = parseInt(data.month) - 1;
    const year = parseInt(data.year);
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) {
      dialogForm.setError("day", { message: "Invalid date" });
      return;
    }
    onSubmit({ day: data.day, month: data.month, year: data.year, date: date.toISOString().split('T')[0] });
  };

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
        <Label className="mb-2 block">Date of Birth</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("day")}
            onValueChange={(value) => dialogForm.setValue("day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-dob-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dialogForm.watch("month")}
            onValueChange={(value) => dialogForm.setValue("month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-dob-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dialogForm.watch("year")}
            onValueChange={(value) => dialogForm.setValue("year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-dob-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(dialogForm.formState.errors.day || dialogForm.formState.errors.month || dialogForm.formState.errors.year) && (
          <p className="text-sm text-red-600 mt-1">Date of birth is required</p>
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
          className="bg-primary text-primary-foreground"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

// Custom table component for other names
function OtherNamesTable({ rows, columns, onAdd, onEdit, onDelete, DialogComponent }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAdd = () => {
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSubmit = (data) => {
    if (editingIndex !== null) {
      onEdit(editingIndex, data);
    } else {
      onAdd(data);
    }
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingIndex(null);
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleAdd}
          className="bg-primary text-primary-foreground"
          data-testid="button-add-other-name"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          No other names added
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-3 px-4 text-sm font-medium"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-24 py-3 px-4 text-sm font-medium">Edit</th>
                <th className="w-24 py-3 px-4 text-sm font-medium">Remove</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-t border-border hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-sm">
                      {row[col.key] || ""}
                    </td>
                  ))}
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(index)}
                      className="text-primary hover:text-primary/80 transition-colors"
                      data-testid={`button-edit-${index}`}
                      aria-label={`Edit other name row ${index + 1}`}
                    >
                      Edit
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onDelete(index)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                      data-testid={`button-delete-${index}`}
                      aria-label={`Remove other name row ${index + 1}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Other Name</DialogTitle>
          </DialogHeader>
          {DialogComponent && (
            <DialogComponent
              row={editingIndex !== null ? rows[editingIndex] : null}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Custom table component for previous DOBs
function PrevDobTable({ rows, onAdd, onEdit, onDelete, DialogComponent }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  const handleAdd = () => {
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const handleSubmit = (data) => {
    if (editingIndex !== null) {
      onEdit(editingIndex, data);
    } else {
      onAdd(data);
    }
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    if (typeof dateValue === "object" && dateValue.date) {
      const date = new Date(dateValue.date);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    if (typeof dateValue === "object" && dateValue.day && dateValue.month && dateValue.year) {
      const day = parseInt(dateValue.day);
      const month = parseInt(dateValue.month) - 1;
      const year = parseInt(dateValue.year);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return dateValue.toString();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleAdd}
          className="bg-primary text-primary-foreground"
          data-testid="button-add-prev-dob"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          No previous dates of birth added
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium">Date of Birth</th>
                <th className="w-24 py-3 px-4 text-sm font-medium">Edit</th>
                <th className="w-24 py-3 px-4 text-sm font-medium">Remove</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="py-3 px-4 text-sm">
                    {formatDate(row)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(index)}
                      className="text-primary hover:text-primary/80 transition-colors"
                      data-testid={`button-edit-dob-${index}`}
                      aria-label={`Edit previous date of birth row ${index + 1}`}
                    >
                      Edit
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onDelete(index)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                      data-testid={`button-delete-dob-${index}`}
                      aria-label={`Remove previous date of birth row ${index + 1}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Previous Date of Birth</DialogTitle>
          </DialogHeader>
          {DialogComponent && (
            <DialogComponent
              row={editingIndex !== null ? rows[editingIndex] : null}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MainApplicantOtherPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.otherNames');

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(otherSchema),
    mode: "onChange",
    defaultValues: {
      has_other_names: sectionData.has_other_names || "",
      other_names: sectionData.other_names || [],
      use_chinese_code: sectionData.use_chinese_code || "",
      chinese_code: sectionData.chinese_code || "",
      russian_descent: sectionData.russian_descent || "",
      patronymic_name: sectionData.patronymic_name || { family_name: "", given_names: "" },
      has_prev_dob: sectionData.has_prev_dob || "",
      prev_dobs: sectionData.prev_dobs || [],
    },
  });

  // Watch form values for conditional rendering
  const hasOtherNames = watch("has_other_names");
  const useChineseCode = watch("use_chinese_code");
  const russianDescent = watch("russian_descent");
  const hasPrevDob = watch("has_prev_dob");
  const otherNames = watch("other_names") || [];
  const prevDobs = watch("prev_dobs") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('mainApplicant.otherNames', watchedValues);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId]);

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
      const result = await draftStore.saveSectionData('mainApplicant.otherNames', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/other');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
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
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
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
      const currentData = getValues();
      const result = await draftStore.saveSectionData('mainApplicant.otherNames', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/other');
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully.",
        });
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOtherNames = (newNames) => {
    setValue("other_names", newNames, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.otherNames', { ...currentData, other_names: newNames });
  };

  const updatePrevDobs = (newDobs) => {
    setValue("prev_dobs", newDobs, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.otherNames', { ...currentData, prev_dobs: newDobs });
  };

  const otherNameColumns = [
    { key: "family_name", label: "Family Name" },
    { key: "given_names", label: "Given Names" },
    { key: "reason_for_change", label: "Reason for Change" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Main Applicant's Other Details</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide additional details about the main applicant.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{field}: {error.message || "Required"}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-6">

              {/* Question 1: Other Names */}
              <div>
                <Field
                  type="radio"
                  name="has_other_names"
                  control={control}
                  label="Have you ever had or been known by any other Name or Alias, or had a different name spelling?"
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
                {hasOtherNames === "Yes" && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Enter details of the other names you have been known by, including names before marriage
                    </p>
                    <OtherNamesTable
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
                      DialogComponent={OtherNameDialog}
                    />
                  </div>
                )}
              </div>

              {/* Question 2: Chinese Commercial Code */}
              <div>
                <Field
                  type="radio"
                  name="use_chinese_code"
                  control={control}
                  label="Do you use a Chinese Commercial Code for your name?"
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
                {useChineseCode === "Yes" && (
                  <div className="mt-4">
                    <Field
                      type="text"
                      name="chinese_code"
                      control={control}
                      label="Chinese Commercial Code"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Question 3: Russian Descent */}
              <div>
                <Field
                  type="radio"
                  name="russian_descent"
                  control={control}
                  label="Are you of Russian descent?"
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
                {russianDescent === "Yes" && (
                  <div className="mt-4 space-y-4 p-6 bg-muted/50 rounded-xl">
                    <p className="text-sm text-gray-600 mb-2">
                      In English, write your Patronymic Name
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Field
                        type="text"
                        name="patronymic_name.family_name"
                        control={control}
                        label="Family Name"
                        required
                      />
                      <Field
                        type="text"
                        name="patronymic_name.given_names"
                        control={control}
                        label="Given Names"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Question 4: Previous Date of Birth */}
              <div>
                <Field
                  type="radio"
                  name="has_prev_dob"
                  control={control}
                  label="Have you ever had a different Date of Birth?"
                  options={[
                    { value: "Yes", label: "Yes" },
                    { value: "No", label: "No" },
                  ]}
                />
                {hasPrevDob === "Yes" && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Enter details of your previous Birth Dates
                    </p>
                    <PrevDobTable
                      rows={prevDobs}
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
                      DialogComponent={PrevDobDialog}
                    />
                  </div>
                )}
              </div>
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={handleSubmit(onSubmit)}
              disabledNext={!isValid}
              loading={isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </>
  );
}
