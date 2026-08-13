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
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { getContinuousHistoryIssues, getProtectionHistoryDate } from "@/lib/protectionHistoryCoverage";

const EMPLOYMENT_STATUS_OPTIONS = [
  "Employed",
  "Student",
  "Retired",
  "Self-Employed",
  "Unemployed",
  "Work Experience/Internships",
  "Unpaid Employment/Volunteer"
];
const STATUSES_WITH_EMPLOYER_DETAILS = new Set([
  "Employed",
  "Self-Employed",
  "Work Experience/Internships",
  "Unpaid Employment/Volunteer",
]);

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
const YEARS = Array.from({ length: 130 }, (_, i) => String(new Date().getFullYear() - i));

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
    employer_address: z.string().optional(),
    duties: z.string().trim().max(300, "Duties must be 300 characters or less").optional(),
    country: z.string().min(1, "Country is required"),
  }).superRefine((data, ctx) => {
    const hasDateTo = [data.date_to_day, data.date_to_month, data.date_to_year].filter(Boolean).length;
    if (hasDateTo > 0 && hasDateTo < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["date_to_day"], message: "Complete all Date To fields or leave them blank." });
    }

    if (hasDateTo === 3) {
      const from = getProtectionHistoryDate(data.date_from_day, data.date_from_month, data.date_from_year);
      const to = getProtectionHistoryDate(data.date_to_day, data.date_to_month, data.date_to_year);
      if (!to || !from || to < from) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["date_to_day"], message: "Date To cannot be before Date From." });
      }
    }

    if (STATUSES_WITH_EMPLOYER_DETAILS.has(data.status)) {
      [
        ["employer", "Employer is required"],
        ["employer_address", "Employer address is required"],
        ["duties", "Duties are required"],
      ].forEach(([field, message]) => {
        if (!data[field]?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
        }
      });
    }
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
      employer_address: "",
      duties: "",
      country: "",
    }
  });

  const status = dialogForm.watch("status");
  const needsEmployerDetails = STATUSES_WITH_EMPLOYER_DETAILS.has(status);

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <form onSubmit={dialogForm.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
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
        {dialogForm.formState.errors.date_to_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_to_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Status</Label>
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

      {needsEmployerDetails && (
        <>
          <div>
            <Label htmlFor="employer" className="mb-2 block">Employer <span className="text-red-500">*</span></Label>
            <Input id="employer" {...dialogForm.register("employer")} data-testid="input-employer" />
            {dialogForm.formState.errors.employer && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.employer.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="employer_address" className="mb-2 block">Employer Address <span className="text-red-500">*</span></Label>
            <Input id="employer_address" {...dialogForm.register("employer_address")} data-testid="input-employer-address" />
            {dialogForm.formState.errors.employer_address && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.employer_address.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="duties" className="mb-2 block">Duties <span className="text-red-500">*</span></Label>
            <Textarea id="duties" maxLength={300} {...dialogForm.register("duties")} data-testid="input-duties" />
            <p className="text-xs text-gray-500 mt-1">{(dialogForm.watch("duties") || "").length}/300 characters</p>
            {dialogForm.formState.errors.duties && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.duties.message}</p>
            )}
          </div>
        </>
      )}

      <div>
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-[#4F726B] hover:bg-[#4F726B] text-white" data-testid="button-ok">Ok</Button>
      </DialogFooter>
    </form>
  );
}

export default function EmploymentPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const draft = draftSnap.draft;
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      current_employment_type: "",
      current_address: "",
      employment_history: [],
    }
  });

  const isCurrentlyEmployed = String(form.watch("is_currently_employed") || "no").toLowerCase();
  const employmentHistory = form.watch("employment_history") || [];

  const activeProfile = draft?.profiles?.find((profile) =>
    profileId ? String(profile.id) === String(profileId) : profile.relationship === "main_applicant"
  );
  const mainApplicant = profileId
    ? draft?.profiles_data?.[profileId]?.details || {}
    : draft?.protection_details || {};
  const mainApplicantName = mainApplicant.given_names
    ? `${mainApplicant.given_names} ${mainApplicant.family_name || ''}`.trim()
    : [activeProfile?.given_names, activeProfile?.family_name].filter(Boolean).join(" ") || "Main Applicant";
  const birthDate = getProtectionHistoryDate(
    mainApplicant.birth_day || activeProfile?.birth_day,
    mainApplicant.birth_month || activeProfile?.birth_month,
    mainApplicant.birth_year || activeProfile?.birth_year
  );

  useEffect(() => {
    const savedData = draft?.protection_employment || {};
    if (Object.keys(savedData).length > 0) {
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
  }, [draft?.protection_employment, form]);

  const updateEmploymentHistory = (newHistory) => {
    form.setValue("employment_history", newHistory, { shouldDirty: true });
    form.clearErrors("employment_history");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = form.getValues();
      const result = await draftStore.saveSectionData("protection_employment", formData);

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
    } catch (error) {
      console.error("Error saving:", error);
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    if (!birthDate) {
      const message = "Complete the main applicant's date of birth before submitting employment history.";
      form.setError("employment_history", { type: "manual", message });
      toast({ title: "Date of birth is required", description: message, variant: "destructive" });
      return;
    }

    const incompleteEmployerEntry = data.employment_history?.find((row) =>
      STATUSES_WITH_EMPLOYER_DETAILS.has(row.status) &&
      (!row.employer?.trim() || !row.employer_address?.trim() || !row.duties?.trim() || row.duties.length > 300)
    );
    if (incompleteEmployerEntry) {
      const message = "Each employment entry needs an employer, employer address and duties of 300 characters or less.";
      form.setError("employment_history", { type: "manual", message });
      toast({ title: "Employment details are required", description: message, variant: "destructive" });
      return;
    }

    const coverageIssues = getContinuousHistoryIssues(data.employment_history, {
      startDate: birthDate,
      label: "Employment history",
    });
    if (coverageIssues.length) {
      form.setError("employment_history", { type: "manual", message: coverageIssues[0] });
      toast({ title: "Employment history needs attention", description: coverageIssues[0], variant: "destructive" });
      return;
    }

    form.clearErrors("employment_history");
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_employment", data);
      const visaType = getVisaTypeFromPath(pathname);
      if (profileId) { await draftStore.markProfilePageComplete(profileId, `${visaType}/main-applicant/employment`); } else { await draftStore.markPageComplete(`${visaType}/main-applicant/employment`); }
      const nextRoute = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
      if (nextRoute) {
        startNavigation(nextRoute);
        router.push(nextRoute);
      }
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    const visaType = getVisaTypeFromPath(pathname);
    const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Employment History for the Main Applicant ({mainApplicantName})
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter all employment, unemployment, study and other activities since birth. There can be no gaps in dates.
              </p>
              <RepeaterTable
                data={employmentHistory}
                columns={[
                  { key: "date_from_day", label: "Date From", format: (row) => `${row.date_from_day} ${row.date_from_month} ${row.date_from_year}` },
                  { key: "date_to_day", label: "Date To", format: (row) => (row.date_to_day && row.date_to_month && row.date_to_year) ? `${row.date_to_day} ${row.date_to_month} ${row.date_to_year}` : "" },
                  { key: "status", label: "Status" },
                  { key: "position", label: "Position" },
                  { key: "employer", label: "Employer" },
                  { key: "country", label: "Country" },
                ]}
                onAdd={(newRow) => {
                  updateEmploymentHistory([...employmentHistory, newRow]);
                }}
                onEdit={(index, updatedRow) => {
                  const updated = [...employmentHistory];
                  updated[index] = updatedRow;
                  updateEmploymentHistory(updated);
                }}
                onDelete={(index) => {
                  const updated = employmentHistory.filter((_, i) => i !== index);
                  updateEmploymentHistory(updated);
                }}
                DialogComponent={EmploymentHistoryDialog}
                addButtonText="Add"
                testIdPrefix="employment"
              />
              {form.formState.errors.employment_history && (
                <p className="text-sm text-red-600 mt-2">{form.formState.errors.employment_history.message}</p>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t">
            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              loading={isSaving}
              submitting={isSubmitting}
              disabledNext={!form.formState.isValid}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
