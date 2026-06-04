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
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { familyMainSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const CHILD_RELATIONSHIP_OPTIONS = [
  "Adopted Child",
  "Child",
  "Step-Child",
  "Grand-Child",
  "Step-Grandchild",
];

const RELATIONSHIP_OPTIONS = [
  "Adopted Child",
  "Adopted Parent",
  "Child",
  "Child-in-Law",
  "Cousin",
  "Grand-Child",
  "Grand-Parent",
  "Guardian",
  "Half-Sibling",
  "Niece or Nephew",
  "Parent",
  "Parent-in-Law",
  "Sibling",
  "Sister/Brother-in-Law",
  "Spouse/Partner",
  "Step-Child",
  "Step-Grandchild",
  "Step-Grandparent",
  "Step-Niece or Step-Nephew",
  "Step-Parent",
  "Step-Sibling",
  "Step-Uncle or Step-Aunt",
  "Uncle or Aunt",
  "Ward"
];


const familyMemberDialogSchema = z.object({
  family_name: z.string().min(1, "Family Name is required"),
  given_names: z.string().min(1, "Given Names is required"),
  gender: z.enum(["Male", "Female"]),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  relationship: z.string().min(1, "Relationship to Main Applicant is required"),
  date_relationship_started_day: z.string().optional(),
  date_relationship_started_month: z.string().optional(),
  date_relationship_started_year: z.string().optional(),
});

function FamilyMemberDialog({ editingRow, onSave, onCancel, hasChildren }) {
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details') || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : null;

  // Filter out child-related options if hasChildren is "No"
  const availableRelationshipOptions = hasChildren === "No"
    ? RELATIONSHIP_OPTIONS.filter(opt => !CHILD_RELATIONSHIP_OPTIONS.includes(opt))
    : RELATIONSHIP_OPTIONS;

  const dialogForm = useForm({
    resolver: zodResolver(familyMemberDialogSchema),
    defaultValues: editingRow || {
      family_name: "",
      given_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      relationship: "",
      date_relationship_started_day: "",
      date_relationship_started_month: "",
      date_relationship_started_year: "",
    },
  });

  const relationship = dialogForm.watch("relationship");

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dialogForm.handleSubmit(handleFormSubmit)(e);
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
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Enter details about all of the Main Applicant{mainApplicantName ? ` (${mainApplicantName})` : ""}'s:
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-4">
          <li>Spouse/Partner (if applicable); and</li>
          <li>Parents (including Step-Parents); and</li>
          <li>Siblings (including Step-Sisters/Step-Brothers); and</li>
          {hasChildren === "Yes" && (
            <li>Children (including children from a previous relationship, Step-Children and Adopted Children)</li>
          )}
          <li>Guardians (include any other person who has, or will have, custody or guardianship of this person)</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Please include details even if the family member is no longer alive.
        </p>
      </div>

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
        <Label>Gender <span className="text-red-500">*</span></Label>
        <RadioGroup
          value={dialogForm.watch("gender")}
          onValueChange={(value) => dialogForm.setValue("gender", value, { shouldValidate: true })}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Male" id="gender-male" />
            <Label htmlFor="gender-male" className="cursor-pointer">Male</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Female" id="gender-female" />
            <Label htmlFor="gender-female" className="cursor-pointer">Female</Label>
          </div>
        </RadioGroup>
        {dialogForm.formState.errors.gender && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.gender.message}</p>
        )}
      </div>

      <DateSelector
        label="Date of Birth"
        values={{
          day: dialogForm.watch("birth_day") || "",
          month: dialogForm.watch("birth_month") || "",
          year: dialogForm.watch("birth_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `birth_${type}`;
          dialogForm.setValue(fieldName, value);
        }}
        testIdPrefix="select-birth"
      />

      <div>
        <Label htmlFor="relationship">This person is the Main Applicant{mainApplicantName ? ` (${mainApplicantName})` : ""}'s: <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("relationship")}
          onValueChange={(value) => dialogForm.setValue("relationship", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-relationship">
            <SelectValue placeholder="Choose Relationship Type" />
          </SelectTrigger>
          <SelectContent>
            {availableRelationshipOptions.map((rel) => (
              <SelectItem key={rel} value={rel}>{rel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.relationship && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship.message}</p>
        )}
      </div>

      {relationship === "Spouse/Partner" && (
        <DateSelector
          label="Date relationship started"
          values={{
            day: dialogForm.watch("date_relationship_started_day") || "",
            month: dialogForm.watch("date_relationship_started_month") || "",
            year: dialogForm.watch("date_relationship_started_year") || "",
          }}
          onValueChange={(type, value) => {
            const fieldName = `date_relationship_started_${type}`;
            dialogForm.setValue(fieldName, value);
          }}
          testIdPrefix="select-relationship-started"
        />
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSaveClick}
          className="bg-[#4F726B] hover:bg-[#4F726B] text-white"
          data-testid="button-ok"
        >
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MainApplicantFamilyPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
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
  const sectionData = draftStore.getSectionData('mainApplicant.family');

  // Get main applicant name for display
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details') || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : null;

  const form = useForm({
    resolver: zodResolver(familyMainSchema),
    mode: "onChange",
    defaultValues: {
      has_children: sectionData?.has_children || "No",
      children: sectionData?.children || [],
    },
  });
  const { reset } = form;

  // Watch form values
  const hasChildren = form.watch("has_children");
  const children = form.watch("children") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    // Only reset if we have an ID and aren't loading
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0) {
      // Use 'keepDefaultValues: true' to prevent flickering
      reset({
        has_children: sectionData.has_children || "No",
        children: sectionData.children || [],
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) return;
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    // Don't auto-save immediately after form reset or while loading
    if (draftSnap.isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Use form.getValues() to get the actual current state of all fields
      const currentFormValues = form.getValues();
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      const mergedData = { ...existingData, ...currentFormValues };
      
      draftStore.saveSectionData('mainApplicant.family', mergedData);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading, form]);

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
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      const mergedData = { ...existingData, ...data };
      
      const result = await draftStore.saveSectionData('mainApplicant.family', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/family');
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
      // Trigger validation and check for errors
      const isValid = await form.trigger();
      
      if (!isValid) {
        // DEBUG: This will show you exactly what is stopping the save in the browser console
        console.log("Validation Errors:", form.formState.errors);
        
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Merge with existing section data to preserve other fields
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      const currentData = form.getValues();
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('mainApplicant.family', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/family');
        toast({
          title: "Draft saved",
          description: "Progress saved successfully.",
        });
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateChildren = (newChildren) => {
    form.setValue("children", newChildren, { shouldValidate: true });
    const existingData = draftStore.getSectionData('mainApplicant.family') || {};
    const currentData = form.getValues();
    const mergedData = { ...existingData, ...currentData, children: newChildren };
    draftStore.saveSectionData('mainApplicant.family', mergedData);
  };

  const childrenColumns = [
    {
      key: "name", label: "Name", format: (row) => {
        if (row.family_name || row.given_names) {
          return `${row.given_names || ""} ${row.family_name || ""}`.trim();
        }
        return row.name || "";
      }
    },
    {
      key: "dob", label: "Date of Birth", format: (row) => {
        if (row.birth_day && row.birth_month && row.birth_year) {
          const monthIdx = parseInt(row.birth_month) - 1;
          return `${monthNames[monthIdx]} ${row.birth_day}, ${row.birth_year}`;
        }
        return row.dob || "";
      }
    },
    { key: "relationship", label: "Relationship" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Family</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Question: Does the Main Applicant have any Children, Step Children, or Adopted Children? */}
            <div>
              <Field
                type="radio"
                name="has_children"
                control={form.control}
                label={`Does the Main Applicant${mainApplicantName ? ` (${mainApplicantName})` : " (name missing)"} have any Children, Step Children, or Adopted Children?`}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Instructions and Family Members Section - Shown for both Yes and No */}
            {(hasChildren === "Yes" || hasChildren === "No") && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Enter details about all of the Main Applicant{mainApplicantName ? ` (${mainApplicantName})` : " (name missing)"}'s:
                  </p>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-4">
                    <li>Spouse/Partner (if applicable); and</li>
                    <li>Parents (including Step-Parents); and</li>
                    <li>Siblings (including Step-Sisters/Step-Brothers); and</li>
                    {hasChildren === "Yes" && (
                      <li>Children (including children from a previous relationship, Step-Children and Adopted Children)</li>
                    )}
                    <li>Guardians (include any other person who has, or will have, custody or guardianship of this person)</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    Please include details even if the family member is no longer alive.
                  </p>
                </div>
                <RepeaterTable
                  data={children}
                  columns={childrenColumns}
                  onAdd={(row) => updateChildren([...children, row])}
                  onEdit={(index, row) => {
                    const updated = [...children];
                    updated[index] = row;
                    updateChildren(updated);
                  }}
                  onDelete={(index) => {
                    const updated = children.filter((_, i) => i !== index);
                    updateChildren(updated);
                  }}
                  DialogComponent={FamilyMemberDialog}
                  addButtonText="Add"
                  testIdPrefix="family"
                  dialogTitle="Add Family Member"
                  dialogClassName="max-w-4xl w-[90vw] max-h-[98vh] bg-white overflow-y-auto"
                  dialogProps={{ hasChildren }}
                />
              </div>
            )}

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={form.handleSubmit(onSubmit)}
              disabledNext={!form.formState.isValid}
              loading={isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </>
  );
}
