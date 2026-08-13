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
import { getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
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
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { showCompletionIssuesToast } from "@/lib/temporaryWorkCompletionUi";

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

const employmentHistoryDialogSchema = z.object({
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  position: z.string().optional(),
  business_name: z.string().optional(),
  business_address_street: z.string().optional(),
  business_address_street_line2: z.string().optional(),
  business_address_suburb: z.string().optional(),
  business_address_state: z.string().optional(),
  business_address_postcode: z.string().optional(),
  main_duties: z.string().optional(),
  occupied_time: z.string().optional(),
  financial_support: z.string().optional(),
  country: z.string().min(1, "Country is required"),
}).superRefine((data, ctx) => {
  const employmentStatuses = ["Employed", "Self-Employed", "Work Experience/Internships", "Unpaid Employment/Volunteer"];
  if (employmentStatuses.includes(data.status) && (!data.position || data.position.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Position is required for this status",
      path: ["position"],
    });
  }
});

function EmploymentHistoryDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(employmentHistoryDialogSchema),
    defaultValues: editingRow || {
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      status: "",
      position: "",
      business_name: "",
      business_address_street: "",
      business_address_street_line2: "",
      business_address_suburb: "",
      business_address_state: "",
      business_address_postcode: "",
      main_duties: "",
      occupied_time: "",
      financial_support: "",
      country: "",
    },
  });

  const status = dialogForm.watch("status");
  const isEmploymentStatus = status === "Employed" || status === "Self-Employed" ||
    status === "Work Experience/Internships" || status === "Unpaid Employment/Volunteer";
  const isNonEmploymentStatus = status === "Student" || status === "Retired" || status === "Unemployed";

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
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      <div>
        <Label className="mb-2 block">Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
          >
            <SelectTrigger data-testid="select-date-from-day"><SelectValue placeholder="Day" /></SelectTrigger>
            <SelectContent>{DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value)}
          >
            <SelectTrigger data-testid="select-date-from-month"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>{MONTHS.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}</SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value)}
          >
            <SelectTrigger data-testid="select-date-from-year"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>{YEARS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Date To (leave blank if ongoing)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
          >
            <SelectTrigger data-testid="select-date-to-day"><SelectValue placeholder="Day" /></SelectTrigger>
            <SelectContent>{DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_month")}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value)}
          >
            <SelectTrigger data-testid="select-date-to-month"><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>{MONTHS.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}</SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_to_year")}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value)}
          >
            <SelectTrigger data-testid="select-date-to-year"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>{YEARS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
        <Select
          value={dialogForm.watch("status")}
          onValueChange={(value) => dialogForm.setValue("status", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-status">
            <SelectValue placeholder="Choose Status" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_STATUS_OPTIONS.map((statusOption) => (
              <SelectItem key={statusOption} value={statusOption}>{statusOption}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.status.message}</p>
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

      {isEmploymentStatus && (
        <>
          <div>
            <Label htmlFor="position">Position <span className="text-red-500">*</span></Label>
            <Input id="position" {...dialogForm.register("position")} data-testid="input-position" />
            {dialogForm.formState.errors.position && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.position.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="business_name">Business Name</Label>
            <Input id="business_name" {...dialogForm.register("business_name")} data-testid="input-business-name" />
          </div>

          <div>
            <Label className="mb-2 block">Business Address</Label>
            <div className="space-y-2">
              <Input id="business_address_street" {...dialogForm.register("business_address_street")} placeholder="Street Number and Name" />
              <Input id="business_address_suburb" {...dialogForm.register("business_address_suburb")} placeholder="Suburb/Town/City" />
              <Input id="business_address_state" {...dialogForm.register("business_address_state")} placeholder="State" />
              <Input id="business_address_postcode" {...dialogForm.register("business_address_postcode")} placeholder="Postcode" />
            </div>
          </div>

          <div>
            <Label htmlFor="main_duties">Main Duties</Label>
            <Textarea id="main_duties" {...dialogForm.register("main_duties")} rows={3} />
          </div>
        </>
      )}

      {isNonEmploymentStatus && (
        <>
          <div>
            <Label htmlFor="occupied_time">Detail how you occupied your time</Label>
            <Textarea id="occupied_time" {...dialogForm.register("occupied_time")} rows={3} />
          </div>
          <div>
            <Label htmlFor="financial_support">Detail how you financially supported yourself</Label>
            <Textarea id="financial_support" {...dialogForm.register("financial_support")} rows={3} />
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-[#4F726B] hover:bg-[#4F726B] text-white" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MainApplicantEmploymentPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const visaType = getVisaTypeFromPath(pathname);

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

  const form = useForm({
    defaultValues: {
      is_currently_employed: "no",
      current_employer: "",
      current_position: "",
      current_country: "",
      current_start_date_day: "",
      current_start_date_month: "",
      current_start_date_year: "",
      current_employment_type: "",
      current_address: "",
      employment_history: [],
    }
  });

  const isCurrentlyEmployed = String(form.watch("is_currently_employed") || "no").toLowerCase();
  const employmentHistory = form.watch("employment_history") || [];

  useEffect(() => {
    const savedData = profileId
      ? draftSnap.draft?.profiles_data?.[profileId]?.employment || {}
      : draftSnap.draft?.partner_employment || draftStore.getSectionData('mainApplicant.employment') || {};

    if (savedData && Object.keys(savedData).length > 0) {
      const isEmployedNorm = savedData.is_currently_employed || (savedData.currently_employed === "Yes" ? "yes" : savedData.currently_employed === "No" ? "no" : "no");
      form.reset({
        is_currently_employed: isEmployedNorm,
        current_employer: savedData.current_employer || "",
        current_position: savedData.current_position || "",
        current_country: savedData.current_country || "",
        current_start_date_day: savedData.current_start_date_day || "",
        current_start_date_month: savedData.current_start_date_month || "",
        current_start_date_year: savedData.current_start_date_year || "",
        current_employment_type: savedData.current_employment_type || "",
        current_address: savedData.current_address || "",
        employment_history: savedData.employment_history || [],
      });
    }
  }, [draftSnap.draft?.profiles_data, profileId, form]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = form.getValues();
      const result = profileId
        ? await draftStore.saveProfileSectionData(profileId, "employment", formData)
        : await draftStore.saveSectionData("mainApplicant.employment", formData);

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
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const result = profileId
        ? await draftStore.saveProfileSectionData(profileId, "employment", data)
        : await draftStore.saveSectionData("mainApplicant.employment", data);

      if (result.success) {
        const completionResult = profileId
          ? await draftStore.markProfilePageComplete(profileId, `${visaType}/main-applicant/employment`)
          : await draftStore.markPageComplete(`${visaType}/main-applicant/employment`);

        if (completionResult && !completionResult.success) {
          showCompletionIssuesToast(toast, completionResult);
          return;
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
    } finally {
      setIsSaving(false);
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
                <div className="mt-6 space-y-6 p-6 bg-gray-50/50 rounded-xl border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="current_employer" className="text-sm font-medium">
                        Employer/Organization Name
                      </Label>
                      <Input
                        id="current_employer"
                        {...form.register("current_employer")}
                        placeholder="Enter employer or organization name"
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_position" className="text-sm font-medium">
                        Position/Occupation
                      </Label>
                      <Input
                        id="current_position"
                        {...form.register("current_position")}
                        placeholder="Enter your current position"
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Country</Label>
                      <Select
                        value={form.watch("current_country")}
                        onValueChange={(value) => form.setValue("current_country", value)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose Country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Employment Type</Label>
                      <Select
                        value={form.watch("current_employment_type")}
                        onValueChange={(value) => form.setValue("current_employment_type", value)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose Employment Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Date Started</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Select
                        value={form.watch("current_start_date_day")}
                        onValueChange={(value) => form.setValue("current_start_date_day", value)}
                      >
                        <SelectTrigger className="bg-white text-xs sm:text-sm">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day) => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={form.watch("current_start_date_month")}
                        onValueChange={(value) => form.setValue("current_start_date_month", value)}
                      >
                        <SelectTrigger className="bg-white text-xs sm:text-sm">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={form.watch("current_start_date_year")}
                        onValueChange={(value) => form.setValue("current_start_date_year", value)}
                      >
                        <SelectTrigger className="bg-white text-xs sm:text-sm">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_address" className="text-sm font-medium">
                      Current Workplace Address
                    </Label>
                    <Input
                      id="current_address"
                      {...form.register("current_address")}
                      placeholder="Street, City, State, Postcode"
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Q2: Employment History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment History</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter details of all of your employment and unemployment since birth. There can be no gaps in dates.
              </p>
              <RepeaterTable
                data={employmentHistory}
                columns={[
                  { key: "date_from_day", label: "Date From", format: (row) => row.date_from_day ? `${row.date_from_day} ${row.date_from_month} ${row.date_from_year}` : row.date_from || "" },
                  { key: "date_to_day", label: "Date To", format: (row) => row.date_to_day ? `${row.date_to_day} ${row.date_to_month} ${row.date_to_year}` : row.date_to || "Ongoing" },
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
          </div>

          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            saveLabel="Save draft"
            nextLabel="Continue"
            loading={isSaving}
          />
        </form>
      </CardContent>
    </Card>
  );
}
