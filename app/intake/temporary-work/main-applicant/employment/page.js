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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const EMPLOYMENT_STATUS_OPTIONS = [
  "Employed",
  "Student",
  "Retired",
  "Self-Employed",
  "Unemployed",
  "Work Experience/Internships",
  "Unpaid Employment/Volunteer"
];

const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Self-Employed"
];

const POSITION_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Casual"
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

function EmploymentHistoryDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    date_from_day: z.string().min(1, "Day is required"),
    date_from_month: z.string().min(1, "Month is required"),
    date_from_year: z.string().min(1, "Year is required"),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    status: z.string().min(1, "Status is required"),
    position: z.string().optional(),
    employer: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    city: z.string().optional(),
    duties: z.string().max(300, "Duties must be 300 characters or less").optional(),
    is_current_employment: z.string().optional(),
    position_type: z.string().optional(),
    is_related_to_nominated_position: z.string().optional(),
    visa_held: z.string().optional(),
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
      status: "",
      position: "",
      employer: "",
      country: "",
      city: "",
      duties: "",
      is_current_employment: "",
      position_type: "",
      is_related_to_nominated_position: "",
      visa_held: "",
    }
  });

  const draftSnap = useSnapshot(draftStore);
  const visaContext = draftSnap.visaContext || '482';
  const status = dialogForm.watch("status");
  const country = dialogForm.watch("country");

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium mb-3 block">
          Is this applicant's current employment situation?
        </Label>
        <RadioGroup
          value={dialogForm.watch("is_current_employment")}
          onValueChange={(value) => dialogForm.setValue("is_current_employment", value)}
          className="flex gap-4"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="current-yes" />
            <Label htmlFor="current-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="current-no" />
            <Label htmlFor="current-no" className="ml-2 cursor-pointer font-normal">No</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="mb-2 block">Date From</Label>
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
        <Label className="mb-2 block">Date To (leave blank if ongoing)</Label>
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
      </div>

      <div>
        <Label className="mb-2 block">Status *</Label>
        <Select
          value={dialogForm.watch("status")}
          onValueChange={(value) => dialogForm.setValue("status", value)}
        >
          <SelectTrigger data-testid="select-status">
            <SelectValue placeholder="Choose Status" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.status.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Position Type</Label>
        <Select
          value={dialogForm.watch("position_type")}
          onValueChange={(value) => dialogForm.setValue("position_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {POSITION_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(status === "Employed" || status === "Self-Employed") && (
        <div>
          <Label htmlFor="position" className="mb-2 block">Position / Occupation *</Label>
          <Input
            id="position"
            {...dialogForm.register("position")}
            data-testid="input-position"
          />
        </div>
      )}

      <div>
        <Label htmlFor="employer" className="mb-2 block">Employer/Organization</Label>
        <Input
          id="employer"
          {...dialogForm.register("employer")}
          data-testid="input-employer"
        />
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

      {visaContext === '186' && country === 'Australia' && (
        <div>
          <Label htmlFor="visa_held" className="mb-2 block">What visa(s) were held during this period?</Label>
          <Textarea
            id="visa_held"
            {...dialogForm.register("visa_held")}
            rows={2}
            data-testid="textarea-visa-held"
            placeholder="e.g., Subclass 482 Temporary Skill Shortage visa"
          />
        </div>
      )}

      <div>
        <Label htmlFor="city" className="mb-2 block">City/Town</Label>
        <Input
          id="city"
          {...dialogForm.register("city")}
          data-testid="input-city"
        />
      </div>

      <div>
        <Label htmlFor="duties" className="mb-2 block">Duties/Notes <span className="text-sm font-normal text-gray-500">(max 300 characters)</span></Label>
        <Textarea
          id="duties"
          {...dialogForm.register("duties")}
          rows={3}
          maxLength={300}
          data-testid="textarea-duties"
        />
        <p className="text-xs text-gray-500 mt-1 text-right">{(dialogForm.watch("duties") || "").length}/300 characters</p>
        {dialogForm.formState.errors.duties && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.duties.message}</p>
        )}
      </div>

      <div>
        <Label className="text-base font-medium mb-3 block">
          Is this employment related to the nominated position?
        </Label>
        <RadioGroup
          value={dialogForm.watch("is_related_to_nominated_position")}
          onValueChange={(value) => dialogForm.setValue("is_related_to_nominated_position", value)}
          className="flex gap-4"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="related-yes" />
            <Label htmlFor="related-yes" className="ml-2 cursor-pointer font-normal">Yes</Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="related-no" />
            <Label htmlFor="related-no" className="ml-2 cursor-pointer font-normal">No</Label>
          </div>
        </RadioGroup>
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
    </div >
  );
}

export default function EmploymentPage() {
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
      is_currently_employed: "no",
      current_employer: "",
      current_position: "",
      current_country: "",
      current_start_date_day: "",
      current_start_date_month: "",
      current_start_date_year: "",
      still_working: "yes",
      current_end_date_day: "",
      current_end_date_month: "",
      current_end_date_year: "",
      current_employment_type: "",
      current_address: "",
      employment_history: [],
    }
  });

  const isCurrentlyEmployed = form.watch("is_currently_employed");
  const employmentHistory = form.watch("employment_history") || [];

  useEffect(() => {
    const savedData = draft.temporary_work_employment || {};
    if (Object.keys(savedData).length > 0) {
      form.reset(savedData);
    }
  }, [draft.temporary_work_employment, form]);

  const handleSave = async () => {
    const formData = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_employment", formData);

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
    await draftStore.saveSectionData("temporary_work_employment", data);
    const visaType = getVisaTypeFromPath(pathname);
    draftStore.markPageComplete(`${visaType}/main-applicant/employment`);

    const nextRoute = getNextRoute(pathname, visaType, draftStore.currentApplicationId, draftStore.visaContext);
    if (nextRoute) {
      router.push(nextRoute);
    }
  };

  const handlePrevious = () => {
    const visaType = getVisaTypeFromPath(pathname);
    const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId, draftStore.visaContext);
    if (previousRoute) {
      router.push(previousRoute);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Main Applicant's Employment</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          In this section, provide details about the main applicant&apos;s employment history.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-8">
            {/* Q1: Are you currently Employed in a paid position? */}
            <div>
              <Label className="text-base font-medium mb-3 block">
                Are you currently Employed in a paid position?
              </Label>
              <RadioGroup
                value={isCurrentlyEmployed}
                onValueChange={(value) => form.setValue("is_currently_employed", value)}
                className="flex gap-4"
                data-testid="radio-currently-employed"
              >
                <div className="flex items-center" data-testid="radio-currently-employed-yes">
                  <RadioGroupItem value="yes" id="employed-yes" />
                  <Label htmlFor="employed-yes" className="ml-2 cursor-pointer font-normal">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center" data-testid="radio-currently-employed-no">
                  <RadioGroupItem value="no" id="employed-no" />
                  <Label htmlFor="employed-no" className="ml-2 cursor-pointer font-normal">
                    No
                  </Label>
                </div>
              </RadioGroup>

              {/* Current Job Fields (shown if Yes) */}
              {isCurrentlyEmployed === "yes" && (
                <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-md">

                </div>
              )}
            </div>
          </div>

          {/* Q2: Employment History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment History (last {draftSnap.visaContext === '186' ? '10' : '5'} years)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter details of your employment history for the previous {draftSnap.visaContext === '186' ? '10' : '5'} years
            </p>
            <RepeaterTable
              data={employmentHistory}
              columns={[
                { key: "date_from_day", label: "Date From", format: (row) => `${row.date_from_day} ${row.date_from_month} ${row.date_from_year}` },
                { key: "date_to_day", label: "Date To", format: (row) => row.date_to_day ? `${row.date_to_day} ${row.date_to_month} ${row.date_to_year}` : "Ongoing" },
                { key: "status", label: "Status" },
                { key: "position", label: "Position" },
                { key: "country", label: "Country" },
              ]}
              onAdd={(newRow) => {
                const updated = [...employmentHistory, newRow];
                form.setValue("employment_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              }}
              onEdit={(index, updatedRow) => {
                const updated = [...employmentHistory];
                updated[index] = updatedRow;
                form.setValue("employment_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              }}
              onDelete={(index) => {
                const updated = employmentHistory.filter((_, i) => i !== index);
                form.setValue("employment_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              }}
              DialogComponent={EmploymentHistoryDialog}
              addButtonText="Add"
              testIdPrefix="employment"
            />
          </div>

          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            saveLabel="Save draft"
            nextLabel="Continue"
            loading={draftSnap.isSaving}
          />
        </form>
      </CardContent>
    </Card>
  );
}
