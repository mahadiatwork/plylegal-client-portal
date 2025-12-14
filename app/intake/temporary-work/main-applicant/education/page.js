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

const QUALIFICATION_LEVELS = [
  "Secondary",
  "Diploma/Certificate",
  "Bachelor's",
  "Master's",
  "Doctorate/PhD",
  "Other"
];

const STUDY_MODES = ["Full-time", "Part-time"];

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
    institution: z.string().min(1, "Institution name is required"),
    country: z.string().min(1, "Country is required"),
    qualification: z.string().min(1, "Qualification is required"),
    field: z.string().min(1, "Field of study is required"),
    date_from_day: z.string().min(1, "Day is required"),
    date_from_month: z.string().min(1, "Month is required"),
    date_from_year: z.string().min(1, "Year is required"),
    date_to_day: z.string().min(1, "Day is required"),
    date_to_month: z.string().min(1, "Month is required"),
    date_to_year: z.string().min(1, "Year is required"),
    study_mode: z.string().min(1, "Study mode is required"),
    graduated: z.enum(["yes", "no"]),
    certificate_number: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      institution: "",
      country: "",
      qualification: "",
      field: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      study_mode: "",
      graduated: "no",
      certificate_number: "",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="institution" className="mb-2 block">Institution Name *</Label>
        <Input
          id="institution"
          {...dialogForm.register("institution")}
          data-testid="input-institution"
        />
        {dialogForm.formState.errors.institution && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.institution.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Country *</Label>
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

      <div>
        <Label className="mb-2 block">Qualification/Level *</Label>
        <Select
          value={dialogForm.watch("qualification")}
          onValueChange={(value) => dialogForm.setValue("qualification", value)}
        >
          <SelectTrigger data-testid="select-qualification">
            <SelectValue placeholder="Choose Qualification" />
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

      <div>
        <Label htmlFor="field" className="mb-2 block">Field of Study *</Label>
        <Input
          id="field"
          {...dialogForm.register("field")}
          data-testid="input-field"
        />
        {dialogForm.formState.errors.field && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.field.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Date From *</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
          >
            <SelectTrigger data-testid="select-date-from-day">
              <SelectValue placeholder="Day" />
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
              <SelectValue placeholder="Month" />
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
              <SelectValue placeholder="Year" />
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

      <div>
        <Label className="mb-2 block">Date To *</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
          >
            <SelectTrigger data-testid="select-date-to-day">
              <SelectValue placeholder="Day" />
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
              <SelectValue placeholder="Month" />
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
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Study Mode *</Label>
        <Select
          value={dialogForm.watch("study_mode")}
          onValueChange={(value) => dialogForm.setValue("study_mode", value)}
        >
          <SelectTrigger data-testid="select-study-mode">
            <SelectValue placeholder="Choose Study Mode" />
          </SelectTrigger>
          <SelectContent>
            {STUDY_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>{mode}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.study_mode && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.study_mode.message}</p>
        )}
      </div>

      <div>
        <Label className="text-base font-medium mb-3 block">
          Graduated/Completed? *
        </Label>
        <RadioGroup
          value={dialogForm.watch("graduated")}
          onValueChange={(value) => dialogForm.setValue("graduated", value)}
          className="flex gap-4"
          data-testid="radio-graduated"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="graduated-yes" />
            <Label htmlFor="graduated-yes" className="ml-2 cursor-pointer font-normal">
              Yes
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="graduated-no" />
            <Label htmlFor="graduated-no" className="ml-2 cursor-pointer font-normal">
              No
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="certificate_number" className="mb-2 block">Document/Certificate Number</Label>
        <Input
          id="certificate_number"
          {...dialogForm.register("certificate_number")}
          data-testid="input-certificate-number"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={dialogForm.handleSubmit(handleSubmit)}
          className="bg-[#285646] hover:bg-[#1e4136] text-white"
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const draft = draftSnap.draft;

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftStore.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams]);

  const form = useForm({
    defaultValues: {
      has_secondary_education: "no",
      education_history: [],
    }
  });

  const hasSecondaryEducation = form.watch("has_secondary_education");
  const educationHistory = form.watch("education_history") || [];

  useEffect(() => {
    const savedData = draft.temporary_work_education || {};
    if (Object.keys(savedData).length > 0) {
      form.reset(savedData);
    }
  }, [draft.temporary_work_education, form]);

  const handleSave = async () => {
    const formData = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_education", formData);

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
    await draftStore.saveSectionData("temporary_work_education", data);
    const visaType = getVisaTypeFromPath(pathname);
    draftStore.markPageComplete(`${visaType}/main-applicant/education`);

    const nextRoute = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
    if (nextRoute) {
      router.push(nextRoute);
    }
  };

  const handlePrevious = () => {
    const visaType = getVisaTypeFromPath(pathname);
    const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
    if (previousRoute) {
      router.push(previousRoute);
    }
  };

  return (
    <div className="min-h-screen bg-[#E0E7FF]">


      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
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
                        { key: "field", label: "Field" },
                        { key: "date_from_day", label: "From", format: (row) => `${row.date_from_day}/${row.date_from_month}/${row.date_from_year}` },
                        { key: "date_to_day", label: "To", format: (row) => `${row.date_to_day}/${row.date_to_month}/${row.date_to_year}` },
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
        </div>
      </div>
    </div>
  );
}
