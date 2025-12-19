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
import { DateSelector } from "@/components/DateSelecters";
import { childrenSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const RELATIONSHIP_OPTIONS = [
  "Child",
  "Step Child",
  "Adopted Child"
];

const childDialogSchema = z.object({
  family_name: z.string().min(1, "Family Name is required"),
  given_names: z.string().min(1, "Given Names is required"),
  gender: z.string().min(1, "Gender is required"),
  birth_day: z.string().min(1, "Day is required"),
  birth_month: z.string().min(1, "Month is required"),
  birth_year: z.string().min(1, "Year is required"),
  relationship: z.string().min(1, "Relationship to Main Applicant is required"),
  relationship_to_spouse: z.string().min(1, "Relationship to Spouse/Partner is required"),
});

function ChildDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(childDialogSchema),
    defaultValues: editingRow || {
      family_name: "",
      given_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      relationship: "",
      relationship_to_spouse: "",
    },
  });

  // Get main applicant name
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details');
  const mainApplicantName = mainApplicantDetails?.given_names || "Main Applicant";
  
  // Get spouse/partner name
  const spousePartnerDetails = draftStore.getSectionData('spousePartner.details');
  const spouseName = spousePartnerDetails?.given_names 
    ? `${spousePartnerDetails.given_names}${spousePartnerDetails.family_name ? ` ${spousePartnerDetails.family_name}` : ''}`
    : spousePartnerDetails?.family_name || "Spouse/Partner";

  // Reset form when dialog opens/closes or editingRow changes
  useEffect(() => {
    if (editingRow) {
      dialogForm.reset(editingRow);
    } else {
      dialogForm.reset({
        family_name: "",
        given_names: "",
        gender: "",
        birth_day: "",
        birth_month: "",
        birth_year: "",
        relationship: "",
        relationship_to_spouse: "",
      });
    }
  }, [editingRow, dialogForm]);

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
      className="space-y-4"
    >
      <div>
        <Label className="mb-2 block font-semibold">Personal Details</Label>
        <div className="space-y-4 mt-4">
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
            required
            options={[
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
            ]}
          />

          <DateSelector
            label="Date of Birth"
            required
            values={{
              day: dialogForm.watch("birth_day") || "",
              month: dialogForm.watch("birth_month") || "",
              year: dialogForm.watch("birth_year") || "",
            }}
            onValueChange={(type, value) => {
              const fieldName = `birth_${type}`;
              dialogForm.setValue(fieldName, value, { shouldValidate: true });
            }}
            errors={{
              day: dialogForm.formState.errors.birth_day,
              month: dialogForm.formState.errors.birth_month,
              year: dialogForm.formState.errors.birth_year,
            }}
            testIdPrefix="select-birth"
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Relationship Details</Label>
        <div className="mt-4 space-y-4">
          <Field
            type="select"
            name="relationship"
            control={dialogForm.control}
            label={`This person is the Main Applicant (${mainApplicantName})'s:`}
            required
            options={RELATIONSHIP_OPTIONS.map(rel => ({ value: rel, label: rel }))}
            placeholder="Choose Relationship"
            data-testid="select-relationship"
          />
          
          <Field
            type="select"
            name="relationship_to_spouse"
            control={dialogForm.control}
            label={`This person is ${spouseName}'s:`}
            required
            options={RELATIONSHIP_OPTIONS.map(rel => ({ value: rel, label: rel }))}
            placeholder="Choose Relationship"
            data-testid="select-relationship-to-spouse"
          />
        </div>
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

export default function ChildrenStartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
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

  // Load section data from mainApplicant.family (the correct database path)
  const familyData = draftStore.getSectionData('mainApplicant.family');
  
  // Map database field (has_children) to form field (has_children_joint)
  const effectiveChildren = familyData?.children || [];
  const effectiveHasChildren = familyData?.has_children || "";

  const form = useForm({
    resolver: zodResolver(childrenSchema),
    mode: "onChange",
    defaultValues: {
      has_children_joint: effectiveHasChildren,
      children: effectiveChildren,
    },
  });

  const { control, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isValid, isDirty } } = form;
  const saveTimeoutRef = useRef(null);

  const hasChildrenJoint = watch("has_children_joint");
  const children = watch("children") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    // Only reset if we have an ID, aren't loading, and form is not dirty
    // This prevents overwriting user input immediately after a save
    const hasData = familyData && (familyData.children?.length > 0 || familyData.has_children);
    
    if (!draftSnap.isLoading && hasData && !isDirty) {
      // Map database field (has_children) to form field (has_children_joint)
      const resetData = {
        has_children_joint: familyData.has_children || "",
        children: familyData.children || [],
      };
      
      reset(resetData, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, familyData, reset, isDirty]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) {
      console.warn('[ChildrenStartPage] Auto-save skipped: currentApplicationId is missing');
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Use form.getValues() to get the actual current state of all fields
      const currentFormValues = form.getValues();
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      
      // Map form field (has_children_joint) to database field (has_children)
      // Remove has_children_joint to keep database clean
      const { has_children_joint, ...formDataWithoutJoint } = currentFormValues;
      const mappedData = {
        ...existingData,
        has_children: has_children_joint || "", // Map to correct database field
        children: formDataWithoutJoint.children || [],
      };
      
      draftStore.saveSectionData('mainApplicant.family', mappedData);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, form]);

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
      // Get existing section data to preserve any other fields
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      
      // Map form field (has_children_joint) to database field (has_children)
      // Remove has_children_joint to keep database clean
      const { has_children_joint, ...formDataWithoutJoint } = data;
      const mappedData = {
        ...existingData, // Preserve any existing fields
        has_children: has_children_joint || "", // Map to correct database field
        children: formDataWithoutJoint.children || [],
      };
      
      const result = await draftStore.saveSectionData('mainApplicant.family', mappedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/children/start');
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
      // Trigger validation and check for errors
      const isValid = await form.trigger();
      
      if (!isValid) {
        // DEBUG: Log validation errors to console for debugging
        console.error('[ChildrenStartPage] Validation failed:', form.formState.errors);
        console.log('[ChildrenStartPage] Form values:', form.getValues());
        
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const currentData = form.getValues();
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      
      // Map form field (has_children_joint) to database field (has_children)
      // Remove has_children_joint to keep database clean
      const { has_children_joint, ...formDataWithoutJoint } = currentData;
      const mappedData = {
        ...existingData, // Preserve any existing fields
        has_children: has_children_joint || "", // Map to correct database field
        children: formDataWithoutJoint.children || [],
      };
      
      const result = await draftStore.saveSectionData('mainApplicant.family', mappedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/children/start');
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

  const handleAddChild = async (child) => {
    // Clear auto-save timeout to prevent race condition with manual save
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

    const updatedChildren = [...children, child];
    setValue("children", updatedChildren, { shouldValidate: true });
    const currentData = getValues();
    
    try {
      // Get existing section data to preserve any other fields
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      
      // Map form field (has_children_joint) to database field (has_children)
      // Remove has_children_joint to keep database clean
      const { has_children_joint, ...formDataWithoutJoint } = currentData;
      const mappedData = {
        ...existingData, // Preserve any existing fields
        has_children: has_children_joint || "", // Map to correct database field
        children: updatedChildren, // Override with updated children array
      };
      
      const result = await draftStore.saveSectionData('mainApplicant.family', mappedData);
      if (!result.success) {
        toast({
          title: "Error saving",
          description: result.error || "Failed to save child. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error saving",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditChild = async (index, child) => {
    // Clear auto-save timeout to prevent race condition with manual save
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

    const updatedChildren = [...children];
    updatedChildren[index] = child;
    setValue("children", updatedChildren, { shouldValidate: true });
    const currentData = getValues();
    
    try {
      // Get existing section data to preserve any other fields
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      
      // Map form field (has_children_joint) to database field (has_children)
      // Remove has_children_joint to keep database clean
      const { has_children_joint, ...formDataWithoutJoint } = currentData;
      const mappedData = {
        ...existingData, // Preserve any existing fields
        has_children: has_children_joint || "", // Map to correct database field
        children: updatedChildren, // Override with updated children array
      };
      
      const result = await draftStore.saveSectionData('mainApplicant.family', mappedData);
      if (!result.success) {
        toast({
          title: "Error saving",
          description: result.error || "Failed to save changes. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error saving",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChild = async (index) => {
    // Clear auto-save timeout to prevent race condition with manual save
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

    const updatedChildren = children.filter((_, i) => i !== index);
    setValue("children", updatedChildren, { shouldValidate: true });
    const currentData = getValues();
    
    try {
      // Get existing section data to preserve any other fields
      const existingData = draftStore.getSectionData('mainApplicant.family') || {};
      
      // Map form field (has_children_joint) to database field (has_children)
      // Remove has_children_joint to keep database clean
      const { has_children_joint, ...formDataWithoutJoint } = currentData;
      const mappedData = {
        ...existingData, // Preserve any existing fields
        has_children: has_children_joint || "", // Map to correct database field
        children: updatedChildren, // Override with updated children array
      };
      
      const result = await draftStore.saveSectionData('mainApplicant.family', mappedData);
      if (!result.success) {
        toast({
          title: "Error saving",
          description: result.error || "Failed to delete child. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error saving",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const childColumns = [
    {
      key: "name", label: "Name", format: (row) => {
        if (row.given_names && row.family_name) {
          return `${row.given_names} ${row.family_name}`;
        }
        return row.name || "";
      }
    },
    {
      key: "dob", label: "Date of Birth", format: (row) => {
        if (row.birth_day && row.birth_month && row.birth_year) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIdx = parseInt(row.birth_month) - 1;
          return `${monthNames[monthIdx]} ${row.birth_day}, ${row.birth_year}`;
        }
        return row.dob || "";
      }
    },
    { key: "gender", label: "Gender" },
    { 
      key: "relationship", label: "Relationship", format: (row) => {
        const mainRel = row.relationship || "";
        const spouseRel = row.relationship_to_spouse || "";
        if (mainRel && spouseRel) {
          return `${mainRel} / ${spouseRel}`;
        }
        return mainRel || spouseRel || "";
      }
    },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Children</CardTitle>
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
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-700 mb-4">
                In the Children section you are to provide details about the children of the main applicant and the main applicant's spouse/partner.
              </p>
            </div>

            <Field
              type="radio"
              name="has_children_joint"
              control={control}
              label="Do you or your Spouse/Partner have any Children, Step Children or Adoptive Children?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              data-testid="radio-has-children"
            />

            {hasChildrenJoint === "Yes" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Enter details about all of your and your Spouse/Partner's Children</h3>
                <RepeaterTable
                  data={children}
                  columns={childColumns}
                  onAdd={handleAddChild}
                  onEdit={handleEditChild}
                  onDelete={handleDeleteChild}
                  DialogComponent={ChildDialog}
                  addButtonText="Add"
                  testIdPrefix="child"
                  dialogTitle="Add Child"
                  dialogSubtitle="Enter Child's details"
                  dialogClassName="max-w-4xl w-[90vw] max-h-[98vh] bg-white overflow-y-auto"
                />
              </div>
            )}

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
