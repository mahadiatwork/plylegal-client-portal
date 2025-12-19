"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
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
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";

const RELATIONSHIP_TYPES = [
  "De Facto Relationship",
  "Engaged",
  "Married",
  "Other"
];

const RELATIONSHIP_CEASE_REASONS = [
  "Divorce",
  "Separation",
  "Death",
  "Other"
];

const previousRelationshipDialogSchema = z.object({
  family_name: z.string().min(1, "Family Name is required"),
  given_names: z.string().min(1, "Given Names is required"),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  current_country_of_residence: z.string().optional(),
  type_of_relationship: z.string().min(1, "Type of Relationship is required"),
  relationship_started_day: z.string().optional(),
  relationship_started_month: z.string().optional(),
  relationship_started_year: z.string().optional(),
  relationship_ceased_day: z.string().optional(),
  relationship_ceased_month: z.string().optional(),
  relationship_ceased_year: z.string().optional(),
  number_of_children: z.string().optional(),
  how_relationship_ceased: z.string().optional(),
}).superRefine((data, ctx) => {
  // If any part of Date Relationship Started is filled, all parts must be filled
  const hasStartedDay = data.relationship_started_day && data.relationship_started_day.trim() !== "";
  const hasStartedMonth = data.relationship_started_month && data.relationship_started_month.trim() !== "";
  const hasStartedYear = data.relationship_started_year && data.relationship_started_year.trim() !== "";
  
  if (hasStartedDay || hasStartedMonth || hasStartedYear) {
    if (!hasStartedDay || !hasStartedMonth || !hasStartedYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date parts must be completed or left empty",
        path: ["relationship_started_day"],
      });
    }
  }
  
  // If any part of Date Relationship Ceased is filled, all parts must be filled
  const hasCeasedDay = data.relationship_ceased_day && data.relationship_ceased_day.trim() !== "";
  const hasCeasedMonth = data.relationship_ceased_month && data.relationship_ceased_month.trim() !== "";
  const hasCeasedYear = data.relationship_ceased_year && data.relationship_ceased_year.trim() !== "";
  
  if (hasCeasedDay || hasCeasedMonth || hasCeasedYear) {
    if (!hasCeasedDay || !hasCeasedMonth || !hasCeasedYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date parts must be completed or left empty",
        path: ["relationship_ceased_day"],
      });
    } else if (hasStartedDay && hasStartedMonth && hasStartedYear) {
      // Validate that ceased date is not earlier than started date
      const startedDate = new Date(
        parseInt(data.relationship_started_year),
        parseInt(data.relationship_started_month) - 1,
        parseInt(data.relationship_started_day)
      );
      const ceasedDate = new Date(
        parseInt(data.relationship_ceased_year),
        parseInt(data.relationship_ceased_month) - 1,
        parseInt(data.relationship_ceased_day)
      );
      
      if (ceasedDate < startedDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date Relationship Ceased must not be earlier than Date Relationship Started",
          path: ["relationship_ceased_day"],
        });
      }
    }
  }
});

function PreviousRelationshipDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(previousRelationshipDialogSchema),
    defaultValues: editingRow || {
      family_name: "",
      given_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      current_country_of_residence: "",
      type_of_relationship: "",
      relationship_started_day: "",
      relationship_started_month: "",
      relationship_started_year: "",
      relationship_ceased_day: "",
      relationship_ceased_month: "",
      relationship_ceased_year: "",
      number_of_children: "",
      how_relationship_ceased: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          Enter details of previous relationship
        </p>
      </div>

      {/* Personal Details Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Personal Details</h3>

        <Field
          type="text"
          name="family_name"
          control={dialogForm.control}
          label="Family Name"
          required
          data-testid="input-family-name"
        />

        <Field
          type="text"
          name="given_names"
          control={dialogForm.control}
          label="Given Names"
          required
          data-testid="input-given-names"
        />

        <Field
          type="radio"
          name="gender"
          control={dialogForm.control}
          label="Gender"
          options={[
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]}
        />

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

        <Field
          type="select"
          name="current_country_of_residence"
          control={dialogForm.control}
          label="Current Country of Residence"
          options={COUNTRIES.map(country => ({ value: country, label: country }))}
          placeholder="Choose Country"
          data-testid="select-country"
        />
      </div>

      {/* Relationship Details Section */}
      <div className="space-y-4 pt-4 border-t">
        <Field
          type="select"
          name="type_of_relationship"
          control={dialogForm.control}
          label="Type of Relationship"
          required
          options={RELATIONSHIP_TYPES.map(type => ({ value: type, label: type }))}
          placeholder="Choose Type"
          data-testid="select-type-of-relationship"
        />

        <DateSelector
          label="Date Relationship Started"
          values={{
            day: dialogForm.watch("relationship_started_day") || "",
            month: dialogForm.watch("relationship_started_month") || "",
            year: dialogForm.watch("relationship_started_year") || "",
          }}
          onValueChange={(type, value) => {
            const fieldName = `relationship_started_${type}`;
            dialogForm.setValue(fieldName, value, { shouldValidate: true });
          }}
          testIdPrefix="select-relationship-started"
        />
        {dialogForm.formState.errors.relationship_started_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship_started_day.message}</p>
        )}

        <DateSelector
          label="Date Relationship Ceased (leave blank if ongoing)"
          values={{
            day: dialogForm.watch("relationship_ceased_day") || "",
            month: dialogForm.watch("relationship_ceased_month") || "",
            year: dialogForm.watch("relationship_ceased_year") || "",
          }}
          onValueChange={(type, value) => {
            const fieldName = `relationship_ceased_${type}`;
            dialogForm.setValue(fieldName, value, { shouldValidate: true });
          }}
          testIdPrefix="select-relationship-ceased"
        />
        {dialogForm.formState.errors.relationship_ceased_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship_ceased_day.message}</p>
        )}

        <Field
          type="number"
          name="number_of_children"
          control={dialogForm.control}
          label="Number of Children from this Relationship"
          data-testid="input-number-of-children"
        />

        <Field
          type="select"
          name="how_relationship_ceased"
          control={dialogForm.control}
          label="How did the Relationship Cease?"
          options={RELATIONSHIP_CEASE_REASONS.map(reason => ({ value: reason, label: reason }))}
          placeholder="Choose Reason"
          data-testid="select-how-ceased"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
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

const previousRelationshipsSchema = z.object({
  applicant_previous_relationships: z.enum(["Yes", "No"]).optional(),
  applicant_previous_relationships_list: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    gender: z.string().optional(),
    birth_day: z.string().optional(),
    birth_month: z.string().optional(),
    birth_year: z.string().optional(),
    current_country_of_residence: z.string().optional(),
    type_of_relationship: z.string(),
    relationship_started_day: z.string().optional(),
    relationship_started_month: z.string().optional(),
    relationship_started_year: z.string().optional(),
    relationship_ceased_day: z.string().optional(),
    relationship_ceased_month: z.string().optional(),
    relationship_ceased_year: z.string().optional(),
    number_of_children: z.string().optional(),
    how_relationship_ceased: z.string().optional(),
  })).optional(),
  spouse_previous_relationships: z.enum(["Yes", "No"]).optional(),
  spouse_previous_relationships_list: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    gender: z.string().optional(),
    birth_day: z.string().optional(),
    birth_month: z.string().optional(),
    birth_year: z.string().optional(),
    current_country_of_residence: z.string().optional(),
    type_of_relationship: z.string(),
    relationship_started_day: z.string().optional(),
    relationship_started_month: z.string().optional(),
    relationship_started_year: z.string().optional(),
    relationship_ceased_day: z.string().optional(),
    relationship_ceased_month: z.string().optional(),
    relationship_ceased_year: z.string().optional(),
    number_of_children: z.string().optional(),
    how_relationship_ceased: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If applicant has previous relationships, require at least one entry
  if (data.applicant_previous_relationships === "Yes" && (!data.applicant_previous_relationships_list || data.applicant_previous_relationships_list.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one previous relationship entry is required",
      path: ["applicant_previous_relationships_list"],
    });
  }
  
  // If spouse has previous relationships, require at least one entry
  if (data.spouse_previous_relationships === "Yes" && (!data.spouse_previous_relationships_list || data.spouse_previous_relationships_list.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one previous relationship entry is required",
      path: ["spouse_previous_relationships_list"],
    });
  }
});

export default function PreviousRelationshipsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
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

  // Load section data from relationships.previousRelationships
  const sectionData = draftStore.getSectionData('relationships.previousRelationships');

  const form = useForm({
    resolver: zodResolver(previousRelationshipsSchema),
    mode: "onChange",
    defaultValues: {
      applicant_previous_relationships: sectionData?.applicant_previous_relationships || "No",
      applicant_previous_relationships_list: sectionData?.applicant_previous_relationships_list || [],
      spouse_previous_relationships: sectionData?.spouse_previous_relationships || "No",
      spouse_previous_relationships_list: sectionData?.spouse_previous_relationships_list || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values for conditional rendering
  const applicantPreviousRelationships = form.watch("applicant_previous_relationships");
  const applicantRelationshipsList = form.watch("applicant_previous_relationships_list") || [];
  const spousePreviousRelationships = form.watch("spouse_previous_relationships");
  const spouseRelationshipsList = form.watch("spouse_previous_relationships_list") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        applicant_previous_relationships: sectionData.applicant_previous_relationships || "No",
        applicant_previous_relationships_list: sectionData.applicant_previous_relationships_list || [],
        spouse_previous_relationships: sectionData.spouse_previous_relationships || "No",
        spouse_previous_relationships_list: sectionData.spouse_previous_relationships_list || [],
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset, isDirty]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) {
      console.warn('No application ID set for auto-save');
      return;
    }
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    if (draftSnap.isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentFormValues = getValues();
      draftStore.saveSectionData('relationships.previousRelationships', currentFormValues);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading, getValues]);

  const onSubmit = async (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);
    try {
      const result = await draftStore.saveSectionData('relationships.previousRelationships', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/previous-relationships', null, 'relationships.previousRelationships');
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
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

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
      const isValid = await form.trigger();
      
      if (!isValid) {
        console.log("Validation Errors:", form.formState.errors);
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const currentData = getValues();
      const result = await draftStore.saveSectionData('relationships.previousRelationships', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/previous-relationships', null, 'relationships.previousRelationships');
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

  const updateApplicantRelationships = (newRelationships) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("applicant_previous_relationships_list", newRelationships, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const currentData = getValues();
    draftStore.saveSectionData('relationships.previousRelationships', { 
      ...currentData,
      applicant_previous_relationships_list: newRelationships 
    });
  };

  const updateSpouseRelationships = (newRelationships) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("spouse_previous_relationships_list", newRelationships, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const currentData = getValues();
    draftStore.saveSectionData('relationships.previousRelationships', { 
      ...currentData,
      spouse_previous_relationships_list: newRelationships 
    });
  };

  const applicantColumns = [
    {
      key: "name", label: "Name", format: (row) => {
        return `${row.given_names || ""} ${row.family_name || ""}`.trim();
      }
    },
    {
      key: "date_of_birth", label: "Date of Birth", format: (row) => {
        if (row.birth_day && row.birth_month && row.birth_year) {
          const monthIdx = parseInt(row.birth_month) - 1;
          return `${monthNames[monthIdx]} ${row.birth_day}, ${row.birth_year}`;
        }
        return "";
      }
    },
    { key: "type_of_relationship", label: "Type of Relationship" },
    {
      key: "date_ceased", label: "Date Ceased", format: (row) => {
        if (row.relationship_ceased_day && row.relationship_ceased_month && row.relationship_ceased_year) {
          const monthIdx = parseInt(row.relationship_ceased_month) - 1;
          return `${monthNames[monthIdx]} ${row.relationship_ceased_day}, ${row.relationship_ceased_year}`;
        }
        return "Ongoing";
      }
    },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Previous Relationships</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In the Relationships section you are to provide details about the previous relationships of the main applicant and their spouse/partner.
          </p>
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
            {/* Applicant's Previous Relationships */}
            <div>
              <Field
                type="radio"
                name="applicant_previous_relationships"
                control={form.control}
                label="Have you previously been in a De Facto, Engaged or Married relationship, other than with your current Spouse/Partner?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {applicantPreviousRelationships === "Yes" && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all Previous Relationships
                  </p>
                  <RepeaterTable
                    data={applicantRelationshipsList}
                    columns={applicantColumns}
                    onAdd={(row) => updateApplicantRelationships([...applicantRelationshipsList, row])}
                    onEdit={(index, row) => {
                      const updated = [...applicantRelationshipsList];
                      updated[index] = row;
                      updateApplicantRelationships(updated);
                    }}
                    onDelete={(index) => {
                      const updated = applicantRelationshipsList.filter((_, i) => i !== index);
                      updateApplicantRelationships(updated);
                    }}
                    DialogComponent={PreviousRelationshipDialog}
                    addButtonText="Add"
                    testIdPrefix="applicant-previous-relationships"
                    dialogTitle="Previous Relationship"
                  />
                  {form.formState.errors.applicant_previous_relationships_list && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.applicant_previous_relationships_list.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Spouse/Partner's Previous Relationships */}
            <div>
              <Field
                type="radio"
                name="spouse_previous_relationships"
                control={form.control}
                label="Has your Spouse/Partner previously been in a De Facto, Engaged or Married relationship, other than with you?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {spousePreviousRelationships === "Yes" && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all Previous Relationships
                  </p>
                  <RepeaterTable
                    data={spouseRelationshipsList}
                    columns={applicantColumns}
                    onAdd={(row) => updateSpouseRelationships([...spouseRelationshipsList, row])}
                    onEdit={(index, row) => {
                      const updated = [...spouseRelationshipsList];
                      updated[index] = row;
                      updateSpouseRelationships(updated);
                    }}
                    onDelete={(index) => {
                      const updated = spouseRelationshipsList.filter((_, i) => i !== index);
                      updateSpouseRelationships(updated);
                    }}
                    DialogComponent={PreviousRelationshipDialog}
                    addButtonText="Add"
                    testIdPrefix="spouse-previous-relationships"
                    dialogTitle="Previous Relationship"
                  />
                  {form.formState.errors.spouse_previous_relationships_list && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.spouse_previous_relationships_list.message}</p>
                  )}
                </div>
              )}
            </div>

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

