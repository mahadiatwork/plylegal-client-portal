"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
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
const OUTCOMES = ["Granted", "Pending", "Refused", "Withdrawn"];
function VisaDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    visa_country: z.string().optional(),
    visa_type: z.string().min(1, "Visa Type is required"),
    linked_passport: z.string().optional(),
    visa_conditions: z.string().optional(),
    application_date_day: z.string().min(1, "Day is required"),
    application_date_month: z.string().min(1, "Month is required"),
    application_date_year: z.string().min(1, "Year is required"),
    application_reference_number: z.string().optional(),
    outcome: z.string().min(1, "Outcome is required"),
    // Granted-specific
    date_granted_day: z.string().optional(),
    date_granted_month: z.string().optional(),
    date_granted_year: z.string().optional(),
    expiry_date_day: z.string().optional(),
    expiry_date_month: z.string().optional(),
    expiry_date_year: z.string().optional(),
    place_of_issue: z.string().optional(),
    visa_number: z.string().optional(),
    cancelled: z.string().optional(), // "yes" | "no"
    // Decision date / details (used for refused / withdrawn, and when cancelled = yes)
    decision_date_day: z.string().optional(),
    decision_date_month: z.string().optional(),
    decision_date_year: z.string().optional(),
    decision_details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      visa_country: "",
      visa_type: "",
      linked_passport: "",
      visa_conditions: "",
      application_date_day: "",
      application_date_month: "",
      application_date_year: "",
      application_reference_number: "",
      outcome: "",
      date_granted_day: "",
      date_granted_month: "",
      date_granted_year: "",
      expiry_date_day: "",
      expiry_date_month: "",
      expiry_date_year: "",
      place_of_issue: "",
      visa_number: "",
      cancelled: "",
      decision_date_day: "",
      decision_date_month: "",
      decision_date_year: "",
      decision_details: "",
    }
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  const outcome = dialogForm.watch("outcome");
  const cancelled = dialogForm.watch("cancelled");
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Visa Application</h3>
      <p className="text-sm text-gray-500 mb-4">Enter details of the Visa applied for or held by you</p>
      {/* Visa Country */}
      {/* <div>
        <Label className="mb-2 block">Visa Country</Label>
        <Select
          value={dialogForm.watch("visa_country")}
          onValueChange={(value) => dialogForm.setValue("visa_country", value)}
        >
          <SelectTrigger data-testid="select-visa-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.visa_country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.visa_country.message}</p>
        )}
      </div> */}
      {/* Visa Type */}
      <div>
        <Label htmlFor="visa_type" className="mb-2 block">Visa Type</Label>
        <Input
          id="visa_type"
          {...dialogForm.register("visa_type")}
          data-testid="input-visa-type"
        />
        {dialogForm.formState.errors.visa_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.visa_type.message}</p>
        )}
      </div>
      {/* Linked Passport */}
      <div>
        <Label htmlFor="linked_passport" className="mb-2 block">Linked Passport</Label>
        <Input
          id="linked_passport"
          {...dialogForm.register("linked_passport")}
          data-testid="input-linked-passport"
        />
      </div>
      {/* Visa Conditions */}
      <div>
        <Label htmlFor="visa_conditions" className="mb-2 block">Visa Conditions</Label>
        <Textarea
          id="visa_conditions"
          {...dialogForm.register("visa_conditions")}
          rows={3}
          data-testid="textarea-visa-conditions"
        />
      </div>
      {/* Application Date */}
      <div>
        <Label className="mb-2 block">Application Date</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("application_date_day")}
            onValueChange={(value) => dialogForm.setValue("application_date_day", value)}
          >
            <SelectTrigger data-testid="select-app-date-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("application_date_month")}
            onValueChange={(value) => dialogForm.setValue("application_date_month", value)}
          >
            <SelectTrigger data-testid="select-app-date-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("application_date_year")}
            onValueChange={(value) => dialogForm.setValue("application_date_year", value)}
          >
            <SelectTrigger data-testid="select-app-date-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.application_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.application_date_day.message}</p>
        )}
      </div>
      {/* TRN */}
      <div>
        <Label htmlFor="application_reference_number" className="mb-2 block">Application Reference Number (TRN)</Label>
        <Input
          id="application_reference_number"
          {...dialogForm.register("application_reference_number")}
          data-testid="input-trn"
        />
      </div>
      <div className="pt-4 pb-2">
        <h3 className="text-base font-bold text-gray-900 mb-2">Application Outcome</h3>
        <p className="text-sm text-gray-500 mb-4">Enter details on the outcome of the Visa application</p>
        <Label className="mb-2 block">Outcome</Label>
        <Select
          value={dialogForm.watch("outcome")}
          onValueChange={(value) => dialogForm.setValue("outcome", value)}
        >
          <SelectTrigger data-testid="select-outcome">
            <SelectValue placeholder="Choose Outcome" />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.outcome && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.outcome.message}</p>
        )}
      </div>
      {/* Outcome details - Granted */}
      {outcome === "Granted" && (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Date Granted</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("date_granted_day")}
                onValueChange={(value) => dialogForm.setValue("date_granted_day", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_granted_month")}
                onValueChange={(value) => dialogForm.setValue("date_granted_month", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("date_granted_year")}
                onValueChange={(value) => dialogForm.setValue("date_granted_year", value)}
              >
                <SelectTrigger>
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
          <div>
            <Label className="mb-2 block">Expiry Date</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("expiry_date_day")}
                onValueChange={(value) => dialogForm.setValue("expiry_date_day", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("expiry_date_month")}
                onValueChange={(value) => dialogForm.setValue("expiry_date_month", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("expiry_date_year")}
                onValueChange={(value) => dialogForm.setValue("expiry_date_year", value)}
              >
                <SelectTrigger>
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
          <div>
            <Label htmlFor="place_of_issue" className="mb-2 block">Place of Issue</Label>
            <Input
              id="place_of_issue"
              {...dialogForm.register("place_of_issue")}
            />
          </div>
          <div>
            <Label htmlFor="visa_number" className="mb-2 block">Visa Number</Label>
            <Input
              id="visa_number"
              {...dialogForm.register("visa_number")}
            />
          </div>
          <div>
            <Label className="mb-2 block">Has this Visa ever been cancelled?</Label>
            <RadioGroup
              value={cancelled}
              onValueChange={(value) => dialogForm.setValue("cancelled", value)}
            >
              <div className="flex gap-4">
                {["yes", "no"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`cancelled-${option}`} />
                    <Label htmlFor={`cancelled-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        </div>
      )}
      {/* Decision date and details for Refused / Withdrawn, and when cancelled = yes */}
      {(outcome === "Refused" || outcome === "Withdrawn" || cancelled === "yes") && (
        <div className="space-y-4 pt-4">
          <div>
            <Label className="mb-2 block">Decision Date</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("decision_date_day")}
                onValueChange={(value) => dialogForm.setValue("decision_date_day", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("decision_date_month")}
                onValueChange={(value) => dialogForm.setValue("decision_date_month", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("decision_date_year")}
                onValueChange={(value) => dialogForm.setValue("decision_date_year", value)}
              >
                <SelectTrigger>
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
          <div>
            <Label htmlFor="decision_details" className="mb-2 block">Enter details</Label>
            <Textarea
              id="decision_details"
              {...dialogForm.register("decision_details")}
              rows={3}
            />
          </div>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={dialogForm.handleSubmit(handleSubmit)}
          className="bg-[#4F726B] hover:bg-[#4F726B] text-white"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function buildApplicantOptions(draft) {
  const profiles = draft?.profiles || [];
  if (profiles.length > 0) {
    return profiles.map((p) => ({
      id: p.id,
      label: `${p.given_names || ""} ${p.family_name || ""}`.trim() || "Unnamed",
    }));
  }
  const main = draft?.temporary_work_details;
  if (main) {
    return [
      {
        id: "legacy_main",
        label: `${main.given_names || ""} ${main.family_name || ""}`.trim() || "Main applicant",
      },
    ];
  }
  return [];
}

const visaGrantEntrySchema = z.object({
  applicantId: z.string().min(1, "Please select the person this visa grant number relates to"),
  grantNumber: z.string().trim().min(1, "Australian visa grant number is required"),
  history: z.array(z.any()).optional(),
});

const formSchema = z
  .object({
    has_australian_visa_grant_number: z.enum(["yes", "no"], {
      required_error: "Please indicate whether any applicants have an Australian visa grant number",
    }),
    visa_grant_entries: z.array(visaGrantEntrySchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.has_australian_visa_grant_number === "yes" &&
      (!Array.isArray(data.visa_grant_entries) || data.visa_grant_entries.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please add at least one visa grant number entry",
        path: ["visa_grant_entries"],
      });
    }
  });

function normalizeVisaGrantEntries(savedData) {
  let entries = Array.isArray(savedData?.visa_grant_entries)
    ? savedData.visa_grant_entries.map((entry) => ({
        applicantId: entry?.applicantId || "",
        grantNumber: entry?.grantNumber || entry?.visa_grant_number || "",
        history: Array.isArray(entry?.history) ? entry.history : [],
      }))
    : [];

  return entries;
}

function normalizeVisaGrantPayload(data) {
  const has_australian_visa_grant_number = String(
    data?.has_australian_visa_grant_number || "no"
  ).toLowerCase();

  return {
    has_australian_visa_grant_number:
      has_australian_visa_grant_number === "yes" ? "yes" : "no",
    visa_grant_entries:
      has_australian_visa_grant_number === "yes"
        ? (data?.visa_grant_entries || []).map((entry) => ({
            applicantId: entry?.applicantId || "",
            grantNumber: entry?.grantNumber || "",
            history: Array.isArray(entry?.history) ? entry.history : [],
          }))
        : [],
  };
}



export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);

  const applicantOptions = useMemo(
    () => buildApplicantOptions(draftSnap.draft),
    [draftSnap.draft]
  );

  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      has_australian_visa_grant_number: "no",
      visa_grant_entries: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "visa_grant_entries",
  });

  useEffect(() => {
    const draft = draftSnap.draft;
    const savedData = draft?.temporary_work_visas || {};
    const hasSavedChoice = String(savedData?.has_australian_visa_grant_number || "").toLowerCase();
    const visa_grant_entries = normalizeVisaGrantEntries(savedData);
    const has_australian_visa_grant_number =
      hasSavedChoice === "yes" || hasSavedChoice === "no"
        ? hasSavedChoice
        : visa_grant_entries.length > 0
          ? "yes"
          : "no";

    reset({
      has_australian_visa_grant_number,
      visa_grant_entries,
    });
  }, [draftSnap.draft?.temporary_work_visas, draftSnap.draft?.profiles, draftSnap.draft?.temporary_work_details, reset]);

  const hasAustralianVisaGrantNumber = watch("has_australian_visa_grant_number");

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const payload = normalizeVisaGrantPayload(data);
      await draftStore.saveSectionData("temporary_work_visas", payload);
      await draftStore.markPageComplete(`${visaType}/all-applicants/visas`, null, "temporary_work_visas");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      startNavigation(next);
      if (next) router.push(next);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    startNavigation(prev);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values = normalizeVisaGrantPayload(watch());
      const result = await draftStore.saveSectionData("temporary_work_visas", values);
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
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">All Applicants&apos; Visas</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          In this section, provide details of any Australian visa grant numbers held by any applicants included in this
          application.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Do any applicants included in this application have an Australian visa grant number?</Label>
              <RadioGroup
                value={hasAustralianVisaGrantNumber}
                onValueChange={(value) => setValue("has_australian_visa_grant_number", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`australian-visa-grant-${option}`} data-testid={`radio-australian-visa-grant-${option}`} />
                      <Label htmlFor={`australian-visa-grant-${option}`}>
                        {option === "yes" ? "Yes" : "No"}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {errors.has_australian_visa_grant_number?.message && (
                <p className="text-sm text-red-600 mt-1">{errors.has_australian_visa_grant_number.message}</p>
              )}
            </div>

            {hasAustralianVisaGrantNumber === "yes" && (
              <>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-card border border-border rounded-lg p-6 space-y-6 relative group"
                  >
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}

                    {applicantOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Add applicants on the Application Profile page to answer this section.
                      </p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Person the visa relates to</Label>
                          <Select
                            value={watch(`visa_grant_entries.${index}.applicantId`)}
                            onValueChange={(val) => setValue(`visa_grant_entries.${index}.applicantId`, val, { shouldDirty: true, shouldValidate: true })}
                          >
                            <SelectTrigger data-testid={`select-visa-applicant-${index}`}>
                              <SelectValue placeholder="Choose applicant" />
                            </SelectTrigger>
                            <SelectContent>
                              {applicantOptions.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.visa_grant_entries?.[index]?.applicantId?.message && (
                            <p className="text-sm text-red-600 mt-1">{errors.visa_grant_entries[index].applicantId.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`visa_grant_number-${index}`}>Australian Visa Grant Number</Label>
                          <Input
                            id={`visa_grant_number-${index}`}
                            {...register(`visa_grant_entries.${index}.grantNumber`)}
                            placeholder="e.g. 1234567890"
                            data-testid={`input-visa-grant-number-${index}`}
                          />
                          {errors.visa_grant_entries?.[index]?.grantNumber?.message && (
                            <p className="text-sm text-red-600 mt-1">{errors.visa_grant_entries[index].grantNumber.message}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {errors.visa_grant_entries?.message && (
                  <p className="text-sm text-red-600">{errors.visa_grant_entries.message}</p>
                )}

                {applicantOptions.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-6 border-dashed border-2 hover:bg-slate-50 flex items-center justify-center gap-2 group"
                    onClick={() => append({ applicantId: applicantOptions[0].id, grantNumber: "", history: [] })}
                  >
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="font-semibold text-gray-600">Add Applicant Visa Record</span>
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold text-white bg-[#4F726B] rounded-full uppercase tracking-wider">
                      New
                    </span>
                  </Button>
                )}
              </>
            )}

            <FormNavigation
              onPrev={handlePrevious}
              onNext={handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={isSaving}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
