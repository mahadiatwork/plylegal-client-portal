"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

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
  gender: z.enum(["Male", "Female", "Other"]),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  relationship: z.string().min(1, "Relationship to Family Sponsor is required"),
});

function FamilyMemberDialog({ editingRow, onSave, onCancel }) {
  const sponsorDetails = draftStore.getSectionData('familySponsor.details') || {};
  const sponsorName = sponsorDetails.given_names && sponsorDetails.family_name
    ? `${sponsorDetails.given_names} ${sponsorDetails.family_name}`
    : sponsorDetails.given_names || sponsorDetails.family_name || "the sponsor";

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
      className="space-y-4"
    >
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900 mb-2">Personal Details</h3>
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
        <Label htmlFor="relationship">This person is {sponsorName}'s: <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("relationship")}
          onValueChange={(value) => dialogForm.setValue("relationship", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-relationship">
            <SelectValue placeholder="Choose Relationship Type" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIP_OPTIONS.map((rel) => (
              <SelectItem key={rel} value={rel}>{rel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.relationship && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship.message}</p>
        )}
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

const familySponsorFamilySchema = z.object({
  family_members: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    gender: z.string(),
    birth_day: z.string().optional(),
    birth_month: z.string().optional(),
    birth_year: z.string().optional(),
    relationship: z.string(),
  })).optional(),
});

export default function FamilySponsorFamilyPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
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

  // Load section data from familySponsor.details
  const sectionData = draftStore.getSectionData('familySponsor.details');
  
  // Get sponsor name for display
  const sponsorName = sectionData?.given_names && sectionData?.family_name
    ? `${sectionData.given_names} ${sectionData.family_name}`
    : sectionData?.given_names || sectionData?.family_name || "the sponsor";

  const form = useForm({
    resolver: zodResolver(familySponsorFamilySchema),
    mode: "onChange",
    defaultValues: {
      family_members: sectionData?.family_members || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values
  const familyMembers = form.watch("family_members") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        family_members: sectionData.family_members || [],
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
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const mergedData = { ...existingData, ...currentFormValues };
      
      draftStore.saveSectionData('familySponsor.details', mergedData);
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
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const finalData = {
        ...existingData,
        ...data,
      };
      
      const result = await draftStore.saveSectionData('familySponsor.details', finalData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/family', null, 'familySponsor.details');
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

      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const currentData = getValues();
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('familySponsor.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/family', null, 'familySponsor.details');
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

  const updateFamilyMembers = (newMembers) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("family_members", newMembers, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', { 
      ...existingData,
      ...currentData,
      family_members: newMembers 
    });
  };

  const familyMemberColumns = [
    {
      key: "name", label: "Name", format: (row) => {
        if (row.family_name || row.given_names) {
          return `${row.given_names || ""} ${row.family_name || ""}`.trim();
        }
        return "";
      }
    },
    {
      key: "dob", label: "Date of Birth", format: (row) => {
        if (row.birth_day && row.birth_month && row.birth_year) {
          const monthIdx = parseInt(row.birth_month) - 1;
          return `${monthNames[monthIdx]} ${row.birth_day}, ${row.birth_year}`;
        }
        return "";
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
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Family Members for {sponsorName}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter details of all your Family Sponsor's Parents, Siblings and Children (including if they are deceased)
              </p>
              <RepeaterTable
                data={familyMembers}
                columns={familyMemberColumns}
                onAdd={(row) => updateFamilyMembers([...familyMembers, row])}
                onEdit={(index, row) => {
                  const updated = [...familyMembers];
                  updated[index] = row;
                  updateFamilyMembers(updated);
                }}
                onDelete={(index) => {
                  const updated = familyMembers.filter((_, i) => i !== index);
                  updateFamilyMembers(updated);
                }}
                DialogComponent={FamilyMemberDialog}
                addButtonText="Add"
                testIdPrefix="family-member"
                dialogTitle="Family Member"
              />
              {form.formState.errors.family_members && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.family_members.message}</p>
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

