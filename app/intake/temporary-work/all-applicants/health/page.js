"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const formSchema = z.object({
  has_health_examinations: z.enum(["yes", "no"]).optional(),
  health_examinations: z.array(z.any()).optional(),
  visited_outside_passport_country: z.enum(["yes", "no"]).optional(),
  visited_outside_details: z.array(z.any()).optional(),
  intends_hospital_entry: z.enum(["yes", "no"]).optional(),
  hospital_details: z.array(z.any()).optional(),
  intends_healthcare_work: z.enum(["yes", "no"]).optional(),
  healthcare_work_details: z.array(z.any()).optional(),
  intends_aged_care: z.enum(["yes", "no"]).optional(),
  aged_care_work_details: z.array(z.any()).optional(),
  intends_childcare: z.enum(["yes", "no"]).optional(),
  childcare_work_details: z.array(z.any()).optional(),
  intends_classroom: z.enum(["yes", "no"]).optional(),
  classroom_work_details: z.array(z.any()).optional(),
  had_tuberculosis: z.enum(["yes", "no"]).optional(),
  tuberculosis_details: z.array(z.any()).optional(),
  medical_condition: z.enum(["yes", "no"]).optional(),
  health_conditions_details: z.array(z.any()).optional(),
  requires_assistance: z.enum(["yes", "no"]).optional(),
  medical_assistance_details: z.array(z.any()).optional(),
  // Legacy fields kept for backward compatibility
  close_contact_tb: z.enum(["yes", "no"]).optional(),
  tuberculosis_exposure_details: z.array(z.any()).optional(),
  health_conditions_list: z.array(z.string()).optional(),
  health_insurance: z.enum(["yes", "no"]).optional(),
  health_insurance_details: z.array(z.any()).optional(),
});
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEARS = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i));
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
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];
const HEALTH_CONDITIONS = [
  "Blood disorder",
  "Cancer",
  "Heart disease",
  "Hepatitis B or C and/or liver disease",
  "HIV infection, including AIDS",
  "Kidney disease, including dialysis",
  "Mental illness",
  "Pregnancy",
  "Respiratory disease that has required hospital admission or oxygen therapy",
  "Other",
];
const HEALTH_CARE_ROLES = [
  "Ambulance Officer / Paramedic",
  "Chiropractor",
  "Dentist",
  "Medical Practitioner",
  "Nurse",
  "Occupational Therapist",
  "Optometrist",
  "Osteopath",
  "Pharmacist",
  "Physiotherapist",
  "Podiatrist",
  "Psychologist",
  "Speech Pathologist",
  "Other",
];
const AGED_CARE_ROLES = ["Aged Care", "Disability Care", "Other"];
const formatDate = (day, month, year) => {
  if (!day || !month || !year) return "";
  return `${day} ${month} ${year}`;
};

// ─── Health Examination Dialog ────────────────────────────────────────
function HealthExamDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    date_completed_day: z.string().min(1, "Day is required"),
    date_completed_month: z.string().min(1, "Month is required"),
    date_completed_year: z.string().min(1, "Year is required"),
    country_of_exam: z.string().min(1, "Country of examination is required"),
    hap_id: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        date_completed_day: "",
        date_completed_month: "",
        date_completed_year: "",
        country_of_exam: "",
        hap_id: "",
      },
  });
  const handleSubmit = (data) => {
    onSave({
      ...data,
      date_completed_display: formatDate(
        data.date_completed_day,
        data.date_completed_month,
        data.date_completed_year
      ),
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Health Examinations</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who has undertaken a health examination
        for an Australian visa in the past 12 months.
      </p>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Date Completed</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_completed_day")}
            onValueChange={(value) => dialogForm.setValue("date_completed_day", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_completed_month")}
            onValueChange={(value) => dialogForm.setValue("date_completed_month", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_completed_year")}
            onValueChange={(value) => dialogForm.setValue("date_completed_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Country of Examination</Label>
        <Select
          value={dialogForm.watch("country_of_exam")}
          onValueChange={(value) => dialogForm.setValue("country_of_exam", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">HAP ID (if available)</Label>
        <Input {...dialogForm.register("hap_id")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Visited Outside Passport Country Dialog ──────────────────────────
function VisitedOutsideDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    country: z.string().min(1, "Country is required"),
    date_from_day: z.string().optional(),
    date_from_month: z.string().optional(),
    date_from_year: z.string().optional(),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        country: "",
        date_from_day: "",
        date_from_month: "",
        date_from_year: "",
        date_to_day: "",
        date_to_month: "",
        date_to_year: "",
      },
  });
  const handleSubmit = (data) => {
    onSave({
      ...data,
      date_from_display:
        data.date_from_day && data.date_from_month && data.date_from_year
          ? `${data.date_from_day} ${data.date_from_month} ${data.date_from_year}`
          : "",
      date_to_display:
        data.date_to_day && data.date_to_month && data.date_to_year
          ? `${data.date_to_day} ${data.date_to_month} ${data.date_to_year}`
          : "",
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Visited outside passport country</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of applicants who visited or lived outside their country of passport for more than 3 consecutive months in the last 5 years.
      </p>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Country</Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Date from</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_from_day")} onValueChange={(v) => dialogForm.setValue("date_from_day", v)}>
            <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
            <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_month")} onValueChange={(v) => dialogForm.setValue("date_from_month", v)}>
            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_from_year")} onValueChange={(v) => dialogForm.setValue("date_from_year", v)}>
            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Date to <span className="text-gray-400 font-normal">(leave blank if ongoing)</span></Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={dialogForm.watch("date_to_day")} onValueChange={(v) => dialogForm.setValue("date_to_day", v)}>
            <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
            <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_month")} onValueChange={(v) => dialogForm.setValue("date_to_month", v)}>
            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dialogForm.watch("date_to_year")} onValueChange={(v) => dialogForm.setValue("date_to_year", v)}>
            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

// ─── Hospital Details Dialog (Name, Role, Give details) ───────────────
function HospitalDetailsDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    role: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        role: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Hospital / health care facility details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Role</Label>
        <Input {...dialogForm.register("role")} placeholder="e.g. Patient, Visitor, Employee, Trainee" />
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Health Care Work Dialog (Name, Role, Give details) ───────────────
function HealthCareWorkDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    role: z.string().min(1, "Role is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        role: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Health care work details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Role</Label>
        <Select value={dialogForm.watch("role")} onValueChange={(value) => dialogForm.setValue("role", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Role" />
          </SelectTrigger>
          <SelectContent>
            {HEALTH_CARE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Aged / Disability Care Work Dialog (Name, Role, Give details) ────
function AgedCareWorkDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    role: z.string().min(1, "Role is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        role: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Aged care / disability care details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Role</Label>
        <Select value={dialogForm.watch("role")} onValueChange={(value) => dialogForm.setValue("role", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Role" />
          </SelectTrigger>
          <SelectContent>
            {AGED_CARE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Childcare Dialog (Name, Give details) ────────────────────────────
function ChildcareWorkDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Child care centre details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Classroom Dialog (Name, Give details) ────────────────────────────
function ClassroomWorkDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Classroom details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Tuberculosis Dialog (Name, Give details) ─────────────────────────
function TuberculosisDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Tuberculosis details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Health Conditions Dialog (Name, Condition dropdown, Give details) ─
function HealthConditionsDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    condition: z.string().min(1, "Condition is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        condition: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Health condition details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Condition</Label>
        <Select value={dialogForm.watch("condition")} onValueChange={(value) => dialogForm.setValue("condition", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select Condition" />
          </SelectTrigger>
          <SelectContent>
            {HEALTH_CONDITIONS.map((cond) => (
              <SelectItem key={cond} value={cond}>
                {cond}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Assistive Technology Dialog (Name, Give details) ─────────────────
function AssistiveTechnologyDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Ongoing medical care details</h3>
      <div>
        <Label className="mb-2 block">
          Name <span className="text-red-600">*</span>
        </Label>
        <Select
          value={dialogForm.watch("applicant_name")}
          onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose Applicant" />
          </SelectTrigger>
          <SelectContent>
            {applicantOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Give details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#022C22] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  // Build applicant name options from profiles array (or fallback to manual mapping)
  const applicantOptions = (() => {
    const profiles = draftSnap.draft?.profiles || [];
    const buildLabel = (family, given, day, month, year) => {
      const name = [given, family].filter(Boolean).join(" ").trim();
      const dob = [day, month, year].filter(Boolean).join(" ");
      if (!name) return "";
      return dob ? `${name} (DOB: ${dob})` : name;
    };

    if (profiles.length > 0) {
      return profiles.map((p) => buildLabel(p.family_name, p.given_names, p.birth_day, p.birth_month, p.birth_year)).filter(Boolean);
    }

    const opts = [];
    // Main applicant
    const main = draftSnap.draft?.temporary_work_details;
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
    const spouse = draftSnap.draft?.temporary_work_spouse_details;
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
    const childrenData = draftSnap.draft?.temporary_work_children?.children || [];
    if (Array.isArray(childrenData)) {
      for (const child of childrenData) {
        const label = buildLabel(
          child.family_name,
          child.given_names,
          child.birth_day,
          child.birth_month,
          child.birth_year
        );
        if (label) opts.push(label);
      }
    }
    // Fallback to a generic option if nothing available yet
    return opts.length ? opts : ["Main Applicant"];
  })();
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      has_health_examinations: "no",
      health_examinations: [],
      visited_outside_passport_country: "no",
      visited_outside_details: [],
      intends_hospital_entry: "no",
      hospital_details: [],
      intends_healthcare_work: "no",
      healthcare_work_details: [],
      intends_aged_care: "no",
      aged_care_work_details: [],
      intends_childcare: "no",
      childcare_work_details: [],
      intends_classroom: "no",
      classroom_work_details: [],
      had_tuberculosis: "no",
      tuberculosis_details: [],
      medical_condition: "no",
      health_conditions_details: [],
      requires_assistance: "no",
      medical_assistance_details: [],
      // Legacy fields
      close_contact_tb: "no",
      tuberculosis_exposure_details: [],
      health_conditions_list: [],
      health_insurance: "no",
      health_insurance_details: [],
    },
  });
  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_health || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        let value = savedData[key];
        // Handle legacy empty strings by defaulting to "no" for question fields
        if (value === "" && [
          "medical_condition",
          "requires_assistance",
          "health_insurance",
          "has_health_examinations",
          "intends_hospital_entry",
          "intends_healthcare_work",
          "intends_aged_care",
          "intends_childcare",
          "intends_classroom",
          "had_tuberculosis",
          "close_contact_tb",
          "visited_outside_passport_country"
        ].includes(key)) {
          value = "no";
        }
        if (value !== undefined && value !== null) {
          form.setValue(key, value);
        }
      });
    }
  }, [draftSnap.draft?.temporary_work_health, form]);
  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("temporary_work_health", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/health`, null, "temporary_work_health");
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
      const values = form.getValues();
      const result = await draftStore.saveSectionData("temporary_work_health", values);
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

  // Helper to build repeater handlers
  const repeaterHandlers = (fieldName) => ({
    onAdd: (row) => {
      const current = form.watch(fieldName) || [];
      form.setValue(fieldName, [...current, row], {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    onEdit: (index, updatedRow) => {
      const current = [...(form.watch(fieldName) || [])];
      current[index] = updatedRow;
      form.setValue(fieldName, current, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    onDelete: (index) => {
      const current = form.watch(fieldName) || [];
      const updated = current.filter((_, i) => i !== index);
      form.setValue(fieldName, updated, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
  });

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Health</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide health information for all applicants.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">

            {/* 1. Health examinations */}
            <div className="space-y-2">
              <Label>
                Has any applicant undertaken a health examination for an Australian visa in the past 12 months?
              </Label>
              <RadioGroup
                value={form.watch("has_health_examinations")}
                onValueChange={(value) => form.setValue("has_health_examinations", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`health-exam-${option}`} />
                      <Label htmlFor={`health-exam-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("has_health_examinations") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("health_examinations") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "date_completed_display", label: "Date Completed" },
                    { key: "country_of_exam", label: "Country" },
                  ]}
                  {...repeaterHandlers("health_examinations")}
                  DialogComponent={(props) => (
                    <HealthExamDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="health-exam"
                />
              </div>
            )}

            {/* 2. Visited outside passport country for 3+ months */}
            <div className="space-y-2 pt-4">
              <Label>
                In the last five years, has any applicant visited, or lived, outside their country of passport, for more
                than 3 consecutive months? Do not include time spent in Australia.
              </Label>
              <RadioGroup
                value={form.watch("visited_outside_passport_country")}
                onValueChange={(value) => form.setValue("visited_outside_passport_country", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`outside-passport-${option}`} />
                      <Label htmlFor={`outside-passport-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("visited_outside_passport_country") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("visited_outside_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "country", label: "Country" },
                    { key: "date_from_display", label: "Date From" },
                    { key: "date_to_display", label: "Date To" },
                  ]}
                  {...repeaterHandlers("visited_outside_details")}
                  DialogComponent={(props) => (
                    <VisitedOutsideDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="visited-outside"
                />
              </div>
            )}

            {/* 3. Hospital / health care facility */}
            <div className="pt-4 space-y-2">
              <Label>
                Does any applicant intend to enter a hospital or a health care facility (including nursing homes) while
                in Australia?
              </Label>
              <RadioGroup
                value={form.watch("intends_hospital_entry")}
                onValueChange={(value) => form.setValue("intends_hospital_entry", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`hospital-${option}`} />
                      <Label htmlFor={`hospital-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("intends_hospital_entry") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("hospital_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "role", label: "Role" },
                  ]}
                  {...repeaterHandlers("hospital_details")}
                  DialogComponent={(props) => (
                    <HospitalDetailsDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="hospital"
                />
              </div>
            )}

            {/* 4. Health care work */}
            <div className="space-y-2 pt-4">
              <Label>
                Does any applicant intend to work as, or study or train to be, a health care worker or work within a
                health care facility while in Australia?
              </Label>
              <RadioGroup
                value={form.watch("intends_healthcare_work")}
                onValueChange={(value) => form.setValue("intends_healthcare_work", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`hc-work-${option}`} />
                      <Label htmlFor={`hc-work-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("intends_healthcare_work") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("healthcare_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "role", label: "Role" },
                  ]}
                  {...repeaterHandlers("healthcare_work_details")}
                  DialogComponent={(props) => (
                    <HealthCareWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="healthcare-work"
                />
              </div>
            )}

            {/* 5. Aged care / disability care */}
            <div className="space-y-2 pt-4">
              <Label>
                Does any applicant intend to work, study or train within aged care or disability care while in Australia?
              </Label>
              <RadioGroup
                value={form.watch("intends_aged_care")}
                onValueChange={(value) => form.setValue("intends_aged_care", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`aged-care-${option}`} />
                      <Label htmlFor={`aged-care-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("intends_aged_care") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("aged_care_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "role", label: "Role" },
                  ]}
                  {...repeaterHandlers("aged_care_work_details")}
                  DialogComponent={(props) => (
                    <AgedCareWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="aged-care-work"
                />
              </div>
            )}

            {/* 6. Child care centre */}
            <div className="space-y-2 pt-4">
              <Label>
                Does any applicant intend to work or be a trainee at a child care centre (including preschools and
                creches) while in Australia?
              </Label>
              <RadioGroup
                value={form.watch("intends_childcare")}
                onValueChange={(value) => form.setValue("intends_childcare", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`childcare-${option}`} />
                      <Label htmlFor={`childcare-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("intends_childcare") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("childcare_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "details", label: "Details" },
                  ]}
                  {...repeaterHandlers("childcare_work_details")}
                  DialogComponent={(props) => (
                    <ChildcareWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="childcare-work"
                />
              </div>
            )}

            {/* 7. Classroom situation */}
            <div className="space-y-2 pt-4">
              <Label>
                Does any applicant intend to be in a classroom situation for more than 3 months (eg. as either a
                student, teacher, lecturer or observer)?
              </Label>
              <RadioGroup
                value={form.watch("intends_classroom")}
                onValueChange={(value) => form.setValue("intends_classroom", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`classroom-${option}`} />
                      <Label htmlFor={`classroom-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("intends_classroom") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("classroom_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "details", label: "Details" },
                  ]}
                  {...repeaterHandlers("classroom_work_details")}
                  DialogComponent={(props) => (
                    <ClassroomWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="classroom-work"
                />
              </div>
            )}

            {/* 8. Tuberculosis (merged: three bullet points) */}
            <div className="space-y-2 pt-4">
              <Label className="block">Has any applicant:</Label>
              <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                <li>ever had, or currently have, tuberculosis?</li>
                <li>been in close contact with a family member that has active tuberculosis?</li>
                <li>ever had a chest x-ray which showed an abnormality?</li>
              </ul>
              <RadioGroup
                value={form.watch("had_tuberculosis")}
                onValueChange={(value) => form.setValue("had_tuberculosis", value)}
              >
                <div className="flex gap-4 pt-2">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`tb-${option}`} />
                      <Label htmlFor={`tb-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("had_tuberculosis") === "yes" && (
              <div className="mt-4 space-y-3">
                <RepeaterTable
                  data={form.watch("tuberculosis_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "details", label: "Details" },
                  ]}
                  {...repeaterHandlers("tuberculosis_details")}
                  DialogComponent={(props) => (
                    <TuberculosisDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="tuberculosis-details"
                />
              </div>
            )}

            {/* 9. Medical conditions */}
            <div className="space-y-3 pt-4">
              <Label className="block">
                During their proposed visit to Australia, does any applicant expect to incur medical costs, or require
                treatment or medical follow up for:
              </Label>
              <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                <li>blood disorder</li>
                <li>cancer</li>
                <li>heart disease</li>
                <li>hepatitis B or C and/or liver disease</li>
                <li>HIV infection, including AIDS</li>
                <li>kidney disease, including dialysis</li>
                <li>mental illness</li>
                <li>pregnancy</li>
                <li>respiratory disease that has required hospital admission or oxygen therapy</li>
                <li>other?</li>
              </ul>
              <RadioGroup
                value={form.watch("medical_condition")}
                onValueChange={(value) => form.setValue("medical_condition", value)}
              >
                <div className="flex gap-4 pt-2">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`conditions-${option}`} />
                      <Label htmlFor={`conditions-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {form.watch("medical_condition") === "yes" && (
                <div className="mt-4 space-y-3">
                  <RepeaterTable
                    data={form.watch("health_conditions_details") || []}
                    columns={[
                      { key: "applicant_name", label: "Name" },
                      { key: "condition", label: "Condition" },
                      { key: "details", label: "Details" },
                    ]}
                    {...repeaterHandlers("health_conditions_details")}
                    DialogComponent={(props) => (
                      <HealthConditionsDialog {...props} applicantOptions={applicantOptions} />
                    )}
                    addButtonText="Add"
                    testIdPrefix="health-condition"
                  />
                </div>
              )}
            </div>

            {/* 10. Ongoing medical care / assistive technology */}
            <div className="space-y-2 pt-4">
              <Label>
                Does any applicant require ongoing medical care or need special equipment, assistive technology or
                assistance from others for daily living?
              </Label>
              <RadioGroup
                value={form.watch("requires_assistance")}
                onValueChange={(value) => form.setValue("requires_assistance", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`assistance-${option}`} />
                      <Label htmlFor={`assistance-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {form.watch("requires_assistance") === "yes" && (
                <div className="mt-4 space-y-3">
                  <RepeaterTable
                    data={form.watch("medical_assistance_details") || []}
                    columns={[
                      { key: "applicant_name", label: "Name" },
                      { key: "details", label: "Details" },
                    ]}
                    {...repeaterHandlers("medical_assistance_details")}
                    DialogComponent={(props) => (
                      <AssistiveTechnologyDialog {...props} applicantOptions={applicantOptions} />
                    )}
                    addButtonText="Add"
                    testIdPrefix="medical-assistance"
                  />
                </div>
              )}
            </div>

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