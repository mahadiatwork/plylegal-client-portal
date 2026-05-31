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
          className="bg-[#022C22] hover:bg-[#022C22] text-white"
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
    defaultValues: {
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
    const opts = buildApplicantOptions(draft);
    const mainId =
      draft?.profiles?.find((p) => p.relationship === "main_applicant")?.id || "legacy_main";

    let visa_grant_entries = Array.isArray(savedData.visa_grant_entries)
      ? [...savedData.visa_grant_entries]
      : [];

    if (visa_grant_entries.length === 0 && (savedData.has_aus_visa_history || savedData.visa_grant_number)) {
      visa_grant_entries = [
        {
          applicantId: mainId,
          hasGrantNumber: savedData.has_aus_visa_history === "yes",
          grantNumber: savedData.visa_grant_number || "",
          history: [],
        },
      ];
    }

    const byId = new Map(visa_grant_entries.map((e) => [e.applicantId, e]));
    
    // We only force-add if the list was empty and we have options
    if (visa_grant_entries.length === 0 && opts.length > 0) {
      visa_grant_entries = [
        { applicantId: opts[0].id, hasGrantNumber: false, grantNumber: "", history: [] }
      ];
    }

    reset({ visa_grant_entries });
  }, [draftSnap.draft?.temporary_work_visas, draftSnap.draft?.profiles, draftSnap.draft?.temporary_work_details, reset]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("temporary_work_visas", data);
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
      const values = watch();
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
            {fields.map((field, index) => (
              <div key={field.id} className="bg-card border border-border rounded-lg p-6 space-y-6 relative group">
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
                      <Label>Applicant</Label>
                      <Select
                        value={watch(`visa_grant_entries.${index}.applicantId`)}
                        onValueChange={(val) => setValue(`visa_grant_entries.${index}.applicantId`, val, { shouldDirty: true })}
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
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Do any family members included in this application have an Australian visa grant number from a
                        previous visa application?
                      </Label>
                      <RadioGroup
                        value={watch(`visa_grant_entries.${index}.hasGrantNumber`) ? "yes" : "no"}
                        onValueChange={(value) => {
                          setValue(`visa_grant_entries.${index}.hasGrantNumber`, value === "yes", { shouldDirty: true });
                          if (value !== "yes") {
                            setValue(`visa_grant_entries.${index}.grantNumber`, "", { shouldDirty: true });
                          }
                        }}
                      >
                        <div className="flex gap-4">
                          {["yes", "no"].map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`aus-visa-${field.id}-${option}`} />
                              <Label htmlFor={`aus-visa-${field.id}-${option}`}>
                                {option === "yes" ? "Yes" : "No"}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {watch(`visa_grant_entries.${index}.hasGrantNumber`) ? (
                      <div className="space-y-2">
                        <Label htmlFor={`visa_grant_number-${index}`}>Visa Grant Number</Label>
                        <p className="text-sm text-gray-500">
                          Enter the grant number for the applicant selected above.
                        </p>
                        <Input
                          id={`visa_grant_number-${index}`}
                          {...register(`visa_grant_entries.${index}.grantNumber`)}
                          placeholder="e.g. 1234567890"
                          data-testid={`input-visa-grant-number-${index}`}
                        />
                      </div>
                    ) : (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Visa History</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Enter details of all Australian Visas applied for or held by this person
                        </p>
                        <RepeaterTable
                          data={watch(`visa_grant_entries.${index}.history`) || []}
                          columns={[
                            { 
                              key: "applicantId", 
                              label: "Applicant", 
                              format: () => applicantOptions.find(a => a.id === watch(`visa_grant_entries.${index}.applicantId`))?.label || "Unknown" 
                            },
                            // { key: "visa_country", label: "Country" },
                            { key: "visa_type", label: "Type" },
                            { key: "linked_passport", label: "Linked Passport" },
                            { key: "decision_date_year", label: "Decision Date" },
                            { key: "outcome", label: "Outcome" },
                            { key: "cancelled", label: "Cancelled" },
                          ]}
                          onAdd={(newRow) => {
                            const history = watch(`visa_grant_entries.${index}.history`) || [];
                            setValue(`visa_grant_entries.${index}.history`, [...history, newRow], { shouldDirty: true });
                          }}
                          onEdit={(idx, updatedRow) => {
                            const history = [...(watch(`visa_grant_entries.${index}.history`) || [])];
                            history[idx] = updatedRow;
                            setValue(`visa_grant_entries.${index}.history`, history, { shouldDirty: true });
                          }}
                          onDelete={(idx) => {
                            const history = (watch(`visa_grant_entries.${index}.history`) || []).filter((_, i) => i !== idx);
                            setValue(`visa_grant_entries.${index}.history`, history, { shouldDirty: true });
                          }}
                          DialogComponent={VisaDialog}
                          addButtonText="Add Visa"
                          testIdPrefix={`visa-${index}`}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {applicantOptions.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full py-6 border-dashed border-2 hover:bg-slate-50 flex items-center justify-center gap-2 group"
                onClick={() => append({ applicantId: applicantOptions[0].id, hasGrantNumber: false, grantNumber: "", history: [] })}
              >
                <Plus className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="font-semibold text-gray-600">Add Applicant Visa Record</span>
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold text-white bg-[#022C22] rounded-full uppercase tracking-wider">
                  New
                </span>
              </Button>
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