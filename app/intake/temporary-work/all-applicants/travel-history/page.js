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

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i));

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

const REASONS = [
  "Employment", "Study", "To visit parent", "To visit family", "To visit partner", "To visit friend", "Holiday/Leisure", "Business", "Military deployment", "Other"
];

const LEGAL_STATUSES = [
  "Citizen", "Permanent Resident", "Temporary Resident", "Student", "Visitor", "Work Visa", "Other"
];

function TravelDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    country: z.string().min(1, "Country is required"),
    is_current_location: z.enum(["Yes", "No"]).optional(),
    reason_for_visit: z.string().min(1, "Reason is required"),
    legal_status: z.string().min(1, "Legal Status is required"),

    date_arrived_day: z.string().min(1, "Day is required"),
    date_arrived_month: z.string().min(1, "Month is required"),
    date_arrived_year: z.string().min(1, "Year is required"),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      country: "",
      is_current_location: "",
      reason_for_visit: "",
      legal_status: "",
      date_arrived_day: "",
      date_arrived_month: "",
      date_arrived_year: "",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Travel History</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of their current location and of previous travel including travel for work, study, holiday, leisure,
        business, military deployments and visits back to their own country:
      </p>

      {/* Country */}
      <div>
        <Label className="mb-2 block">Country</Label>
        <Input
          {...dialogForm.register("country")}
          placeholder="Choose Country"
          data-testid="input-country"
        />
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      {/* Current Location */}
      <div>
        <Label className="mb-2 block">Is this the applicant&#39;s current location?</Label>
        <div className="flex gap-4">
          {["Yes", "No"].map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Button
                type="button"
                variant={dialogForm.watch("is_current_location") === option ? "default" : "outline"}
                onClick={() => dialogForm.setValue("is_current_location", option)}
                className="h-8 w-16"
              >
                {option}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <Label className="mb-2 block">Reason for being in this Country</Label>
        <Select
          value={dialogForm.watch("reason_for_visit")}
          onValueChange={(value) => dialogForm.setValue("reason_for_visit", value)}
        >
          <SelectTrigger data-testid="select-reason">
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.reason_for_visit && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.reason_for_visit.message}</p>
        )}
      </div>

      {/* Legal Status */}
      <div>
        <Label className="mb-2 block">Legal Status in this Country</Label>
        <Select
          value={dialogForm.watch("legal_status")}
          onValueChange={(value) => dialogForm.setValue("legal_status", value)}
        >
          <SelectTrigger data-testid="select-status">
            <SelectValue placeholder="Choose Status" />
          </SelectTrigger>
          <SelectContent>
            {LEGAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.legal_status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.legal_status.message}</p>
        )}
      </div>

      {/* Date Arrived - Conditional */}
      {dialogForm.watch("is_current_location") && (
        <div>
          <Label className="mb-2 block">Date Arrived</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_arrived_day")}
              onValueChange={(value) => dialogForm.setValue("date_arrived_day", value)}
            >
              <SelectTrigger data-testid="select-date-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_arrived_month")}
              onValueChange={(value) => dialogForm.setValue("date_arrived_month", value)}
            >
              <SelectTrigger data-testid="select-date-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_arrived_year")}
              onValueChange={(value) => dialogForm.setValue("date_arrived_year", value)}
            >
              <SelectTrigger data-testid="select-date-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.date_arrived_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_arrived_day.message}</p>
          )}
        </div>
      )}

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

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    defaultValues: {
      travelled_to_australia: "",
      travelled_internationally: "no",
      travel_history: [],
    },
  });

  const travelledInternationally = form.watch("travelled_internationally");
  const travelHistory = form.watch("travel_history") || [];

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_travel || {};
    if (Object.keys(savedData).length > 0) {
      const formData = {
        travelled_to_australia: savedData.travelled_to_australia || "",
        travelled_internationally: savedData.travelled_internationally || "no",
        travel_history: savedData.travel_history || [],
      };

      form.reset(formData);

      // Force update logic for radio persistence
      setTimeout(() => {
        form.setValue("travelled_internationally", savedData.travelled_internationally || "no");
        if (savedData.travelled_to_australia) {
          form.setValue("travelled_to_australia", savedData.travelled_to_australia);
        }
      }, 0);
    }
  }, [draftSnap.draft?.temporary_work_travel, form]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("temporary_work_travel", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/travel-history`, null, "temporary_work_travel");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      if (next) router.push(next);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values = form.getValues();
      const result = await draftStore.saveSectionData("temporary_work_travel", values);
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save draft",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Travel History</h1>
          <p className="text-muted-foreground mt-2">
            Provide information about your travel history.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">

            {/* Q1: Travelled to Australia */}
            <div className="space-y-2">
              <Label>Have you or any family member ever travelled to Australia?</Label>
              <RadioGroup
                value={form.watch("travelled_to_australia")}
                onValueChange={(value) => form.setValue("travelled_to_australia", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`australia-${option}`} data-testid={`radio-australia-${option}`} />
                      <Label htmlFor={`australia-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Q2: Travelled Internationally */}
            <div className="space-y-2">
              <Label>Have you or any family member travelled internationally in the last 10 years?</Label>
              <RadioGroup
                value={travelledInternationally}
                onValueChange={(value) => form.setValue("travelled_internationally", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`international-${option}`} data-testid={`radio-international-${option}`} />
                      <Label htmlFor={`international-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Repeater (shown if Yes) */}
            {travelledInternationally === "yes" && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Travel History Details</h3>
                <RepeaterTable
                  data={travelHistory}
                  columns={[
                    { key: "country", label: "Country" },
                    { key: "reason_for_visit", label: "Reason" },
                    { key: "date_arrived_year", label: "Year Arrived" },
                  ]}
                  onAdd={(newRow) => {
                    const updated = [...travelHistory, newRow];
                    form.setValue("travel_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }}
                  onEdit={(index, updatedRow) => {
                    const updated = [...travelHistory];
                    updated[index] = updatedRow;
                    form.setValue("travel_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }}
                  onDelete={(index) => {
                    const updated = travelHistory.filter((_, i) => i !== index);
                    form.setValue("travel_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }}
                  DialogComponent={TravelDialog}
                  addButtonText="Add Travel Entry"
                  testIdPrefix="travel"
                />
              </div>
            )}

            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={isSaving}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
