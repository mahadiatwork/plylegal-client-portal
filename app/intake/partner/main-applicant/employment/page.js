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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { employmentSchema } from "@/lib/validation";
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

const EMPLOYMENT_STATUS_OPTIONS = [
  "Employed",
  "Student",
  "Retired",
  "Self-Employed",
  "Unemployed",
  "Work Experience/Internships",
  "Unpaid Employment/Volunteer"
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

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
  // If status is employment-related, position is required
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

      {/* Fields for Employed, Self-Employed, Work Experience/Internships, Unpaid Employment/Volunteer */}
      {isEmploymentStatus && (
        <>
          <div>
            <Label htmlFor="position">Position <span className="text-red-500">*</span></Label>
            <Input
              id="position"
              {...dialogForm.register("position")}
              data-testid="input-position"
            />
            {dialogForm.formState.errors.position && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.position.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              {...dialogForm.register("business_name")}
              data-testid="input-business-name"
            />
          </div>

          <div>
            <Label className="mb-2 block">Business Address</Label>
            <div className="space-y-2">
              <Input
                id="business_address_street"
                {...dialogForm.register("business_address_street")}
                placeholder="Address (including Street Number and Name)"
                data-testid="input-business-address-street"
              />
              <Input
                id="business_address_street_line2"
                {...dialogForm.register("business_address_street_line2")}
                placeholder="Street Line 2"
                data-testid="input-business-address-street-line2"
              />
              <Input
                id="business_address_suburb"
                {...dialogForm.register("business_address_suburb")}
                placeholder="Suburb/Town/City"
                data-testid="input-business-address-suburb"
              />
              <Input
                id="business_address_state"
                {...dialogForm.register("business_address_state")}
                placeholder="State"
                data-testid="input-business-address-state"
              />
              <Input
                id="business_address_postcode"
                {...dialogForm.register("business_address_postcode")}
                placeholder="Postcode"
                data-testid="input-business-address-postcode"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="main_duties">Enter details of the main duties performed in this position</Label>
            <Textarea
              id="main_duties"
              {...dialogForm.register("main_duties")}
              rows={4}
              data-testid="textarea-main-duties"
            />
          </div>
        </>
      )}

      {/* Fields for Student, Retired, Unemployed */}
      {isNonEmploymentStatus && (
        <>
          <div>
            <Label htmlFor="occupied_time">Detail how you occupied your time</Label>
            <Textarea
              id="occupied_time"
              {...dialogForm.register("occupied_time")}
              rows={4}
              data-testid="textarea-occupied-time"
            />
          </div>

          <div>
            <Label htmlFor="financial_support">Detail how you financially supported yourself</Label>
            <Textarea
              id="financial_support"
              {...dialogForm.register("financial_support")}
              rows={4}
              data-testid="textarea-financial-support"
            />
          </div>
        </>
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

export default function MainApplicantEmploymentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();

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
  const sectionData = draftStore.getSectionData('mainApplicant.employment');

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(employmentSchema),
    mode: "onChange",
    defaultValues: {
      currently_employed: sectionData.currently_employed || "",
      employment_history: sectionData.employment_history || [],
    },
  });

  // Watch form values for conditional rendering
  const currentlyEmployed = watch("currently_employed");
  const employmentHistory = watch("employment_history") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('mainApplicant.employment', watchedValues);
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
      const result = await draftStore.saveSectionData('mainApplicant.employment', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/employment');
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
      const result = await draftStore.saveSectionData('mainApplicant.employment', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/employment');
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

  const updateEmploymentHistory = (newHistory) => {
    setValue("employment_history", newHistory, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.employment', { ...currentData, employment_history: newHistory });
  };

  const employmentColumns = [
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
    { key: "status", label: "Status" },
    { key: "position", label: "Position" },
    { key: "country", label: "Country" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Employment</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about the main applicant's employment.
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

            {/* Question 1: Are you currently Employed in a paid position? */}
            <div>
              <Field
                type="radio"
                name="currently_employed"
                control={control}
                label="Are you currently Employed in a paid position?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
            </div>

            {/* Question 2: Employment History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Employment History</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter details of all of your employment and unemployment since birth
              </p>
              <RepeaterTable
                data={employmentHistory}
                columns={employmentColumns}
                onAdd={(row) => updateEmploymentHistory([...employmentHistory, row])}
                onEdit={(index, row) => {
                  const updated = [...employmentHistory];
                  updated[index] = row;
                  updateEmploymentHistory(updated);
                }}
                onDelete={(index) => {
                  const updated = employmentHistory.filter((_, i) => i !== index);
                  updateEmploymentHistory(updated);
                }}
                DialogComponent={EmploymentHistoryDialog}
                addButtonText="Add"
                testIdPrefix="employment"
                dialogTitle="Employment History"
                dialogSubtitle="Enter details of all of your employment and unemployment since birth"
                dialogClassName="max-w-4xl w-[90vw] max-h-[98vh] bg-white overflow-y-auto"
              />
            </div>

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
