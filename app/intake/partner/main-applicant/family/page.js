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

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

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

function FamilyMemberDialog({ editingRow, onSave, onCancel }) {
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
          Enter details about all of the Main Applicant's:
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1 ml-4">
          <li>Spouse/Partner (if applicable); and</li>
          <li>Parents (including Step-Parents); and</li>
          <li>Siblings (including Step-Sisters/Step-Brothers); and</li>
          <li>Children (including children from a previous relationship, Step-Children and Adopted Children)</li>
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

      <div>
        <Label>Date of Birth</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("birth_day")}
            onValueChange={(value) => dialogForm.setValue("birth_day", value)}
          >
            <SelectTrigger data-testid="select-birth-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("birth_month")}
            onValueChange={(value) => dialogForm.setValue("birth_month", value)}
          >
            <SelectTrigger data-testid="select-birth-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("birth_year")}
            onValueChange={(value) => dialogForm.setValue("birth_year", value)}
          >
            <SelectTrigger data-testid="select-birth-year">
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
        <Label htmlFor="relationship">This person is the Main Applicant's: <span className="text-red-500">*</span></Label>
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

      {relationship === "Spouse/Partner" && (
        <div className="mt-4">
          <Label>Date relationship started</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_relationship_started_day")}
              onValueChange={(value) => dialogForm.setValue("date_relationship_started_day", value)}
            >
              <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
              <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_relationship_started_month")}
              onValueChange={(value) => dialogForm.setValue("date_relationship_started_month", value)}
            >
              <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_relationship_started_year")}
              onValueChange={(value) => dialogForm.setValue("date_relationship_started_year", value)}
            >
              <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-primary text-primary-foreground" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MainApplicantFamilyPage() {
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
  const sectionData = draftStore.getSectionData('mainApplicant.family');

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(familyMainSchema),
    mode: "onChange",
    defaultValues: {
      has_children: sectionData.has_children || "No",
      children: sectionData.children || [],
    },
  });

  // Watch form values
  const hasChildren = watch("has_children");
  const children = watch("children") || [];

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
        draftStore.saveSectionData('mainApplicant.family', watchedValues);
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
      const result = await draftStore.saveSectionData('mainApplicant.family', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/family');
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
      const result = await draftStore.saveSectionData('mainApplicant.family', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/family');
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

  const updateChildren = (newChildren) => {
    setValue("children", newChildren, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.family', { ...currentData, children: newChildren });
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
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIdx = parseInt(row.birth_month) - 1;
          return `${monthNames[monthIdx]} ${row.birth_day}, ${row.birth_year}`;
        }
        return row.dob || "";
      }
    },
    { key: "gender", label: "Gender" },
    { key: "relationship", label: "Relationship" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Family Information</CardTitle>
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

            {/* Question: Do you have any children? */}
            <div>
              <Field
                type="radio"
                name="has_children"
                control={control}
                label="Do you have any children?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Children Information Section - Shown for both Yes and No */}
            {(hasChildren === "Yes" || hasChildren === "No") && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Family Members</h3>
                <p className="text-sm text-gray-600">
                  Please provide details about your family members (children, etc.)
                </p>
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
                  addButtonText="Add Family Member"
                  testIdPrefix="family"
                  dialogTitle="Add Family Member"
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
