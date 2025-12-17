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
import { childrenSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const RELATIONSHIP_OPTIONS = [
  "Child",
  "Step Child",
  "Adopted Child"
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

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
  }, [editingRow]);

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

              <div>
                <Label>Date of Birth <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Select
                    value={dialogForm.watch("birth_day")}
                    onValueChange={(value) => dialogForm.setValue("birth_day", value, { shouldValidate: true })}
                  >
                    <SelectTrigger data-testid="select-birth-day">
                      <SelectValue placeholder="Choose Day" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={dialogForm.watch("birth_month")}
                    onValueChange={(value) => dialogForm.setValue("birth_month", value, { shouldValidate: true })}
                  >
                    <SelectTrigger data-testid="select-birth-month">
                      <SelectValue placeholder="Choose Month" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      {months.map((month, idx) => (
                        <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={dialogForm.watch("birth_year")}
                    onValueChange={(value) => dialogForm.setValue("birth_year", value, { shouldValidate: true })}
                  >
                    <SelectTrigger data-testid="select-birth-year">
                      <SelectValue placeholder="Choose Year" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[100]">
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(dialogForm.formState.errors.birth_day || dialogForm.formState.errors.birth_month || dialogForm.formState.errors.birth_year) && (
                  <p className="text-sm text-red-600 mt-1">Date of Birth is required</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block font-semibold">Relationship Details</Label>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="relationship">This person is the Main Applicant ({mainApplicantName})'s: <span className="text-red-500">*</span></Label>
                <Select
                  value={dialogForm.watch("relationship")}
                  onValueChange={(value) => dialogForm.setValue("relationship", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-relationship">
                    <SelectValue placeholder="Choose Relationship" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dialogForm.formState.errors.relationship && (
                  <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="relationship_to_spouse">This person is {spouseName}'s: <span className="text-red-500">*</span></Label>
                <Select
                  value={dialogForm.watch("relationship_to_spouse")}
                  onValueChange={(value) => dialogForm.setValue("relationship_to_spouse", value, { shouldValidate: true })}
                >
                  <SelectTrigger data-testid="select-relationship-to-spouse">
                    <SelectValue placeholder="Choose Relationship" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[100]">
                    {RELATIONSHIP_OPTIONS.map((rel) => (
                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dialogForm.formState.errors.relationship_to_spouse && (
                  <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship_to_spouse.message}</p>
                )}
              </div>
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

  // Load section data
  const sectionData = draftStore.getSectionData('children.details');

  const { control, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(childrenSchema),
    mode: "onChange",
    defaultValues: {
      has_children_joint: sectionData.has_children_joint || "",
      children: sectionData.children || [],
    },
  });

  const hasChildrenJoint = watch("has_children_joint");
  const children = watch("children") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Reset form when section data loads
  useEffect(() => {
    if (sectionData && draftSnap.currentApplicationId) {
      reset({
        has_children_joint: sectionData.has_children_joint || "",
        children: sectionData.children || [],
      });
    }
  }, [draftSnap.currentApplicationId, JSON.stringify(sectionData?.children), sectionData?.has_children_joint, reset]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) return;

    const timeoutId = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('children.details', watchedValues);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
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
      const result = await draftStore.saveSectionData('children.details', data);

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
      // Use watched values which are always current, or fallback to getValues()
      const dataToSave = watchedValues && Object.keys(watchedValues).length > 0 
        ? watchedValues 
        : getValues();
      
      // Ensure we always have the children array and has_children_joint
      const finalData = {
        has_children_joint: dataToSave.has_children_joint || watch("has_children_joint") || "",
        children: dataToSave.children || watch("children") || [],
      };
      
      const result = await draftStore.saveSectionData('children.details', finalData);

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
      const result = await draftStore.saveSectionData('children.details', { ...currentData, children: updatedChildren });
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
      const result = await draftStore.saveSectionData('children.details', { ...currentData, children: updatedChildren });
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
      const result = await draftStore.saveSectionData('children.details', { ...currentData, children: updatedChildren });
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
