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

// Constants
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

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

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

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
        <Label>Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-from-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-from-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-date-from-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(dialogForm.formState.errors.date_from_day || dialogForm.formState.errors.date_from_month || dialogForm.formState.errors.date_from_year) && (
          <p className="text-sm text-red-600 mt-1">Date From is required</p>
        )}
      </div>

      <div>
        <Label>Date To (leave blank if ongoing)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
          >
            <SelectTrigger data-testid="select-date-to-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month")}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value)}
          >
            <SelectTrigger data-testid="select-date-to-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year")}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value)}
          >
            <SelectTrigger data-testid="select-date-to-year">
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
        <Button type="submit" className="bg-primary text-primary-foreground" data-testid="button-ok">
          Ok
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

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(educationSchema),
    mode: "onChange",
    defaultValues: {
      has_education: sectionData.has_education || "No",
      education_history: sectionData.education_history || [],
    },
  });

  // Watch form values for conditional rendering
  const hasEducation = watch("has_education");
  const educationHistory = watch("education_history") || [];

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
        draftStore.saveSectionData('mainApplicant.education', watchedValues);
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
      const result = await draftStore.saveSectionData('mainApplicant.education', data);

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
      const currentData = getValues();
      const result = await draftStore.saveSectionData('mainApplicant.education', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/education');
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

  const updateEducationHistory = (newHistory) => {
    setValue("education_history", newHistory, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.education', { ...currentData, education_history: newHistory });
  };

  const educationColumns = [
    {
      key: "date_from", label: "Date From", format: (row) => {
        if (row.date_from_day && row.date_from_month && row.date_from_year) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIdx = parseInt(row.date_from_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_from_day}, ${row.date_from_year}`;
        }
        return "";
      }
    },
    {
      key: "date_to", label: "Date To", format: (row) => {
        if (row.date_to_day && row.date_to_month && row.date_to_year) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthIdx = parseInt(row.date_to_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_to_day}, ${row.date_to_year}`;
        }
        return "Ongoing";
      }
    },
    { key: "qualification_type", label: "Qualification" },
    { key: "course_name", label: "Course Name" },
    { key: "institution_name", label: "Institution" },
    { key: "country", label: "Country" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Education</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about the main applicant's education.
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
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Question 1: Have you ever undertaken or enrolled in any studies or training at secondary level or above? */}
            <div>
              <Field
                type="radio"
                name="has_education"
                control={control}
                label="Have you ever undertaken or enrolled in any studies or training at secondary level or above?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
              <p className="text-sm text-gray-600 mt-2">
                (Includes: high school, college/vocational, university, research/thesis, specialised training, skill/trade qualifications.)
              </p>
            </div>

            {/* Education History Section */}
            {hasEducation === "Yes" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Education History</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter details of all education and qualifications you have undertaken or are enrolled in above secondary level
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
