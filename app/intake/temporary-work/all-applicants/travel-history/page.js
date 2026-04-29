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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Check } from "lucide-react";

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
  "Work, study or training",
  "Business",
  "Visit Family",
  "Holiday or Leisure",
  "Military Deployment",
  "Other",
];
const LEGAL_STATUSES = [
  "Citizen",
  "Permanent Resident",
  "Temporary Resident",
  "Student",
  "Visitor/Tourist",
  "Work Visa",
  "Refugee",
  "Illegal Resident",
  "Asylum Applicant",
  "No Legal Status",
  "Other",
];

const formatDate = (day, month, year) => {
  if (!day || !month || !year) return "";
  return `${day} ${month} ${year}`;
};

/** Map legacy single-name rows to stable ids (profile id or legacy_name:…). */
function normalizeLegacyApplicantToken(rawName, profiles) {
  const original = String(rawName || "").trim();
  const name = original
    .replace(/\s*\(Spouse\/Partner\)\s*$/i, "")
    .replace(/\s*\(Child\)\s*$/i, "")
    .trim();
  const p = (profiles || []).find((pr) => {
    const fn = `${pr.given_names || ""} ${pr.family_name || ""}`.trim();
    return fn && fn === name;
  });
  if (p) return p.id;
  return `legacy_name:${original || name}`;
}

function migrateTravelRows(rows, profiles) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    if (Array.isArray(r.applicant_ids) && r.applicant_ids.length > 0) return r;
    if (r.applicant_name) {
      const id = normalizeLegacyApplicantToken(r.applicant_name, profiles);
      const { applicant_name, ...rest } = r;
      return { ...rest, applicant_ids: [id] };
    }
    return { ...r, applicant_ids: Array.isArray(r.applicant_ids) ? r.applicant_ids : [] };
  });
}

function applicantLabels(ids, profiles) {
  return (ids || [])
    .map((id) => {
      const s = String(id);
      if (s.startsWith("legacy_name:")) return s.slice("legacy_name:".length);
      const p = (profiles || []).find((pr) => pr.id === id);
      return p ? `${p.given_names || ""} ${p.family_name || ""}`.trim() || id : id;
    })
    .filter(Boolean)
    .join(", ");
}

// ─── MultiSelect Component ──────────────────────────────────────────
function ApplicantMultiSelect({ applicants, selectedIds, onToggle, error }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabels = applicants
    .filter((a) => selectedIds.includes(a.id))
    .map((a) => a.label);

  const displayText =
    selectedLabels.length === 0
      ? "Select Applicants"
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} Applicants Selected`;

  return (
    <div className="relative w-full">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between bg-white h-auto py-2 px-3 text-left font-normal"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="multi-select-trigger"
      >
        <span className="truncate pr-2 text-gray-700">{displayText}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white shadow-lg py-1 max-h-60 overflow-auto">
            {applicants.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No applicants found.</p>
            ) : (
              applicants.map((a) => (
                <div
                  key={a.id}
                  className="relative flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(a.id, !selectedIds.includes(a.id));
                  }}
                >
                  <Checkbox
                    id={`ms-applicant-${a.id}`}
                    checked={selectedIds.includes(a.id)}
                    className="mr-2 border-slate-300"
                  />
                  <span className="text-sm text-gray-700 truncate">{a.label}</span>
                  {selectedIds.includes(a.id) && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ─── Travel Dialog ────────────────────────────────────────────────────
function TravelDialog({ editingRow, onSave, onCancel, applicants = [], travelHistoryByKey = {} }) {
  const dialogFormSchema = z.object({
    applicant_ids: z.array(z.string()).min(1, "Select at least one applicant"),
    country: z.string().min(1, "Country is required"),
    is_current_location: z.enum(["Yes", "No"]).optional(),
    reason_for_visit: z.string().min(1, "Reason is required"),
    other_reason_details: z.string().optional(),
    legal_status: z.string().min(1, "Legal Status is required"),
    date_arrived_day: z.string().min(1, "Day is required"),
    date_arrived_month: z.string().min(1, "Month is required"),
    date_arrived_year: z.string().min(1, "Year is required"),
    departure_day: z.string().optional(),
    departure_month: z.string().optional(),
    departure_year: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      applicant_ids: [],
      country: "",
      is_current_location: "",
      reason_for_visit: "",
      legal_status: "",
      date_arrived_day: "",
      date_arrived_month: "",
      date_arrived_year: "",
      departure_day: "",
      departure_month: "",
      departure_year: "",
    }
  });

  useEffect(() => {
    if (editingRow) {
      dialogForm.reset({
        applicant_ids: Array.isArray(editingRow.applicant_ids) ? editingRow.applicant_ids : [],
        country: editingRow.country ?? "",
        is_current_location: editingRow.is_current_location ?? "",
        reason_for_visit: editingRow.reason_for_visit ?? "",
        other_reason_details: editingRow.other_reason_details ?? "",
        legal_status: editingRow.legal_status ?? "",
        date_arrived_day: editingRow.date_arrived_day ?? "",
        date_arrived_month: editingRow.date_arrived_month ?? "",
        date_arrived_year: editingRow.date_arrived_year ?? "",
        departure_day: editingRow.departure_day ?? "",
        departure_month: editingRow.departure_month ?? "",
        departure_year: editingRow.departure_year ?? "",
      });
    } else {
      dialogForm.reset({
        applicant_ids: [],
        country: "",
        is_current_location: "",
        reason_for_visit: "",
        other_reason_details: "",
        legal_status: "",
        date_arrived_day: "",
        date_arrived_month: "",
        date_arrived_year: "",
        departure_day: "",
        departure_month: "",
        departure_year: "",
      });
    }
  }, [editingRow, dialogForm]);

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  const isCurrentLocation = dialogForm.watch("is_current_location");
  const reasonForVisit = dialogForm.watch("reason_for_visit");
  const applicantIds = dialogForm.watch("applicant_ids") || [];

  const toggleApplicant = (id, checked) => {
    const next = checked
      ? [...applicantIds, id]
      : applicantIds.filter((x) => x !== id);
    dialogForm.setValue("applicant_ids", next, { shouldValidate: true });

    if (!editingRow && checked) {
      const key = [...next].sort().join("|");
      const existing = travelHistoryByKey[key];
      if (existing) {
        const fieldsToPrefill = [
          "country", "is_current_location", "reason_for_visit", "legal_status",
          "date_arrived_day", "date_arrived_month", "date_arrived_year",
          "departure_day", "departure_month", "departure_year",
        ];
        fieldsToPrefill.forEach((field) => {
          if (existing[field]) dialogForm.setValue(field, existing[field]);
        });
      }
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Add Travel Record</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of travel outside the usual country of residence, including travel for work, study, holiday,
        leisure, business, military deployments and visits back to own country.
      </p>

      {/* Applicant(s) — multi-select (profile ids) */}
      <div>
        <Label className="mb-2 block font-medium">Which applicant(s) does this travel apply to?</Label>
        <ApplicantMultiSelect
          applicants={applicants}
          selectedIds={applicantIds}
          onToggle={toggleApplicant}
          error={dialogForm.formState.errors.applicant_ids?.message}
        />
      </div>

      {/* Country */}
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

      {/* Current Location */}
      <div>
        <Label className="mb-2 block">Is this the main applicant&apos;s current location?</Label>
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

      {/* Other reason details - shown when "Other" is selected */}
      {reasonForVisit === "Other" && (
        <div>
          <Label className="mb-2 block">Please provide details</Label>
          <Textarea
            {...dialogForm.register("other_reason_details")}
            rows={3}
            placeholder="Please describe the reason for visiting this country..."
          />
        </div>
      )}

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

      {/* Date Arrived */}
      <div>
        <Label className="mb-2 block">Date Arrived</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_arrived_day")}
            onValueChange={(value) => dialogForm.setValue("date_arrived_day", value)}
          >
            <SelectTrigger data-testid="select-arrived-day">
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
            <SelectTrigger data-testid="select-arrived-month">
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
            <SelectTrigger data-testid="select-arrived-year">
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

      {/* Departure Date / Intended Departure Date */}
      <div>
        <Label className="mb-2 block">
          {isCurrentLocation === "Yes" ? "Intended Departure Date" : "Departure Date"}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("departure_day")}
            onValueChange={(value) => dialogForm.setValue("departure_day", value)}
          >
            <SelectTrigger data-testid="select-departure-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("departure_month")}
            onValueChange={(value) => dialogForm.setValue("departure_month", value)}
          >
            <SelectTrigger data-testid="select-departure-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("departure_year")}
            onValueChange={(value) => dialogForm.setValue("departure_year", value)}
          >
            <SelectTrigger data-testid="select-departure-year">
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

// ─── Main Page ────────────────────────────────────────────────────────
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
      has_travel_history: "",
      travel_history: [],
    },
  });

  const hasTravelHistory = form.watch("has_travel_history");
  const travelHistory = form.watch("travel_history") || [];

  const profiles = draftSnap.draft?.profiles || [];

  // ── Applicants: profile ids + labels (fallback to legacy section keys if no profiles) ──
  const applicants = useMemo(() => {
    if (profiles.length > 0) {
      return profiles.map((p) => ({
        id: p.id,
        label: `${p.given_names || ""} ${p.family_name || ""}`.trim() || "Applicant",
      }));
    }
    const list = [];
    const mainDetails = draftSnap.draft?.temporary_work_details;
    if (mainDetails?.given_names || mainDetails?.family_name) {
      list.push({
        id: "legacy_main",
        label: [mainDetails.given_names, mainDetails.family_name].filter(Boolean).join(" "),
      });
    }
    const spouseDetails = draftSnap.draft?.temporary_work_spouse_details;
    if (spouseDetails?.given_names || spouseDetails?.family_name) {
      list.push({
        id: "legacy_spouse",
        label: `${[spouseDetails.given_names, spouseDetails.family_name].filter(Boolean).join(" ")} (Spouse/Partner)`,
      });
    }
    const childrenData = draftSnap.draft?.temporary_work_children;
    if (childrenData?.children && Array.isArray(childrenData.children)) {
      childrenData.children
        .filter((child) => child.included_in_application === "Yes")
        .forEach((child, idx) => {
          const label = [child.given_names, child.family_name].filter(Boolean).join(" ");
          if (label.trim()) {
            list.push({ id: `legacy_child_${idx}`, label: `${label} (Child)` });
          }
        });
    }
    return list;
  }, [
    profiles,
    draftSnap.draft?.temporary_work_details,
    draftSnap.draft?.temporary_work_spouse_details,
    draftSnap.draft?.temporary_work_children,
  ]);

  const travelHistoryByKey = useMemo(() => {
    const map = {};
    travelHistory.forEach((entry) => {
      const ids = entry.applicant_ids;
      if (Array.isArray(ids) && ids.length > 0) {
        const key = [...ids].sort().join("|");
        map[key] = entry;
      }
    });
    return map;
  }, [travelHistory]);

  // ── Hydrate form from saved draft ────────────────────────────────────
  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_travel || {};
    if (Object.keys(savedData).length > 0) {
      const migrated = migrateTravelRows(savedData.travel_history || [], profiles);
      const formData = {
        has_travel_history:
          savedData.has_travel_history ??
          savedData.travelled_internationally ??
          "",
        travel_history: migrated,
      };
      form.reset(formData);
      setTimeout(() => {
        form.setValue(
          "has_travel_history",
          savedData.has_travel_history ??
          savedData.travelled_internationally ??
          ""
        );
      }, 0);
    }
  }, [draftSnap.draft?.temporary_work_travel, draftSnap.draft?.profiles, form, profiles]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("temporary_work_travel", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/travel-history`, null, "temporary_work_travel");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      if (next) router.push(next);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
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

  // ── Wrapped DialogComponent to inject applicants & prefill map ────────
  const TravelDialogWithApplicants = useMemo(
    () =>
      function WrappedTravelDialog(props) {
        return (
          <TravelDialog
            {...props}
            applicants={applicants}
            travelHistoryByKey={travelHistoryByKey}
          />
        );
      },
    [applicants, travelHistoryByKey]
  );

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Travel History</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          In the past 10 years since turning 16 years of age, have any of the applicants travelled outside their usual
          country of residence?
        </p>
        <ul className="text-sm text-gray-500 mt-2 list-disc pl-5 space-y-1">
          <li>work, study or training</li>
          <li>business</li>
          <li>holiday/leisure trips</li>
          <li>military deployment</li>
          <li>visits back to your own country</li>
        </ul>
        <p className="text-sm font-bold text-red-600 mt-4">
          Please note if the child is under 16 years of age, this information is not required.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            {/* Main question block */}
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                In the past 10 years since turning 16 years of age, have any of the applicants travelled outside their usual
                country of residence?
              </p>
              <RadioGroup
                value={hasTravelHistory}
                onValueChange={(value) => form.setValue("has_travel_history", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`travel-history-${option}`} data-testid={`radio-travel-history-${option}`} />
                      <Label htmlFor={`travel-history-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Travel history table (shown if Yes) */}
            {hasTravelHistory === "yes" && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel records</h3>
                <RepeaterTable
                  data={travelHistory}
                  columns={[
                    {
                      key: "applicant_ids",
                      label: "Applicant(s)",
                      format: (row) => applicantLabels(row.applicant_ids, profiles),
                    },
                    { key: "country", label: "Country" },
                    { key: "arrival_display", label: "Arrival Date" },
                    { key: "departure_display", label: "Departure Date" },
                    { key: "reason_for_visit", label: "Reason for Travel" },
                  ]}
                  onAdd={(newRow) => {
                    const row = {
                      ...newRow,
                      arrival_display: formatDate(
                        newRow.date_arrived_day,
                        newRow.date_arrived_month,
                        newRow.date_arrived_year
                      ),
                      departure_display: formatDate(
                        newRow.departure_day,
                        newRow.departure_month,
                        newRow.departure_year
                      ),
                    };
                    const updated = [...travelHistory, row];
                    form.setValue("travel_history", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const row = {
                      ...updatedRow,
                      arrival_display: formatDate(
                        updatedRow.date_arrived_day,
                        updatedRow.date_arrived_month,
                        updatedRow.date_arrived_year
                      ),
                      departure_display: formatDate(
                        updatedRow.departure_day,
                        updatedRow.departure_month,
                        updatedRow.departure_year
                      ),
                    };
                    const updated = [...travelHistory];
                    updated[index] = row;
                    form.setValue("travel_history", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const updated = travelHistory.filter((_, i) => i !== index);
                    form.setValue("travel_history", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={TravelDialogWithApplicants}
                  addButtonText="Add"
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
      </CardContent>
    </Card>
  );
}