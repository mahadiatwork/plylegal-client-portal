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
import { educationSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";

const QUALIFICATION_TYPES = [
  "Secondary",
  "Diploma/Certificate",
  "Bachelor's",
  "Master's",
  "Doctorate/PhD",
  "Other"
];

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Korean", "Arabic",
  "Hindi", "Russian", "Dutch", "Greek", "Turkish", "Polish", "Swedish", "Norwegian", "Danish", "Finnish",
  "Other"
];

const COURSE_STATUS_OPTIONS = [
  "Completed",
  "Ongoing",
  "Withdrawn",
  "Deferred"
];

const educationHistoryDialogSchema = z.object({
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  qualification_type: z.string().min(1, "Qualification Type is required"),
  is_highest_qualification: z.string().optional(),
  course_name: z.string().min(1, "Course Name or Research Description is required"),
  course_language: z.string().min(1, "Course Language is required"),
  course_status: z.string().min(1, "Course Status is required"),
  institution_name: z.string().min(1, "Institution Name is required"),
  country: z.string().min(1, "Country is required"),
  institution_address: z.string().optional(),
  institution_suburb: z.string().optional(),
  institution_state: z.string().optional(),
  institution_postcode: z.string().optional(),
});

function EducationHistoryDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(educationHistoryDialogSchema),
    defaultValues: editingRow || {
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      qualification_type: "",
      is_highest_qualification: "",
      course_name: "",
      course_language: "",
      course_status: "",
      institution_name: "",
      country: "",
      institution_address: "",
      institution_suburb: "",
      institution_state: "",
      institution_postcode: "",
    },
  });

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
      <DateSelector
        label="Date From"
        values={{
          day: dialogForm.watch("date_from_day") || "",
          month: dialogForm.watch("date_from_month") || "",
          year: dialogForm.watch("date_from_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_from_${type}`;
          dialogForm.setValue(fieldName, value, { shouldValidate: true });
        }}
        testIdPrefix="select-date-from"
      />
      {(dialogForm.formState.errors.date_from_day || dialogForm.formState.errors.date_from_month || dialogForm.formState.errors.date_from_year) && (
        <p className="text-sm text-red-600 mt-1">Date From is required</p>
      )}

      <DateSelector
        label="Date To (leave blank if ongoing)"
        values={{
          day: dialogForm.watch("date_to_day") || "",
          month: dialogForm.watch("date_to_month") || "",
          year: dialogForm.watch("date_to_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_to_${type}`;
          dialogForm.setValue(fieldName, value);
        }}
        testIdPrefix="select-date-to"
      />

      <div>
        <Label htmlFor="qualification_type">Qualification Type/Course Type <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("qualification_type")}
          onValueChange={(value) => dialogForm.setValue("qualification_type", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-qualification-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {QUALIFICATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.qualification_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.qualification_type.message}</p>
        )}
      </div>

      <div>
        <Label>Is this your highest level of qualification?</Label>
        <RadioGroup
          value={dialogForm.watch("is_highest_qualification")}
          onValueChange={(value) => dialogForm.setValue("is_highest_qualification", value)}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Yes" id="highest-yes" />
            <Label htmlFor="highest-yes" className="cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="No" id="highest-no" />
            <Label htmlFor="highest-no" className="cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="course_name">Course Name or Research Description <span className="text-red-500">*</span></Label>
        <Input
          id="course_name"
          {...dialogForm.register("course_name")}
          data-testid="input-course-name"
        />
        {dialogForm.formState.errors.course_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.course_name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="course_language">Course Language <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("course_language")}
          onValueChange={(value) => dialogForm.setValue("course_language", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-course-language">
            <SelectValue placeholder="Choose Language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.course_language && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.course_language.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="course_status">Course Status <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("course_status")}
          onValueChange={(value) => dialogForm.setValue("course_status", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-course-status">
            <SelectValue placeholder="Choose Status" />
          </SelectTrigger>
          <SelectContent>
            {COURSE_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.course_status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.course_status.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block font-semibold">Institution Details</Label>
        <div className="space-y-4">
          <div>
            <Label htmlFor="institution_name">Institution Name <span className="text-red-500">*</span></Label>
            <Input
              id="institution_name"
              {...dialogForm.register("institution_name")}
              data-testid="input-institution-name"
            />
            {dialogForm.formState.errors.institution_name && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.institution_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
            <Select
              value={dialogForm.watch("country")}
              onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder="Choose Country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dialogForm.formState.errors.country && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="institution_address">Address (including Street Number and Name)</Label>
            <Input
              id="institution_address"
              {...dialogForm.register("institution_address")}
              placeholder="Address (including Street Number and Name)"
              data-testid="input-institution-address"
            />
          </div>

          <div>
            <Label htmlFor="institution_suburb">Suburb/Town/City</Label>
            <Input
              id="institution_suburb"
              {...dialogForm.register("institution_suburb")}
              data-testid="input-institution-suburb"
            />
          </div>

          <div>
            <Label htmlFor="institution_state">State</Label>
            <Input
              id="institution_state"
              {...dialogForm.register("institution_state")}
              data-testid="input-institution-state"
            />
          </div>

          <div>
            <Label htmlFor="institution_postcode">Postcode</Label>
            <Input
              id="institution_postcode"
              {...dialogForm.register("institution_postcode")}
              data-testid="input-institution-postcode"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
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
    </form>
  );
}

export default function MainApplicantEducationPage() {
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
  const sectionData = draftStore.getSectionData('mainApplicant.education');

  const form = useForm({
    resolver: zodResolver(educationSchema),
    mode: "onChange",
    defaultValues: {
      has_education: sectionData?.has_education || "No",
      education_history: sectionData?.education_history || [],
    },
  });
  const { reset } = form;

  // Watch form values for conditional rendering
  const hasEducation = form.watch("has_education");
  const educationHistory = form.watch("education_history") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    // Only reset if we have an ID and aren't loading
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0) {
      // Use 'keepDefaultValues: true' to prevent flickering
      reset({
        has_education: sectionData.has_education || "No",
        education_history: sectionData.education_history || [],
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
      const existingData = draftStore.getSectionData('mainApplicant.education') || {};
      const mergedData = { ...existingData, ...currentFormValues };
      
      draftStore.saveSectionData('mainApplicant.education', mergedData);
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
      const existingData = draftStore.getSectionData('mainApplicant.education') || {};
      const mergedData = { ...existingData, ...data };
      
      const result = await draftStore.saveSectionData('mainApplicant.education', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/education');
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
      const existingData = draftStore.getSectionData('mainApplicant.education') || {};
      const currentData = form.getValues();
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('mainApplicant.education', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/education');
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

  const updateEducationHistory = (newHistory) => {
    form.setValue("education_history", newHistory, { shouldValidate: true });
    const existingData = draftStore.getSectionData('mainApplicant.education') || {};
    const currentData = form.getValues();
    const mergedData = { ...existingData, ...currentData, education_history: newHistory };
    draftStore.saveSectionData('mainApplicant.education', mergedData);
  };

  // Get main applicant name for display
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details') || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : null;

  const educationColumns = [
    {
      key: "date_from", label: "Date From", format: (row) => {
        if (row.date_from_day && row.date_from_month && row.date_from_year) {
          const monthIdx = parseInt(row.date_from_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_from_day}, ${row.date_from_year}`;
        }
        return "";
      }
    },
    {
      key: "date_to", label: "Date To", format: (row) => {
        if (row.date_to_day && row.date_to_month && row.date_to_year) {
          const monthIdx = parseInt(row.date_to_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_to_day}, ${row.date_to_year}`;
        }
        return "Ongoing";
      }
    },
    { key: "course_name", label: "Course Name" },
    { key: "institution_name", label: "Institution Name" },
    { key: "country", label: "Country" },
    { key: "course_status", label: "Status" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Education</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about the main applicant's education history.
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

            {/* Question 1: Have you ever undertaken or enrolled in any education or course above secondary level? */}
            <div>
              <Field
                type="radio"
                name="has_education"
                control={form.control}
                label="Have you ever undertaken or enrolled in any education or course above secondary level? (Including: college/vocational schools, university, research/thesis, specialised training, skill/trade qualifications)?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Education History Section */}
            {hasEducation === "Yes" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Education History for the Main Applicant{mainApplicantName ? ` (${mainApplicantName})` : ""}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter details of all education and qualifications you have undertaken or are enrolled in above secondary level: (Includes: college/vocational schools, university, research/thesis, specialised training, skill/trade qualifications)
                </p>
                <RepeaterTable
                  data={educationHistory}
                  columns={educationColumns}
                  onAdd={(row) => updateEducationHistory([...educationHistory, row])}
                  onEdit={(index, row) => {
                    const updated = [...educationHistory];
                    updated[index] = row;
                    updateEducationHistory(updated);
                  }}
                  onDelete={(index) => {
                    const updated = educationHistory.filter((_, i) => i !== index);
                    updateEducationHistory(updated);
                  }}
                  DialogComponent={EducationHistoryDialog}
                  addButtonText="Add"
                  testIdPrefix="education"
                  dialogTitle="Education History"
                  dialogSubtitle="Enter details of all education and qualifications you have undertaken or are enrolled in above secondary level: (Includes: college/vocational schools, university, research/thesis, specialised training, skill/trade qualifications)"
                  dialogClassName="max-w-4xl w-[90vw] max-h-[98vh] bg-white overflow-y-auto"
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
