"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const QUALIFICATION_LEVELS = [
  "Secondary",
  "Diploma/Certificate",
  "Bachelor's",
  "Master's",
  "Doctorate/PhD",
  "Other"
];

// Replaced STUDY_MODES with COURSE_STATUSES based on snapshot inference, 
// though snapshot specifically requested "Course Status" dropdown.
const COURSE_STATUSES = [
  "Completed",
  "Current/Ongoing",
  "Deferred",
  "Withdrawn"
];

const LANGUAGES = [
  "English", "Arabic", "Bengali", "Chinese (Mandarin)", "Chinese (Cantonese)",
  "French", "German", "Hindi", "Indonesian", "Italian", "Japanese",
  "Korean", "Malay", "Portuguese", "Punjabi", "Russian", "Spanish",
  "Tagalog", "Thai", "Turkish", "Urdu", "Vietnamese", "Other"
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));

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

function EducationDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    date_from_day: z.string().min(1, "Day is required"),
    date_from_month: z.string().min(1, "Month is required"),
    date_from_year: z.string().min(1, "Year is required"),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    qualification: z.string().min(1, "Qualification is required"),
    is_highest_qualification: z.enum(["yes", "no"]),
    course_name: z.string().min(1, "Course Name / Research Description is required"),
    course_language: z.string().min(1, "Course Language is required"),
    course_status: z.string().min(1, "Course Status is required"),

    // Institution Details
    institution: z.string().min(1, "Institution name is required"),
    country: z.string().min(1, "Country is required"),
    institution_address: z.string().min(1, "Address is required"),
    institution_suburb: z.string().min(1, "Suburb/Town/City is required"),
    institution_state: z.string().min(1, "State is required"),
    institution_postcode: z.string().min(1, "Postcode is required"),

    // Kept optional existing fields just in case
    certificate_number: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      qualification: "",
      is_highest_qualification: "no",
      course_name: "",
      course_language: "",
      course_status: "",
      institution: "",
      country: "",
      institution_address: "",
      institution_suburb: "",
      institution_state: "",
      institution_postcode: "",
      certificate_number: "",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">

      {/* Date From */}
      <div>
        <Label className="mb-2 block">Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
          >
            <SelectTrigger data-testid="select-date-from-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value)}
          >
            <SelectTrigger data-testid="select-date-from-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value)}
          >
            <SelectTrigger data-testid="select-date-from-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_from_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
        )}
      </div>

      {/* Date To */}
      <div>
        <Label className="mb-2 block">Date To (leave blank if ongoing)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
          >
            <SelectTrigger data-testid="select-date-to-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
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
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
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
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Qualification Type */}
      <div>
        <Label className="mb-2 block">Qualification Type/Course Type</Label>
        <Select
          value={dialogForm.watch("qualification")}
          onValueChange={(value) => dialogForm.setValue("qualification", value)}
        >
          <SelectTrigger data-testid="select-qualification">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {QUALIFICATION_LEVELS.map((qual) => (
              <SelectItem key={qual} value={qual}>{qual}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.qualification && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.qualification.message}</p>
        )}
      </div>

      {/* Highest Level Check */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Is this your highest level of qualification?
        </Label>
        <RadioGroup
          value={dialogForm.watch("is_highest_qualification")}
          onValueChange={(value) => dialogForm.setValue("is_highest_qualification", value)}
          className="flex gap-4"
          data-testid="radio-highest-qual"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="highest-yes" />
            <Label htmlFor="highest-yes" className="ml-2 cursor-pointer font-normal">
              Yes
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="highest-no" />
            <Label htmlFor="highest-no" className="ml-2 cursor-pointer font-normal">
              No
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Course Name */}
      <div>
        <Label htmlFor="course_name" className="mb-2 block">Course Name or Research Description</Label>
        <Input
          id="course_name"
          {...dialogForm.register("course_name")}
          data-testid="input-course-name"
        />
        {dialogForm.formState.errors.course_name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.course_name.message}</p>
        )}
      </div>

      {/* Course Language */}
      <div>
        <Label htmlFor="course_language" className="mb-2 block">Course Language</Label>
        <Select
          value={dialogForm.watch("course_language")}
          onValueChange={(value) => dialogForm.setValue("course_language", value)}
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

      {/* Course Status */}
      <div>
        <Label className="mb-2 block">Course Status</Label>
        <Select
          value={dialogForm.watch("course_status")}
          onValueChange={(value) => dialogForm.setValue("course_status", value)}
        >
          <SelectTrigger data-testid="select-course-status">
            <SelectValue placeholder="Choose Status" />
          </SelectTrigger>
          <SelectContent>
            {COURSE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.course_status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.course_status.message}</p>
        )}
      </div>

      {/* Institution Details Header */}
      <div className="pt-2">
        <h3 className="text-base font-bold text-gray-900 mb-4">Institution Details</h3>

        {/* Institution Name */}
        <div className="mb-4">
          <Label htmlFor="institution" className="mb-2 block">Institution Name</Label>
          <Input
            id="institution"
            {...dialogForm.register("institution")}
            data-testid="input-institution"
          />
          {dialogForm.formState.errors.institution && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.institution.message}</p>
          )}
        </div>

        {/* Country */}
        <div className="mb-4">
          <Label className="mb-2 block">Country</Label>
          <Select
            value={dialogForm.watch("country")}
            onValueChange={(value) => dialogForm.setValue("country", value)}
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

        {/* Address */}
        <div className="mb-4">
          <Label htmlFor="institution_address" className="mb-2 block">Address (including Street Number and Name)</Label>
          <Input
            id="institution_address"
            {...dialogForm.register("institution_address")}
            data-testid="input-institution-address"
          />
          {dialogForm.formState.errors.institution_address && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.institution_address.message}</p>
          )}
        </div>

        {/* Suburb */}
        <div className="mb-4">
          <Label htmlFor="institution_suburb" className="mb-2 block">Suburb/Town/City</Label>
          <Input
            id="institution_suburb"
            {...dialogForm.register("institution_suburb")}
            data-testid="input-institution-suburb"
          />
          {dialogForm.formState.errors.institution_suburb && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.institution_suburb.message}</p>
          )}
        </div>

        {/* State */}
        <div className="mb-4">
          <Label htmlFor="institution_state" className="mb-2 block">State</Label>
          <Input
            id="institution_state"
            {...dialogForm.register("institution_state")}
            data-testid="input-institution-state"
          />
          {dialogForm.formState.errors.institution_state && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.institution_state.message}</p>
          )}
        </div>

        {/* Postcode */}
        <div className="mb-4">
          <Label htmlFor="institution_postcode" className="mb-2 block">Postcode</Label>
          <Input
            id="institution_postcode"
            {...dialogForm.register("institution_postcode")}
            data-testid="input-institution-postcode"
          />
          {dialogForm.formState.errors.institution_postcode && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.institution_postcode.message}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={dialogForm.handleSubmit(handleSubmit)}
          className="bg-[#022C22] hover:bg-[#022C22] text-white"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function EducationPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const draft = draftSnap.draft;

  const profileId = searchParams.get('profileId');
  const visaType = getVisaTypeFromPath(pathname);

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    defaultValues: {
      has_secondary_education: "no",
      education_history: [],
    }
  });

  const hasSecondaryEducation = form.watch("has_secondary_education");
  const educationHistory = form.watch("education_history") || [];

  useEffect(() => {
    const savedData = profileId
      ? draftSnap.draft?.profiles_data?.[profileId]?.education || {}
      : draftSnap.draft?.temporary_work_education || {};

    if (Object.keys(savedData).length > 0) {
      form.reset(savedData);
    }
  }, [draftSnap.draft?.temporary_work_education, draftSnap.draft?.profiles_data, profileId, form]);

  const handleSave = async () => {
    const formData = form.getValues();
    const result = profileId
      ? await draftStore.saveProfileSectionData(profileId, "education", formData)
      : await draftStore.saveSectionData("temporary_work_education", formData);

    if (result.success) {
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data) => {
    const result = profileId
      ? await draftStore.saveProfileSectionData(profileId, "education", data)
      : await draftStore.saveSectionData("temporary_work_education", data);

    if (result.success) {
      if (profileId) {
        await draftStore.markProfilePageComplete(profileId, `${visaType}/main-applicant/education`);
      } else {
        await draftStore.markPageComplete(`${visaType}/main-applicant/education`, null, "temporary_work_education");
      }

      const nextRoute = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      if (nextRoute) {
        startNavigation(nextRoute);
        router.push(nextRoute);
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    const previousRoute = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (previousRoute) {
      startNavigation(previousRoute);
      router.push(previousRoute);
    }
  };



  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Main Applicant's Education</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          In this section, provide details about the main applicant&apos;s education history.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-8">
            {/* Q1: Have you ever undertaken or enrolled in any studies */}
            <div>
              <Label className="text-base font-medium mb-3 block">
                Have you ever undertaken or enrolled in any studies or training at secondary level or above? (including: high school, college/vocational schools, university, research/thesis, specialised training, skill/trade qualifications)?
              </Label>
              <RadioGroup
                value={hasSecondaryEducation}
                onValueChange={(value) => form.setValue("has_secondary_education", value)}
                className="flex gap-4"
                data-testid="radio-secondary-education"
              >
                <div className="flex items-center" data-testid="radio-secondary-education-yes">
                  <RadioGroupItem value="yes" id="education-yes" />
                  <Label htmlFor="education-yes" className="ml-2 cursor-pointer font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center" data-testid="radio-secondary-education-no">
                  <RadioGroupItem value="no" id="education-no" />
                  <Label htmlFor="education-no" className="ml-2 cursor-pointer font-normal">
                    No
                  </Label>
                </div>
              </RadioGroup>

              {/* Education History Repeater (shown if Yes) */}
              {hasSecondaryEducation === "yes" && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Education History</h3>
                  <RepeaterTable
                    data={educationHistory}
                    columns={[
                      { key: "institution", label: "Institution" },
                      { key: "qualification", label: "Qualification" },
                      { key: "course_name", label: "Course Name" },
                      { key: "date_from_year", label: "Year Started" },
                      { key: "country", label: "Country" },
                    ]}
                    onAdd={(newRow) => {
                      const updated = [...educationHistory, newRow];
                      form.setValue("education_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    }}
                    onEdit={(index, updatedRow) => {
                      const updated = [...educationHistory];
                      updated[index] = updatedRow;
                      form.setValue("education_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    }}
                    onDelete={(index) => {
                      const updated = educationHistory.filter((_, i) => i !== index);
                      form.setValue("education_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    }}
                    DialogComponent={EducationDialog}
                    addButtonText="Add"
                    testIdPrefix="education"
                  />
                </div>
              )}
            </div>
          </div>

          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            saveLabel="Save Draft"
            nextLabel="Continue"
            loading={draftSnap.isSaving}
          />
        </form>
      </CardContent>
    </Card>
  );
}
