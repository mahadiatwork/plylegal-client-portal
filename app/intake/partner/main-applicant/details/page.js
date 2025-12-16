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
import { detailsSchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

export default function MainApplicantDetailsPage() {
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

  // Set application ID from URL params if available, or use existing one from store
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    const currentAppId = draftSnap.currentApplicationId;

    if (appIdFromUrl && appIdFromUrl !== currentAppId) {
      // If URL has applicationId, use it and load draft
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (currentAppId && !appIdFromUrl) {
      // If store has applicationId but URL doesn't, update URL to include it
      const newUrl = `${pathname}?applicationId=${currentAppId}`;
      router.replace(newUrl);
    } else if (!currentAppId && !appIdFromUrl) {
      // If neither URL nor store has applicationId, try to get from applicationsStore
      if (appsSnap.applications && appsSnap.applications.length > 0) {
        // Use the first application or most recent one
        const firstApp = appsSnap.applications[0];
        if (firstApp?.id) {
          console.log('No applicationId found, using first application:', firstApp.id);
          draftStore.setApplicationId(firstApp.id);
          draftStore.loadDraft(firstApp.id);
          // Update URL to include the applicationId
          const newUrl = `${pathname}?applicationId=${firstApp.id}`;
          router.replace(newUrl);
        }
      } else {
        console.warn('No application ID found. User should navigate from application page.');
      }
    }
  }, [searchParams, draftSnap.currentApplicationId, appsSnap.applications, pathname, router]);

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.details');

  const { control, handleSubmit, getValues, setValue, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      is_main_applicant: sectionData.is_main_applicant || "No",
      prefix: sectionData.prefix,
      family_name: sectionData.family_name || "",
      given_names: sectionData.given_names || "",
      preferred_names: sectionData.preferred_names || "",
      gender: sectionData.gender,
      birth_day: sectionData.birth_day || "",
      birth_month: sectionData.birth_month || "",
      birth_year: sectionData.birth_year || "",
      country_of_birth: sectionData.country_of_birth || "",
      suburb_of_birth: sectionData.suburb_of_birth || "",
      city_of_birth: sectionData.city_of_birth || "",
      state_of_birth: sectionData.state_of_birth || "",
      marital_status: sectionData.marital_status,
      marital_status_date_day: sectionData.marital_status_date_day || "",
      marital_status_date_month: sectionData.marital_status_date_month || "",
      marital_status_date_year: sectionData.marital_status_date_year || "",
      completing_family_name: sectionData.completing_family_name || "",
      completing_given_names: sectionData.completing_given_names || "",
      completing_preferred_names: sectionData.completing_preferred_names || "",
      completing_gender: sectionData.completing_gender,
      completing_birth_day: sectionData.completing_birth_day || "",
      completing_birth_month: sectionData.completing_birth_month || "",
      completing_birth_year: sectionData.completing_birth_year || "",
      completing_country_of_birth: sectionData.completing_country_of_birth || "",
      completing_suburb_of_birth: sectionData.completing_suburb_of_birth || "",
      completing_city_of_birth: sectionData.completing_city_of_birth || "",
      completing_state_of_birth: sectionData.completing_state_of_birth || "",
    },
  });

  // Watch is_main_applicant for conditional validation highlighting
  const isMainApplicant = useWatch({ control, name: "is_main_applicant" });

  // Watch form values for radio groups and selects
  const completingGender = useWatch({ control, name: "completing_gender" });
  const completingBirthDay = useWatch({ control, name: "completing_birth_day" });
  const completingBirthMonth = useWatch({ control, name: "completing_birth_month" });
  const completingBirthYear = useWatch({ control, name: "completing_birth_year" });
  const prefix = useWatch({ control, name: "prefix" });
  const gender = useWatch({ control, name: "gender" });
  const birthDay = useWatch({ control, name: "birth_day" });
  const birthMonth = useWatch({ control, name: "birth_month" });
  const birthYear = useWatch({ control, name: "birth_year" });
  const maritalStatus = useWatch({ control, name: "marital_status" });
  const maritalStatusDateDay = useWatch({ control, name: "marital_status_date_day" });
  const maritalStatusDateMonth = useWatch({ control, name: "marital_status_date_month" });
  const maritalStatusDateYear = useWatch({ control, name: "marital_status_date_year" });

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Auto-save form data with debounce (only if applicationId is set)
  useEffect(() => {
    // Don't auto-save if there's no applicationId
    if (!draftSnap.currentApplicationId) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('mainApplicant.details', watchedValues);
      }
    }, 2000); // Save 2 seconds after user stops typing

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId]);

  const onSubmit = async (data) => {
    // Check if applicationId is set before attempting to save
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error saving draft",
        description: "No application selected. Please navigate to this page from an application.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await draftStore.saveSectionData('mainApplicant.details', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/details');
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
    // Check if applicationId is set before attempting to save
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error saving draft",
        description: "No application selected. Please navigate to this page from an application.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Manual save trigger
      const currentData = getValues();
      const result = await draftStore.saveSectionData('mainApplicant.details', currentData);

      if (result.success) {
        // Mark this page as complete
        await draftStore.markPageComplete('partner/main-applicant/details');

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

  // Reset state when toggling between Yes/No (only when value actually changes)
  const prevIsMainApplicantRef = useRef(isMainApplicant);
  useEffect(() => {
    // Skip on initial mount
    if (prevIsMainApplicantRef.current === isMainApplicant) {
      return;
    }

    if (isMainApplicant === "Yes") {
      // Clear person completing questionnaire fields when switching to Yes
      setValue("completing_family_name", "");
      setValue("completing_given_names", "");
      setValue("completing_preferred_names", "");
      setValue("completing_gender", undefined);
      setValue("completing_birth_day", "");
      setValue("completing_birth_month", "");
      setValue("completing_birth_year", "");
      setValue("completing_country_of_birth", "");
      setValue("completing_suburb_of_birth", "");
      setValue("completing_city_of_birth", "");
      setValue("completing_state_of_birth", "");
    } else if (isMainApplicant === "No") {
      // Clear main applicant fields when switching to No
      setValue("prefix", "");
      setValue("family_name", "");
      setValue("given_names", "");
      setValue("preferred_names", "");
      setValue("gender", undefined);
      setValue("birth_day", "");
      setValue("birth_month", "");
      setValue("birth_year", "");
      setValue("country_of_birth", "");
      setValue("suburb_of_birth", "");
      setValue("city_of_birth", "");
      setValue("state_of_birth", "");
      setValue("marital_status", undefined);
      setValue("marital_status_date_day", "");
      setValue("marital_status_date_month", "");
      setValue("marital_status_date_year", "");
    }

    // Update ref for next comparison
    prevIsMainApplicantRef.current = isMainApplicant;
  }, [isMainApplicant, setValue]);

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Main Applicant's Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>
                      {field.replace(/_/g, ' ')}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <Field
                type="radio"
                name="is_main_applicant"
                control={control}
                label="Are you or will you be the Main Applicant in any application?"
                required
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Person Completing Questionnaire Section (Only if NOT Main Applicant) */}
            {isMainApplicant === "No" && (
              <div className="space-y-6 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Insert the details of the person who is completing this Questionnaire</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Field
                    type="text"
                    name="completing_family_name"
                    control={control}
                    label="Family Name"
                    required
                    placeholder="Smith"
                  />

                  <Field
                    type="text"
                    name="completing_given_names"
                    control={control}
                    label="Given Names"
                    required
                    placeholder="John David"
                  />
                </div>

                <Field
                  type="text"
                  name="completing_preferred_names"
                  control={control}
                  label="Preferred Name(s)"
                  placeholder="John"
                />

                {/* Completing Person Gender */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Gender <span className="text-red-600">*</span>
                  </Label>
                  <RadioGroup
                    value={completingGender || ""}
                    onValueChange={(value) => setValue("completing_gender", value)}
                    className="flex gap-4"
                  >
                    {["Male", "Female"].map((genderOption) => (
                      <div key={genderOption} className="flex items-center">
                        <RadioGroupItem value={genderOption} id={`completing-gender-${genderOption.toLowerCase()}`} />
                        <Label htmlFor={`completing-gender-${genderOption.toLowerCase()}`} className="ml-2 cursor-pointer font-normal">
                          {genderOption}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {errors.completing_gender && (
                    <p className="text-sm text-red-600 mt-1">{errors.completing_gender.message}</p>
                  )}
                </div>

                {/* Completing Person Date of Birth */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date of Birth <span className="text-red-600">*</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="completing_birth_day" className="text-xs text-gray-600">Day</Label>
                      <Select
                        value={completingBirthDay || ""}
                        onValueChange={(value) => setValue("completing_birth_day", value)}
                      >
                        <SelectTrigger id="completing_birth_day" data-testid="select-completing-birth-day">
                          <SelectValue placeholder="Choose Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.completing_birth_day && (
                        <p className="text-sm text-red-600 mt-1">{errors.completing_birth_day.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="completing_birth_month" className="text-xs text-gray-600">Month</Label>
                      <Select
                        value={completingBirthMonth || ""}
                        onValueChange={(value) => setValue("completing_birth_month", value)}
                      >
                        <SelectTrigger id="completing_birth_month" data-testid="select-completing-birth-month">
                          <SelectValue placeholder="Choose Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.completing_birth_month && (
                        <p className="text-sm text-red-600 mt-1">{errors.completing_birth_month.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="completing_birth_year" className="text-xs text-gray-600">Year</Label>
                      <Select
                        value={completingBirthYear || ""}
                        onValueChange={(value) => setValue("completing_birth_year", value)}
                      >
                        <SelectTrigger id="completing_birth_year" data-testid="select-completing-birth-year">
                          <SelectValue placeholder="Choose Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.completing_birth_year && (
                        <p className="text-sm text-red-600 mt-1">{errors.completing_birth_year.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Applicant's Personal Details Section */}
            {(isMainApplicant === "Yes" || isMainApplicant === "No") && (
              <div className="space-y-6 pt-6 border-t border-gray-200">
                {/* Instructional Note (shown only when No is selected) */}
                {isMainApplicant === "No" && (
                  <p className="text-sm text-gray-600 italic mb-4">
                    When entering information into this Questionnaire, ensure that the details which are entered are from the point of view of the <strong>Main Applicant</strong>.
                  </p>
                )}
                <h2 className="text-lg font-medium text-gray-900">Main Applicant's Personal Details</h2>

                {/* Prefix/Title - Radio Group */}
                <div className="hidden">
                  <Label className="text-sm font-medium mb-2 block">Prefix/Title</Label>
                  <RadioGroup
                    value={prefix || ""}
                    onValueChange={(value) => setValue("prefix", value)}
                    className="flex flex-wrap gap-4"
                  >
                    {["Mr", "Mrs", "Miss", "Ms", "Dr", "Other"].map((prefix) => (
                      <div key={prefix} className="flex items-center">
                        <RadioGroupItem value={prefix} id={`prefix-${prefix.toLowerCase()}`} />
                        <Label htmlFor={`prefix-${prefix.toLowerCase()}`} className="ml-2 cursor-pointer font-normal">
                          {prefix}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {errors.prefix && (
                    <p className="text-sm text-red-600 mt-1">{errors.prefix.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Field
                    type="text"
                    name="family_name"
                    control={control}
                    label="Family Name"
                    required={isMainApplicant === "Yes"}
                    placeholder="Smith"
                  />

                  <Field
                    type="text"
                    name="given_names"
                    control={control}
                    label="Given Names"
                    required={isMainApplicant === "Yes"}
                    placeholder="John David"
                  />
                </div>

                <Field
                  type="text"
                  name="preferred_names"
                  control={control}
                  label="Preferred Name(s)"
                  placeholder="John"
                />

                {/* Gender - Radio Group */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Gender {isMainApplicant === "Yes" && <span className="text-red-600">*</span>}
                  </Label>
                  <RadioGroup
                    value={gender || ""}
                    onValueChange={(value) => setValue("gender", value)}
                    className="flex gap-4"
                  >
                    {["Male", "Female"].map((gender) => (
                      <div key={gender} className="flex items-center">
                        <RadioGroupItem value={gender} id={`gender-${gender.toLowerCase()}`} />
                        <Label htmlFor={`gender-${gender.toLowerCase()}`} className="ml-2 cursor-pointer font-normal">
                          {gender}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {errors.gender && (
                    <p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>
                  )}
                </div>

                {/* Date of Birth - Three Dropdowns */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Date of Birth {isMainApplicant === "Yes" && <span className="text-red-600">*</span>}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="birth_day" className="text-xs text-gray-600">Day</Label>
                      <Select
                        value={birthDay || ""}
                        onValueChange={(value) => setValue("birth_day", value)}
                      >
                        <SelectTrigger id="birth_day" data-testid="select-birth-day">
                          <SelectValue placeholder="Choose Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.birth_day && (
                        <p className="text-sm text-red-600 mt-1">{errors.birth_day.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="birth_month" className="text-xs text-gray-600">Month</Label>
                      <Select
                        value={birthMonth || ""}
                        onValueChange={(value) => setValue("birth_month", value)}
                      >
                        <SelectTrigger id="birth_month" data-testid="select-birth-month">
                          <SelectValue placeholder="Choose Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.birth_month && (
                        <p className="text-sm text-red-600 mt-1">{errors.birth_month.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="birth_year" className="text-xs text-gray-600">Year</Label>
                      <Select
                        value={birthYear || ""}
                        onValueChange={(value) => setValue("birth_year", value)}
                      >
                        <SelectTrigger id="birth_year" data-testid="select-birth-year">
                          <SelectValue placeholder="Choose Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.birth_year && (
                        <p className="text-sm text-red-600 mt-1">{errors.birth_year.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Field
                    type="select"
                    name="country_of_birth"
                    control={control}
                    label="Country of Birth"
                    required={isMainApplicant === "Yes"}
                    options={COUNTRIES.map(country => ({ value: country, label: country }))}
                  />

                  <Field
                    type="text"
                    name="suburb_of_birth"
                    control={control}
                    label="Suburb of Birth"
                    placeholder="Westminster"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Field
                    type="text"
                    name="city_of_birth"
                    control={control}
                    label="City/Town of Birth"
                    placeholder="London"
                  />

                  <Field
                    type="text"
                    name="state_of_birth"
                    control={control}
                    label="State/Province of Birth"
                    placeholder="Greater London"
                  />
                </div>

                <Field
                  type="select"
                  name="marital_status"
                  control={control}
                  label="What is your marital status?"
                  required={isMainApplicant === "Yes"}
                  options={[
                    { value: "Never Married or been in a De Facto Relationship", label: "Never Married or been in a De Facto Relationship" },
                    { value: "Married", label: "Married" },
                    { value: "De Facto", label: "De Facto" },
                    { value: "Divorced", label: "Divorced" },
                    { value: "Widowed", label: "Widowed" },
                    { value: "Separated", label: "Separated" },
                  ]}
                />

                {maritalStatus && maritalStatus !== "Never Married or been in a De Facto Relationship" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {maritalStatus === "Married" && "Date of Marriage"}
                      {maritalStatus === "De Facto" && "Date De Facto Relationship Began"}
                      {maritalStatus === "Divorced" && "Date of Divorce"}
                      {maritalStatus === "Widowed" && "Date of Death of Spouse"}
                      {maritalStatus === "Separated" && "Date of Separation"} <span className="text-red-600">*</span>
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="marital_status_date_day" className="text-xs text-gray-600">Day</Label>
                        <Select
                          value={maritalStatusDateDay || ""}
                          onValueChange={(value) => setValue("marital_status_date_day", value)}
                        >
                          <SelectTrigger id="marital_status_date_day" data-testid="select-marital-status-date-day">
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {days.map((day) => (
                              <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.marital_status_date_day && (
                          <p className="text-sm text-red-600 mt-1">{errors.marital_status_date_day.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="marital_status_date_month" className="text-xs text-gray-600">Month</Label>
                        <Select
                          value={maritalStatusDateMonth || ""}
                          onValueChange={(value) => setValue("marital_status_date_month", value)}
                        >
                          <SelectTrigger id="marital_status_date_month" data-testid="select-marital-status-date-month">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month, idx) => (
                              <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.marital_status_date_month && (
                          <p className="text-sm text-red-600 mt-1">{errors.marital_status_date_month.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="marital_status_date_year" className="text-xs text-gray-600">Year</Label>
                        <Select
                          value={maritalStatusDateYear || ""}
                          onValueChange={(value) => setValue("marital_status_date_year", value)}
                        >
                          <SelectTrigger id="marital_status_date_year" data-testid="select-marital-status-date-year">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.marital_status_date_year && (
                          <p className="text-sm text-red-600 mt-1">{errors.marital_status_date_year.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
