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
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";

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
    duties: z.string().optional(),
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
    }
  });

  const status = dialogForm.watch("status");

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <form onSubmit={dialogForm.handleSubmit(handleSubmit)} className="space-y-4">
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

      <div>
        <Label htmlFor="city" className="mb-2 block">City/Town</Label>
        <Input
          id="city"
          {...dialogForm.register("city")}
          data-testid="input-city"
        />
      </div>

      <div>
        <Label htmlFor="duties" className="mb-2 block">Duties/Notes</Label>
        <Textarea
          id="duties"
          {...dialogForm.register("duties")}
          rows={3}
          data-testid="textarea-duties"
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-[#285646] hover:bg-[#1e4136] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
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
  const stillWorking = form.watch("still_working");
  const employmentHistory = form.watch("employment_history") || [];

  useEffect(() => {
    const savedData = draft.temporary_work_employment || {};
    if (Object.keys(savedData).length > 0) {
      form.reset(savedData);
    }
  }, []);

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
    await draftStore.markPageComplete(`${visaType}/main-applicant/employment`, null, "temporary_work_employment");
    
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
      <StickyNav 
        title="Employment"
        description="In this section, provide details about the main applicant's employment history."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
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
                    <h3 className="text-lg font-semibold text-gray-900">Current Job</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="current_employer" className="mb-2 block">Employer/Organization *</Label>
                        <Input
                          id="current_employer"
                          {...form.register("current_employer")}
                          data-testid="input-current-employer"
                        />
                      </div>

                      <div>
                        <Label htmlFor="current_position" className="mb-2 block">Position/Job Title *</Label>
                        <Input
                          id="current_position"
                          {...form.register("current_position")}
                          data-testid="input-current-position"
                        />
                      </div>

                      <div>
                        <Label className="mb-2 block">Country *</Label>
                        <Select
                          value={form.watch("current_country")}
                          onValueChange={(value) => form.setValue("current_country", value)}
                        >
                          <SelectTrigger data-testid="select-current-country">
                            <SelectValue placeholder="Choose Country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="mb-2 block">Start Date *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={form.watch("current_start_date_day")}
                            onValueChange={(value) => form.setValue("current_start_date_day", value)}
                          >
                            <SelectTrigger data-testid="select-current-start-day">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS.map((day) => (
                                <SelectItem key={day} value={day}>{day}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={form.watch("current_start_date_month")}
                            onValueChange={(value) => form.setValue("current_start_date_month", value)}
                          >
                            <SelectTrigger data-testid="select-current-start-month">
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month) => (
                                <SelectItem key={month} value={month}>{month}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={form.watch("current_start_date_year")}
                            onValueChange={(value) => form.setValue("current_start_date_year", value)}
                          >
                            <SelectTrigger data-testid="select-current-start-year">
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
                    </div>

                    <div>
                      <Label className="text-base font-medium mb-3 block">
                        Still working here? *
                      </Label>
                      <RadioGroup
                        value={stillWorking}
                        onValueChange={(value) => form.setValue("still_working", value)}
                        className="flex gap-4"
                        data-testid="radio-still-working"
                      >
                        <div className="flex items-center">
                          <RadioGroupItem value="yes" id="still-working-yes" />
                          <Label htmlFor="still-working-yes" className="ml-2 cursor-pointer font-normal">
                            Yes
                          </Label>
                        </div>
                        <div className="flex items-center">
                          <RadioGroupItem value="no" id="still-working-no" />
                          <Label htmlFor="still-working-no" className="ml-2 cursor-pointer font-normal">
                            No
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {stillWorking === "no" && (
                      <div>
                        <Label className="mb-2 block">End Date *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={form.watch("current_end_date_day")}
                            onValueChange={(value) => form.setValue("current_end_date_day", value)}
                          >
                            <SelectTrigger data-testid="select-current-end-day">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS.map((day) => (
                                <SelectItem key={day} value={day}>{day}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={form.watch("current_end_date_month")}
                            onValueChange={(value) => form.setValue("current_end_date_month", value)}
                          >
                            <SelectTrigger data-testid="select-current-end-month">
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month) => (
                                <SelectItem key={month} value={month}>{month}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={form.watch("current_end_date_year")}
                            onValueChange={(value) => form.setValue("current_end_date_year", value)}
                          >
                            <SelectTrigger data-testid="select-current-end-year">
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
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">Employment Type</Label>
                        <Select
                          value={form.watch("current_employment_type")}
                          onValueChange={(value) => form.setValue("current_employment_type", value)}
                        >
                          <SelectTrigger data-testid="select-employment-type">
                            <SelectValue placeholder="Choose Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="current_address" className="mb-2 block">Address</Label>
                        <Input
                          id="current_address"
                          {...form.register("current_address")}
                          data-testid="input-current-address"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Q2: Employment History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment History (last 5 years)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter details of your employment history for the previous 5 years
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
                    form.setValue("employment_history", updated);
                  }}
                  onEdit={(index, updatedRow) => {
                    const updated = [...employmentHistory];
                    updated[index] = updatedRow;
                    form.setValue("employment_history", updated);
                  }}
                  onDelete={(index) => {
                    const updated = employmentHistory.filter((_, i) => i !== index);
                    form.setValue("employment_history", updated);
                  }}
                  DialogComponent={EmploymentHistoryDialog}
                  addButtonText="Add"
                  testIdPrefix="employment"
                />
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                data-testid="button-previous"
              >
                Previous
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  data-testid="button-save"
                >
                  Save
                </Button>
                <Button
                  type="submit"
                  className="bg-[#285646] hover:bg-[#1e4136] text-white"
                  data-testid="button-continue"
                >
                  Continue
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
