"use client";
import { TARGET_CHARACTER_QUESTIONS as CHARACTER_QUESTIONS } from "@/lib/allApplicantsParity";
import { CharacterInstructions } from "@/components/intake/CharacterInstructions";
import { AlignedDateSelector } from "@/components/intake/AlignedDateSelector";
import { APPLICANT_COUNTRIES as COUNTRIES } from "@/lib/allApplicantsParity";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

// Use Remote's updated Country List


const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

// Helper function to format dates
const formatDate = (day, month, year) => {
  if (!day || !month || !year) return "-";
  const monthsAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${monthsAbbr[parseInt(month) - 1]} ${year}`;
};

// Character Questions List (HEAD)


// Dialog Schemas
const basicEntrySchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_day: z.string().min(1, "Day is required"),
  date_month: z.string().min(1, "Month is required"),
  date_year: z.string().min(1, "Year is required"),
  country: z.string().min(1, "Country is required"),
});
const basicEntryWithOffenceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_day: z.string().min(1, "Day is required"),
  date_month: z.string().min(1, "Month is required"),
  date_year: z.string().min(1, "Year is required"),
  country: z.string().min(1, "Country is required"),
  offence_type: z.string().min(1, "Offence Type is required"),
});
const nameCountryOnlySchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
});
const dateRangeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  country: z.string().min(1, "Country is required"),
}).superRefine((data, ctx) => {
  const hasDateToDay = data.date_to_day && data.date_to_day.trim() !== "";
  const hasDateToMonth = data.date_to_month && data.date_to_month.trim() !== "";
  const hasDateToYear = data.date_to_year && data.date_to_year.trim() !== "";
  if (hasDateToDay || hasDateToMonth || hasDateToYear) {
    if (!hasDateToDay || !hasDateToMonth || !hasDateToYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date fields (Day, Month, Year) must be filled for Date To",
        path: ["date_to_day"],
      });
    } else {
      const fromDate = new Date(parseInt(data.date_from_year), parseInt(data.date_from_month) - 1, parseInt(data.date_from_day));
      const toDate = new Date(parseInt(data.date_to_year), parseInt(data.date_to_month) - 1, parseInt(data.date_to_day));
      if (toDate < fromDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date To must not be earlier than Date From",
          path: ["date_to_day"],
        });
      }
    }
  }
});
const policeClearanceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_of_birth_day: z.string().min(1, "Day is required"),
  date_of_birth_month: z.string().min(1, "Month is required"),
  date_of_birth_year: z.string().min(1, "Year is required"),
  date_of_application_day: z.string().min(1, "Day is required"),
  date_of_application_month: z.string().min(1, "Month is required"),
  date_of_application_year: z.string().min(1, "Year is required"),
  issuing_country: z.string().min(1, "Country is required"), // Changed from country to issuing_country to match usage
  date_issue_day: z.string().optional(),
  date_issue_month: z.string().optional(),
  date_issue_year: z.string().optional(),
  reference_number: z.string().optional(),
});
const immigrationDetentionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  centre_camp_name: z.string().min(1, "Name of Centre/Camp is required"),
  country: z.string().min(1, "Country is required"),
  date_from_day: z.string().min(1, "Day is required"),
  date_from_month: z.string().min(1, "Month is required"),
  date_from_year: z.string().min(1, "Year is required"),
  date_to_day: z.string().optional(),
  date_to_month: z.string().optional(),
  date_to_year: z.string().optional(),
  location_type: z.string().min(1, "Type of Location is required"), // Add location_type back
  organiser: z.string().optional(), // Add organiser back
  location: z.string().optional(), // Add location back
  details: z.string().optional(), // Add details back
});
const militaryTrainingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
  training_type: z.string().optional(),
  details: z.string().optional(),
}).passthrough();
const militaryServiceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country_of_service: z.string().min(1, "Country of Service is required"),
  country_of_deployment: z.string().optional(),
  service_type: z.string().optional(),
  position: z.string().optional(),
  details: z.string().optional(),
}).passthrough();
const paymentBenefitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_of_birth_day: z.string().min(1, "Day is required"),
  date_of_birth_month: z.string().min(1, "Month is required"),
  date_of_birth_year: z.string().min(1, "Year is required"),
  details: z.string().min(1, "Details is required"),
});

// Dialog Constants
const TRAINING_TYPES = [
  "Military Training",
  "Paramilitary Training",
  "Weapons Training",
  "Explosives Training",
  "Chemical Product Manufacturing",
  "Biological Product Manufacturing",
  "Other",
];
const SERVICE_TYPES = [
  "Intelligence",
  "Military - Voluntary Service",
  "Military - Compulsory National Service",
  "Military - Conscription",
  "Military - Reserve",
  "National Guard",
  "Militia",
  "Paramilitary",
  "Police",
  "Secret Police",
];

// Dialog Functions
function PoliceClearanceDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = policeClearanceSchema;
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || {
      name: "",
      date_of_birth_day: "",
      date_of_birth_month: "",
      date_of_birth_year: "",
      date_of_application_day: "",
      date_of_application_month: "",
      date_of_application_year: "",
      issuing_country: "",
      date_issue_day: "",
      date_issue_month: "",
      date_issue_year: "",
      reference_number: "",
    },
  });

  const handleSubmit = (data) => {
    // Extract DOB from applicant name if it's in the format "Name (DOB: day month year)"
    let dateOfBirthDisplay = "";
    const dobMatch = data.name.match(/\(DOB:\s*(.+?)\)/);
    if (dobMatch) {
      dateOfBirthDisplay = dobMatch[1];
    } else {
      // Fallback to form fields if needed or keep empty
      dateOfBirthDisplay = `${data.date_of_birth_day} ${data.date_of_birth_month} ${data.date_of_birth_year}`;
    }

    onSave({
      ...data,
      applicant_name: data.name, // Map name to applicant_name for table consistency
      date_of_birth_display: dateOfBirthDisplay,
      application_date_display: `${data.date_of_application_day} ${data.date_of_application_month} ${data.date_of_application_year}`,
    });
    dialogForm.reset();
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Police Certificate Application</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of the Police Certificate application
      </p>
      <div>
        <Label className="mb-2 block">Which applicant does this declaration apply to? <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("name")} onValueChange={(value) => dialogForm.setValue("name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.name && <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>}
      </div>

      {/* Date of Birth Fields - usually auto-filled or manual if not in name string */}
      <div>
        <Label className="mb-2 block">Date of Birth <span className="text-red-600">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_of_birth_day")} onValueChange={(v) => dialogForm.setValue("date_of_birth_day", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{String(d).padStart(2, "0")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_of_birth_month")} onValueChange={(v) => dialogForm.setValue("date_of_birth_month", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_of_birth_year")} onValueChange={(v) => dialogForm.setValue("date_of_birth_year", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Date of Application <span className="text-red-600">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_of_application_day")} onValueChange={(v) => dialogForm.setValue("date_of_application_day", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{String(d).padStart(2, "0")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_of_application_month")} onValueChange={(v) => dialogForm.setValue("date_of_application_month", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_of_application_year")} onValueChange={(v) => dialogForm.setValue("date_of_application_year", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Issuing Country <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("issuing_country")} onValueChange={(v) => dialogForm.setValue("issuing_country", v)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#4F726B] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

function ImmigrationDetentionDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = immigrationDetentionSchema;
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || {
      name: "",
      centre_camp_name: "",
      country: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      location_type: "",
      organiser: "",
      location: "",
      details: ""
    },
  });

  const handleSubmit = (data) => {
    onSave({
      ...data,
      applicant_name: data.name,
      date_from_display: `${data.date_from_day} ${data.date_from_month} ${data.date_from_year}`,
      date_to_display: data.date_to_day ? `${data.date_to_day} ${data.date_to_month} ${data.date_to_year}` : "Ongoing"
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Immigration Detention Details</h3>
      <div>
        <Label className="mb-2 block">Which applicant does this declaration apply to? <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("name")} onValueChange={(value) => dialogForm.setValue("name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Name of Centre/Camp <span className="text-red-600">*</span></Label>
        <Input {...dialogForm.register("centre_camp_name")} />
      </div>
      <div>
        <Label className="mb-2 block">Location Type <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("location_type")} onValueChange={(v) => dialogForm.setValue("location_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Immigration Detention">Immigration Detention</SelectItem>
            <SelectItem value="Refugee Camp">Refugee Camp</SelectItem>
            <SelectItem value="Centre for Refugees">Centre for Refugees</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("country")} onValueChange={(v) => dialogForm.setValue("country", v)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Date From <span className="text-red-600">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_from_day")} onValueChange={(v) => dialogForm.setValue("date_from_day", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{String(d).padStart(2, "0")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_month")} onValueChange={(v) => dialogForm.setValue("date_from_month", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_year")} onValueChange={(v) => dialogForm.setValue("date_from_year", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Date To</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_to_day")} onValueChange={(v) => dialogForm.setValue("date_to_day", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{String(d).padStart(2, "0")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_month")} onValueChange={(v) => dialogForm.setValue("date_to_month", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_year")} onValueChange={(v) => dialogForm.setValue("date_to_year", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#4F726B] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

function PrisonInstitutionDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  // reusing immigrationDetentionSchema or similar? Or defines its own?
  // HEAD used custom schema, likely standard date ranges
  // For brevity, using similar structure
  const dialogSchema = immigrationDetentionSchema.pick({ name: true, country: true, date_from_day: true, date_from_month: true, date_from_year: true, date_to_day: true, date_to_month: true, date_to_year: true }).extend({ details: z.string().optional() });

  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { name: "", country: "", date_from_day: "", date_from_month: "", date_from_year: "", date_to_day: "", date_to_month: "", date_to_year: "", details: "" },
  });

  const handleSubmit = (data) => {
    onSave({ ...data, applicant_name: data.name, date_from_display: `${data.date_from_day} ${data.date_from_month} ${data.date_from_year}`, date_to_display: data.date_to_day ? `${data.date_to_day} ${data.date_to_month} ${data.date_to_year}` : "" });
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Prison / Psychiatric Institution</h3>
      <div>
        <Label className="mb-2 block">Which applicant does this declaration apply to? <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("name")} onValueChange={(value) => dialogForm.setValue("name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>{applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("country")} onValueChange={(v) => dialogForm.setValue("country", v)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Date From <span className="text-red-600">*</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_from_day")} onValueChange={(v) => dialogForm.setValue("date_from_day", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{String(d).padStart(2, "0")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_month")} onValueChange={(v) => dialogForm.setValue("date_from_month", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_year")} onValueChange={(v) => dialogForm.setValue("date_from_year", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Date To</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_to_day")} onValueChange={(v) => dialogForm.setValue("date_to_day", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Day" /></SelectTrigger>
            <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{String(d).padStart(2, "0")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_month")} onValueChange={(v) => dialogForm.setValue("date_to_month", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Month" /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_year")} onValueChange={(v) => dialogForm.setValue("date_to_year", v)}>
            <SelectTrigger><SelectValue placeholder="Choose Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={4} {...dialogForm.register("details")} placeholder="Please provide full details as requested in the instructions above..." />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#4F726B] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

function CharacterDateRange({ form }) {
  return <>
    {["from", "to"].map((direction) => <AlignedDateSelector
      key={direction}
      label={direction === "from" ? "Date From" : "Date To (leave blank if ongoing)"}
      values={Object.fromEntries(["day", "month", "year"].map((part) => [part, form.watch(`date_${direction}_${part}`) || ""]))}
      onValueChange={(part, value) => form.setValue(`date_${direction}_${part}`, value)}
      testIdPrefix={`character-date-${direction}`}
    />)}
  </>;
}

function MilitaryTrainingDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = militaryTrainingSchema;
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { name: "", country: "", date_from_day: "", date_from_month: "", date_from_year: "", date_to_day: "", date_to_month: "", date_to_year: "", training_type: "", details: "" },
  });
  const handleSubmit = (data) => {
    onSave({ ...data, applicant_name: data.name });
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Military Training</h3>
      <div>
        <Label className="mb-2 block">Which applicant does this declaration apply to? <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("name")} onValueChange={(value) => dialogForm.setValue("name", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>{applicantOptions.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("country")} onValueChange={(v) => dialogForm.setValue("country", v)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <CharacterDateRange form={dialogForm} />
      <div>
        <Label className="mb-2 block">Training Type</Label>
        <Select value={dialogForm.watch("training_type")} onValueChange={(v) => dialogForm.setValue("training_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
          <SelectContent>{TRAINING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={4} {...dialogForm.register("details")} placeholder="Please provide full details as requested in the instructions above..." />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#4F726B] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

function MilitaryServiceDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = militaryServiceSchema;
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || { name: "", country_of_service: "", country_of_deployment: "", position: "" }
  });
  const handleSubmit = (data) => onSave({ ...data, applicant_name: data.name });

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Military Service</h3>
      <div>
        <Label className="mb-2 block">Which applicant does this declaration apply to? <span className="text-red-600">*</span></Label>
        <Select value={dialogForm.watch("name")} onValueChange={(v) => dialogForm.setValue("name", v)}>
          <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
          <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country of Service</Label>
        <Select value={dialogForm.watch("country_of_service")} onValueChange={(v) => dialogForm.setValue("country_of_service", v)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Service Type</Label>
        <Select value={dialogForm.watch("service_type")} onValueChange={(v) => dialogForm.setValue("service_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
          <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country of Deployment</Label>
        <Select value={dialogForm.watch("country_of_deployment")} onValueChange={(value) => dialogForm.setValue("country_of_deployment", value)}>
          <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
          <SelectContent>{COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <CharacterDateRange form={dialogForm} />
      <div>
        <Label className="mb-2 block">Position/Rank</Label>
        <Input {...dialogForm.register("position")} />
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={4} {...dialogForm.register("details")} placeholder="Please provide full details as requested in the instructions above..." />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#4F726B] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

function CriminalConductDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({ applicant_name: z.string().min(1, "Required"), country: z.string().optional(), details: z.string().optional() });
  const dialogForm = useForm({ resolver: zodResolver(dialogSchema), defaultValues: editingRow || { applicant_name: "", country: "", details: "" } });
  return (
    <div className="space-y-4">
      <h3 className="font-bold">Criminal Conduct</h3>
      <Label>Which applicant does this declaration apply to?</Label>
      <Select value={dialogForm.watch("applicant_name")} onValueChange={v => dialogForm.setValue("applicant_name", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
        <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Country</Label>
      <Select value={dialogForm.watch("country")} onValueChange={v => dialogForm.setValue("country", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Give details</Label>
      <Textarea {...dialogForm.register("details")}  placeholder="Please provide full details as requested in the instructions above..." />
      <DialogFooter><Button type="button" onClick={onCancel} variant="outline">Cancel</Button><Button type="button" onClick={dialogForm.handleSubmit(onSave)}>Ok</Button></DialogFooter>
    </div>
  );
}

function ViolentOrganizationDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({ applicant_name: z.string().min(1, "Required"), country: z.string().optional(), details: z.string().optional() });
  const dialogForm = useForm({ resolver: zodResolver(dialogSchema), defaultValues: editingRow || { applicant_name: "", country: "", details: "" } });
  return (
    <div className="space-y-4">
      <h3 className="font-bold">Violent Org</h3>
      <Label>Which applicant does this declaration apply to?</Label>
      <Select value={dialogForm.watch("applicant_name")} onValueChange={v => dialogForm.setValue("applicant_name", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
        <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Country</Label>
      <Select value={dialogForm.watch("country")} onValueChange={v => dialogForm.setValue("country", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Give details</Label>
      <Textarea {...dialogForm.register("details")}  placeholder="Please provide full details as requested in the instructions above..." />
      <DialogFooter><Button type="button" onClick={onCancel} variant="outline">Cancel</Button><Button type="button" onClick={dialogForm.handleSubmit(onSave)}>Ok</Button></DialogFooter>
    </div>
  );
}

function NationalSecurityDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({ applicant_name: z.string().min(1, "Required"), country: z.string().optional(), details: z.string().optional() });
  const dialogForm = useForm({ resolver: zodResolver(dialogSchema), defaultValues: editingRow || { applicant_name: "", country: "", details: "" } });
  return (
    <div className="space-y-4">
      <h3 className="font-bold">National Security</h3>
      <Label>Which applicant does this declaration apply to?</Label>
      <Select value={dialogForm.watch("applicant_name")} onValueChange={v => dialogForm.setValue("applicant_name", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
        <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Country</Label>
      <Select value={dialogForm.watch("country")} onValueChange={v => dialogForm.setValue("country", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Give details</Label>
      <Textarea {...dialogForm.register("details")}  placeholder="Please provide full details as requested in the instructions above..." />
      <DialogFooter><Button type="button" onClick={onCancel} variant="outline">Cancel</Button><Button type="button" onClick={dialogForm.handleSubmit(onSave)}>Ok</Button></DialogFooter>
    </div>
  );
}

function OutstandingDebtsDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({ applicant_name: z.string().min(1, "Required"), country: z.string().optional(), details: z.string().optional() });
  const dialogForm = useForm({ resolver: zodResolver(dialogSchema), defaultValues: editingRow || { applicant_name: "", country: "", details: "" } });
  return (
    <div className="space-y-4">
      <h3 className="font-bold">Outstanding Debts</h3>
      <Label>Which applicant does this declaration apply to?</Label>
      <Select value={dialogForm.watch("applicant_name")} onValueChange={v => dialogForm.setValue("applicant_name", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
        <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Country</Label>
      <Select value={dialogForm.watch("country")} onValueChange={v => dialogForm.setValue("country", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Give details</Label>
      <Textarea {...dialogForm.register("details")}  placeholder="Please provide full details as requested in the instructions above..." />
      <DialogFooter><Button type="button" onClick={onCancel} variant="outline">Cancel</Button><Button type="button" onClick={dialogForm.handleSubmit(onSave)}>Ok</Button></DialogFooter>
    </div>
  );
}

function GenericCharacterDialog({ editingRow, onSave, onCancel, applicantOptions = [], title, description }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Required"),
    country: z.string().optional(),
    date_year: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({ resolver: zodResolver(dialogSchema), defaultValues: editingRow || { applicant_name: "", country: "", date_year: "", details: "" } });
  return (
    <div className="space-y-4">
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm">{description}</p>
      <Label>Which applicant does this declaration apply to?</Label>
      <Select value={dialogForm.watch("applicant_name")} onValueChange={v => dialogForm.setValue("applicant_name", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
        <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Country</Label>
      <Select value={dialogForm.watch("country")} onValueChange={v => dialogForm.setValue("country", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Year</Label>
      <Input {...dialogForm.register("date_year")} placeholder="Choose Year" />
      <Label>Give details</Label>
      <Textarea {...dialogForm.register("details")}  placeholder="Please provide full details as requested in the instructions above..." />
      <DialogFooter><Button type="button" onClick={onCancel} variant="outline">Cancel</Button><Button type="button" onClick={dialogForm.handleSubmit(onSave)}>Ok</Button></DialogFooter>
    </div>
  );
}

function ConvictionDialog({ editingRow, onSave, onCancel, applicantOptions = [], title, description }) {
  const dialogSchema = z.object({ applicant_name: z.string().min(1, "Required"), country: z.string().optional(), offence_type: z.string().optional(), details: z.string().optional() });
  const dialogForm = useForm({ resolver: zodResolver(dialogSchema), defaultValues: editingRow || { applicant_name: "", country: "", offence_type: "", details: "" } });
  return (
    <div className="space-y-4">
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm">{description}</p>
      <Label>Which applicant does this declaration apply to?</Label>
      <Select value={dialogForm.watch("applicant_name")} onValueChange={v => dialogForm.setValue("applicant_name", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
        <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Country</Label>
      <Select value={dialogForm.watch("country")} onValueChange={v => dialogForm.setValue("country", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Country" /></SelectTrigger>
        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Offence</Label>
      <Input {...dialogForm.register("offence_type")} />
      <Label>Give details</Label>
      <Textarea {...dialogForm.register("details")}  placeholder="Please provide full details as requested in the instructions above..." />
      <DialogFooter><Button type="button" onClick={onCancel} variant="outline">Cancel</Button><Button type="button" onClick={dialogForm.handleSubmit(onSave)}>Ok</Button></DialogFooter>
    </div>
  );
}

function SimpleCharacterDialog({ editingRow, onSave, onCancel, applicantOptions = [], title, description }) {
  const dialogSchema = z.object({ applicant_name: z.string().min(1, "Required"), details: z.string().optional() });
  const dialogForm = useForm({ resolver: zodResolver(dialogSchema), defaultValues: editingRow || { applicant_name: "", details: "" } });
  return (
    <div className="space-y-4">
      <h3 className="font-bold">{title}</h3>
      <p className="text-sm">{description}</p>
      <Label>Which applicant does this declaration apply to?</Label>
      <Select value={dialogForm.watch("applicant_name")} onValueChange={v => dialogForm.setValue("applicant_name", v)}>
        <SelectTrigger><SelectValue placeholder="Choose Applicant" /></SelectTrigger>
        <SelectContent>{applicantOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
      </Select>
      <Label>Give details</Label>
      <Textarea {...dialogForm.register("details")}  placeholder="Please provide full details as requested in the instructions above..." />
      <DialogFooter><Button type="button" onClick={onCancel} variant="outline">Cancel</Button><Button type="button" onClick={dialogForm.handleSubmit(onSave)}>Ok</Button></DialogFooter>
    </div>
  );
}
const formSchema = z.object({
  ...CHARACTER_QUESTIONS.reduce((acc, q) => {
    acc[q.key] = z.enum(["yes", "no"]).optional();
    return acc;
  }, {}),
  police_check_details: z.array(z.any()).optional(),
  immigration_detention_details: z.array(z.any()).optional(),
  psychiatric_institution_details: z.array(z.any()).optional(),
  military_training_details: z.array(z.any()).optional(),
  military_service_details: z.array(z.any()).optional(),
  criminal_conduct_details: z.array(z.any()).optional(),
  violent_org_details: z.array(z.any()).optional(),
  national_security_details: z.array(z.any()).optional(),
  outstanding_debts_details: z.array(z.any()).optional(),
  convicted_offence_details: z.array(z.any()).optional(),
  awaiting_legal_action_details: z.array(z.any()).optional(),
  false_misleading_info_details: z.array(z.any()).optional(),
  sponsorship_payment_details: z.array(z.any()).optional(),
  people_smuggling_details: z.array(z.any()).optional(),
  domestic_violence_details: z.array(z.any()).optional(),
  arrest_warrant_details: z.array(z.any()).optional(),
  child_sex_offence_details: z.array(z.any()).optional(),
  sex_offender_register_details: z.array(z.any()).optional(),
  insanity_acquittal_details: z.array(z.any()).optional(),
  unfit_to_plead_details: z.array(z.any()).optional(),
  visa_refused_details: z.array(z.any()).optional(),
  overstayed_visa_details: z.array(z.any()).optional(),
  deported_removed_details: z.array(z.any()).optional(),
  avoid_removal_details: z.array(z.any()).optional(),
  excluded_from_country_details: z.array(z.any()).optional(),
  citizenship_refusal_details: z.array(z.any()).optional(),
  war_crimes_details: z.array(z.any()).optional(),
});

const GENERIC_DIALOG_CONFIG = {
  domestic_violence_order: {
    title: "Domestic Violence Order",
    description: "Enter details of any applicant who is included in this application who has ever been the subject of an order for the personal protection of another person:",
    field: "domestic_violence_details"
  },
  arrest_warrant: {
    title: "Arrest Warrant",
    description: "Enter details of any applicant who is included in this application who has been the subject of an arrest warrant or Interpol Notice:",
    field: "arrest_warrant_details"
  },
  child_sex_offence: {
    title: "Child Sex Offence",
    description: "Enter details of any applicant who has been found guilty of a sexually based offence involving a child:",
    field: "child_sex_offence_details"
  },
  sex_offender_register: {
    title: "Sex Offender Register",
    description: "Enter details of any applicant who is included in this application who has ever been named on a sex offender register:",
    field: "sex_offender_register_details"
  },
  insanity_acquittal: {
    title: "Acquitted due to Insanity",
    description: "Enter details of any applicant who has ever been acquitted of any offence on the grounds of unsoundness of mind or insanity:",
    field: "insanity_acquittal_details"
  },
  unfit_to_plead: {
    title: "Unfit to Plead",
    description: "Enter details of any applicant who is included in this application who has ever been found by a court not fit to plead:",
    field: "unfit_to_plead_details"
  },
  visa_refused: {
    title: "Visa Refusal",
    description: "Enter details of any applicant who has ever had a visa or entry permit for any country (including Australia) refused:",
    field: "visa_refused_details"
  },
  overstayed_visa: {
    title: "Overstayed Visa",
    description: "Enter details of any applicant who has overstayed a visa or entry permit in any country (including Australia):",
    field: "overstayed_visa_details"
  },
  deported_removed: {
    title: "Deported or Removed",
    description: "Enter details of any applicant who has been removed or deported from any country (including Australia):",
    field: "deported_removed_details"
  },
  avoid_removal: {
    title: "Left to Avoid Removal",
    description: "Enter details of any applicant who has left any country to avoid being removed or deported from that Country (including Australia):",
    field: "avoid_removal_details"
  },
  excluded_from_country: {
    title: "Excluded from Country",
    description: "Enter details of any applicant who has been excluded from or asked to leave any country (including Australia):",
    field: "excluded_from_country_details"
  },
  citizenship_refusal: {
    title: "Citizenship Refusal",
    description: "Enter details of any applicant who has ever been refused, renounced or rescinded citizenship of any country:",
    field: "citizenship_refusal_details"
  },
  war_crimes: {
    title: "War Crimes",
    description: "Enter details of any applicant who has been charged with, or indicted for: genocide, war crimes, crimes against humanity, torture, slavery, or any other crime that is otherwise of a serious international concern:",
    field: "war_crimes_details"
  },
  people_smuggling: {
    title: "People Smuggling",
    description: "Enter details of any applicant who has ever been involved in people smuggling or people trafficking offences:",
    field: "people_smuggling_details"
  },
};

export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = "protection";
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  // Build applicant name options
  const applicantOptions = (() => {
    const opts = [];
    const buildLabel = (family, given, day, month, year) => {
      const name = [family, given].filter(Boolean).join(" ").trim();
      const dob = [day, month, year].filter(Boolean).join(" ");
      if (!name) return "";
      return dob ? `${name} (DOB: ${dob})` : name;
    };

    // Main applicant
    const main = draftSnap.draft?.protection_details;
    if (main) {
      const label = buildLabel(
        main.family_name,
        main.given_names,
        main.birth_day,
        main.birth_month,
        main.birth_year
      );
      if (label) opts.push(label);
    }

    // Spouse / partner
    const spouse = draftSnap.draft?.protection_spouse_partner?.details;
    if (spouse) {
      const label = buildLabel(
        spouse.family_name,
        spouse.given_names,
        spouse.birth_day,
        spouse.birth_month,
        spouse.birth_year
      );
      if (label) opts.push(label);
    }

    // Children
    const childrenData = draftSnap.draft?.protection_children?.children || [];
    if (Array.isArray(childrenData)) {
      childrenData.forEach((child) => {
        const label = buildLabel(
          child.family_name,
          child.given_names,
          child.birth_day,
          child.birth_month,
          child.birth_year
        );
        if (label) opts.push(label);
      });
    }
    for (const profile of draftSnap.draft?.profiles || []) {
      const label = buildLabel(profile.family_name, profile.given_names, profile.birth_day, profile.birth_month, profile.birth_year);
      if (label) opts.push(label);
    }
    return [...new Set(opts)];
  })();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...CHARACTER_QUESTIONS.reduce((acc, q) => {
        acc[q.key] = "no";
        return acc;
      }, {}),
      police_check_details: [],
      immigration_detention_details: [],
      psychiatric_institution_details: [],
      military_training_details: [],
      military_service_details: [],
      criminal_conduct_details: [],
      violent_org_details: [],
      national_security_details: [],
      outstanding_debts_details: [],
      convicted_offence_details: [],
      awaiting_legal_action_details: [],
      false_misleading_info_details: [],
      sponsorship_payment_details: [],
      people_smuggling_details: [],
      domestic_violence_details: [],
      arrest_warrant_details: [],
      child_sex_offence_details: [],
      sex_offender_register_details: [],
      insanity_acquittal_details: [],
      unfit_to_plead_details: [],
      visa_refused_details: [],
      overstayed_visa_details: [],
      deported_removed_details: [],
      avoid_removal_details: [],
      excluded_from_country_details: [],
      citizenship_refusal_details: [],
      war_crimes_details: [],
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_character || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] === "yes" || savedData[key] === "no") {
          form.setValue(key, savedData[key]);
        } else if (Array.isArray(savedData[key])) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, [draftSnap.draft?.protection_character, form]);

  const onSubmit = async (data) => {
    const result = await draftStore.saveSectionData("protection_character", data);
    if (!result.success) {
      toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
      return;
    }
    await draftStore.markPageComplete(`${visaType}/all-applicants/character`, null, "protection_character");
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(next);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(prev);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("protection_character", values);
    if (result.success) {
      toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
    } else {
      toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">All Applicants' Character</CardTitle>
        <CharacterInstructions />
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            {CHARACTER_QUESTIONS.map((q) => (
              <div key={q.key} className="space-y-3">
                <Label>{q.label}</Label>
                <RadioGroup
                  value={form.watch(q.key)}
                  onValueChange={(value) => form.setValue(q.key, value)}
                >
                  <div className="flex gap-4">
                    {["yes", "no"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${q.key}-${option}`} />
                        <Label htmlFor={`${q.key}-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {form.watch(q.key) === "yes" && (
                  <div className="mt-4">
                    {q.key === "police_check_last_12_months" && (
                      <RepeaterTable
                        data={form.watch("police_check_details") || []}
                        columns={[
                          { key: "applicant_name", label: "Name" },
                          { key: "date_of_birth_display", label: "DOB" },
                          { key: "issuing_country", label: "Country" }
                        ]}
                        onAdd={(row) => form.setValue("police_check_details", [...(form.watch("police_check_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("police_check_details") || [])]; cur[i] = row; form.setValue("police_check_details", cur);
                        }}
                        onDelete={(i) => form.setValue("police_check_details", (form.watch("police_check_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <PoliceClearanceDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "immigration_detention" && (
                      <RepeaterTable
                        data={form.watch("immigration_detention_details") || []}
                        columns={[
                          { key: "applicant_name", label: "Name" },
                          { key: "centre_camp_name", label: "Centre" },
                          { key: "country", label: "Country" }
                        ]}
                        onAdd={(row) => form.setValue("immigration_detention_details", [...(form.watch("immigration_detention_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("immigration_detention_details") || [])]; cur[i] = row; form.setValue("immigration_detention_details", cur);
                        }}
                        onDelete={(i) => form.setValue("immigration_detention_details", (form.watch("immigration_detention_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <ImmigrationDetentionDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "psychiatric_institution" && (
                      <RepeaterTable
                        data={form.watch("psychiatric_institution_details") || []}
                        columns={[
                          { key: "applicant_name", label: "Name" },
                          { key: "country", label: "Country" },
                          { key: "date_from_year", label: "Year From" }
                        ]}
                        onAdd={(row) => form.setValue("psychiatric_institution_details", [...(form.watch("psychiatric_institution_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("psychiatric_institution_details") || [])]; cur[i] = row; form.setValue("psychiatric_institution_details", cur);
                        }}
                        onDelete={(i) => form.setValue("psychiatric_institution_details", (form.watch("psychiatric_institution_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <PrisonInstitutionDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "military_training" && (
                      <RepeaterTable
                        data={form.watch("military_training_details") || []}
                        columns={[
                          { key: "applicant_name", label: "Name" },
                          { key: "country", label: "Country" },
                          { key: "training_type", label: "Type" }
                        ]}
                        onAdd={(row) => form.setValue("military_training_details", [...(form.watch("military_training_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("military_training_details") || [])]; cur[i] = row; form.setValue("military_training_details", cur);
                        }}
                        onDelete={(i) => form.setValue("military_training_details", (form.watch("military_training_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <MilitaryTrainingDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "military_service" && (
                      <RepeaterTable
                        data={form.watch("military_service_details") || []}
                        columns={[
                          { key: "applicant_name", label: "Name" },
                          { key: "country_of_service", label: "Country" },
                          { key: "position", label: "Rank/Position" }
                        ]}
                        onAdd={(row) => form.setValue("military_service_details", [...(form.watch("military_service_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("military_service_details") || [])]; cur[i] = row; form.setValue("military_service_details", cur);
                        }}
                        onDelete={(i) => form.setValue("military_service_details", (form.watch("military_service_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <MilitaryServiceDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "associated_criminal_conduct" && (
                      <RepeaterTable
                        data={form.watch("criminal_conduct_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }]}
                        onAdd={(row) => form.setValue("criminal_conduct_details", [...(form.watch("criminal_conduct_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("criminal_conduct_details") || [])]; cur[i] = row; form.setValue("criminal_conduct_details", cur);
                        }}
                        onDelete={(i) => form.setValue("criminal_conduct_details", (form.watch("criminal_conduct_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <CriminalConductDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "associated_violent_org" && (
                      <RepeaterTable
                        data={form.watch("violent_org_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }]}
                        onAdd={(row) => form.setValue("violent_org_details", [...(form.watch("violent_org_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("violent_org_details") || [])]; cur[i] = row; form.setValue("violent_org_details", cur);
                        }}
                        onDelete={(i) => form.setValue("violent_org_details", (form.watch("violent_org_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <ViolentOrganizationDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "national_security_risk" && (
                      <RepeaterTable
                        data={form.watch("national_security_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }]}
                        onAdd={(row) => form.setValue("national_security_details", [...(form.watch("national_security_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("national_security_details") || [])]; cur[i] = row; form.setValue("national_security_details", cur);
                        }}
                        onDelete={(i) => form.setValue("national_security_details", (form.watch("national_security_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <NationalSecurityDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "outstanding_debts" && (
                      <RepeaterTable
                        data={form.watch("outstanding_debts_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }]}
                        onAdd={(row) => form.setValue("outstanding_debts_details", [...(form.watch("outstanding_debts_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("outstanding_debts_details") || [])]; cur[i] = row; form.setValue("outstanding_debts_details", cur);
                        }}
                        onDelete={(i) => form.setValue("outstanding_debts_details", (form.watch("outstanding_debts_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <OutstandingDebtsDialog {...props} applicantOptions={applicantOptions} />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "convicted_offence" && (
                      <RepeaterTable
                        data={form.watch("convicted_offence_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }, { key: "offence_type", label: "Offence" }]}
                        onAdd={(row) => form.setValue("convicted_offence_details", [...(form.watch("convicted_offence_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("convicted_offence_details") || [])]; cur[i] = row; form.setValue("convicted_offence_details", cur);
                        }}
                        onDelete={(i) => form.setValue("convicted_offence_details", (form.watch("convicted_offence_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <ConvictionDialog {...props} applicantOptions={applicantOptions} title="Convictions" description="Provide the date and nature of the offence, full details of the sentence, and dates of any imprisonment or other detention." />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "awaiting_legal_action" && (
                      <RepeaterTable
                        data={form.watch("awaiting_legal_action_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }, { key: "offence_type", label: "Offence" }]}
                        onAdd={(row) => form.setValue("awaiting_legal_action_details", [...(form.watch("awaiting_legal_action_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("awaiting_legal_action_details") || [])]; cur[i] = row; form.setValue("awaiting_legal_action_details", cur);
                        }}
                        onDelete={(i) => form.setValue("awaiting_legal_action_details", (form.watch("awaiting_legal_action_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <ConvictionDialog {...props} applicantOptions={applicantOptions} title="Awaiting Legal Action" description="Give details of the offence and the legal action awaiting a decision." />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "false_misleading_info" && (
                      <RepeaterTable
                        data={form.watch("false_misleading_info_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "details", label: "Details" }]}
                        onAdd={(row) => form.setValue("false_misleading_info_details", [...(form.watch("false_misleading_info_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("false_misleading_info_details") || [])]; cur[i] = row; form.setValue("false_misleading_info_details", cur);
                        }}
                        onDelete={(i) => form.setValue("false_misleading_info_details", (form.watch("false_misleading_info_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <SimpleCharacterDialog {...props} applicantOptions={applicantOptions} title="False Information" description="Details of false information" />}
                        addButtonText="Add"
                      />
                    )}

                    {q.key === "sponsorship_payment" && (
                      <RepeaterTable
                        data={form.watch("sponsorship_payment_details") || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "details", label: "Details" }]}
                        onAdd={(row) => form.setValue("sponsorship_payment_details", [...(form.watch("sponsorship_payment_details") || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch("sponsorship_payment_details") || [])]; cur[i] = row; form.setValue("sponsorship_payment_details", cur);
                        }}
                        onDelete={(i) => form.setValue("sponsorship_payment_details", (form.watch("sponsorship_payment_details") || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => <SimpleCharacterDialog {...props} applicantOptions={applicantOptions} title="Sponsorship Payment" description="Details of payment" />}
                        addButtonText="Add"
                      />
                    )}

                    {GENERIC_DIALOG_CONFIG[q.key] && (
                      <RepeaterTable
                        data={form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || []}
                        columns={[{ key: "applicant_name", label: "Name" }, { key: "country", label: "Country" }, { key: "date_year", label: "Year" }]}
                        onAdd={(row) => form.setValue(GENERIC_DIALOG_CONFIG[q.key].field, [...(form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || []), row])}
                        onEdit={(i, row) => {
                          const cur = [...(form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || [])]; cur[i] = row; form.setValue(GENERIC_DIALOG_CONFIG[q.key].field, cur);
                        }}
                        onDelete={(i) => form.setValue(GENERIC_DIALOG_CONFIG[q.key].field, (form.watch(GENERIC_DIALOG_CONFIG[q.key].field) || []).filter((_, x) => x !== i))}
                        DialogComponent={(props) => (
                          <GenericCharacterDialog
                            {...props}
                            applicantOptions={applicantOptions}
                            title={GENERIC_DIALOG_CONFIG[q.key].title}
                            description={q.label}
                          />
                        )}
                        addButtonText="Add"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
            <FormNavigation onPrev={handlePrevious} onNext={form.handleSubmit(onSubmit)} onSave={handleSave} nextLabel="Continue" loading={draftSnap.isSaving} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
