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
import { Checkbox } from "@/components/ui/checkbox";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
const formSchema = z.object({
  medical_condition: z.enum(["yes", "no"]).optional(),
  requires_assistance: z.enum(["yes", "no"]).optional(),
  health_insurance: z.enum(["yes", "no"]).optional(),
  has_health_examinations: z.enum(["yes", "no"]).optional(),
  health_examinations: z.array(z.any()).optional(),
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
  close_contact_tb: z.enum(["yes", "no"]).optional(),
  tuberculosis_exposure_details: z.array(z.any()).optional(),
  health_conditions_details: z.array(z.any()).optional(),
  health_conditions_list: z.array(z.string()).optional(),
  medical_assistance_details: z.array(z.any()).optional(),
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
const HOSPITAL_REASONS = ["Give Birth", "Training", "Treatment", "Visiting", "Work", "Other"];
const HEALTH_CONDITIONS = [
  "Blood disorder",
  "Cancer",
  "Cardiac (heart) condition",
  "Diabetes",
  "Disability (physical or intellectual)",
  "Hospitalisation (any cause)",
  "Kidney disease (including dialysis)",
  "Liver disease (including hepatitis or cirrhosis)",
  "Mental illness",
  "Neurological condition",
  "Pregnancy",
  "Respiratory condition (including asthma)",
  "Other",
];
const HEALTH_CARE_ROLES = [
  "Amb Ambulance Officer / Paramedic",
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
  "Other",
];
const AGED_CARE_ROLES = ["Aged Care", "Disability Care", "Other"];
const CHILDCARE_ROLES = ["Childcare Worker", "Teacher", "Trainee", "Volunteer", "Other"];
const COURSE_TYPES = [
  "Secondary",
  "Diploma/Certificate",
  "Bachelor's",
  "Master's",
  "Doctorate/PhD",
  "Other",
];
const formatDate = (day, month, year) => {
  if (!day || !month || !year) return "";
  return `${day} ${month} ${year}`;
};
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
        Enter details of any applicant included in this application who has undertaken a Health Examination
        for an Australian visa in the past 12 months.
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function HospitalDetailsDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    reason: z.string().min(1, "Reason is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        reason: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Hospital and Health Care Details</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who intends to enter any Australian private or
        public Hospital or Health Care facilities including nursing homes as a patient, visitor, employee or a trainee.
        A Health Care environment does not include a private doctor or dentist surgery.
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Reason</Label>
        <Select value={dialogForm.watch("reason")} onValueChange={(value) => dialogForm.setValue("reason", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent>
            {HOSPITAL_REASONS.map((reason) => (
              <SelectItem key={reason} value={reason}>
                {reason}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Health Care Work</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who intends to work as, or study or train to be, a
        health care worker or work within a health care facility while in Australia
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Aged and Disability Care Work</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who intends to work, study or train within aged care,
        or disability care while in Australia
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function ChildcareWorkDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    institution: z.string().optional(),
    role: z.string().min(1, "Role is required"),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        institution: "",
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Childcare Details</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who intends to work, or be a trainee, at a Childcare
        Centre (including pre-schools and creches) while in Australia.
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Institution (if known)</Label>
        <Input {...dialogForm.register("institution")} />
      </div>
      <div>
        <Label className="mb-2 block">Role</Label>
        <Select value={dialogForm.watch("role")} onValueChange={(value) => dialogForm.setValue("role", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Role" />
          </SelectTrigger>
          <SelectContent>
            {CHILDCARE_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function ClassroomWorkDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    course_type: z.string().min(1, "Course type is required"),
    course_name: z.string().optional(),
    institution: z.string().optional(),
    start_date_day: z.string().optional(),
    start_date_month: z.string().optional(),
    start_date_year: z.string().optional(),
    end_date_day: z.string().optional(),
    end_date_month: z.string().optional(),
    end_date_year: z.string().optional(),
    details: z.string().optional(),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues:
      editingRow || {
        applicant_name: "",
        course_type: "",
        course_name: "",
        institution: "",
        start_date_day: "",
        start_date_month: "",
        start_date_year: "",
        end_date_day: "",
        end_date_month: "",
        end_date_year: "",
        details: "",
      },
  });
  const handleSubmit = (data) => {
    onSave({
      ...data,
      start_date_display: formatDate(data.start_date_day, data.start_date_month, data.start_date_year),
      end_date_display: formatDate(data.end_date_day, data.end_date_month, data.end_date_year),
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Classroom Details</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who intends to be in a Classroom situation for more
        than 3 months (as a student, teacher, lecturer, or observer, etc) in Australia
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Course Type</Label>
        <Select value={dialogForm.watch("course_type")} onValueChange={(value) => dialogForm.setValue("course_type", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose Course Type" />
          </SelectTrigger>
          <SelectContent>
            {COURSE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="mb-2 block">Course Name</Label>
        <Input {...dialogForm.register("course_name")} />
      </div>
      <div>
        <Label className="mb-2 block">Institution</Label>
        <Input {...dialogForm.register("institution")} />
      </div>
      <div>
        <Label className="mb-2 block">Start Date</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("start_date_day")}
            onValueChange={(value) => dialogForm.setValue("start_date_day", value)}
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
            value={dialogForm.watch("start_date_month")}
            onValueChange={(value) => dialogForm.setValue("start_date_month", value)}
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
            value={dialogForm.watch("start_date_year")}
            onValueChange={(value) => dialogForm.setValue("start_date_year", value)}
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
        <Label className="mb-2 block">End Date</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("end_date_day")}
            onValueChange={(value) => dialogForm.setValue("end_date_day", value)}
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
            value={dialogForm.watch("end_date_month")}
            onValueChange={(value) => dialogForm.setValue("end_date_month", value)}
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
            value={dialogForm.watch("end_date_year")}
            onValueChange={(value) => dialogForm.setValue("end_date_year", value)}
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
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Tuberculosis Details</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who has ever had or currently has Tuberculosis or had a
        chest X-ray which showed an abnormality
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function TuberculosisExposureDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Tuberculosis Exposure Details</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who has ever been in close contact at home or at work
        with a person who has had Tuberculosis
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function HealthConditionsDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    condition: z.string().min(1, "Health Condition is required"),
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Health Conditions</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who has any of the following Health Conditions that may
        incur medical costs, require treatment or medical follow up. Enter details of each condition including the expected
        medical costs, treatments or follow-up required.
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Health Condition</Label>
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
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
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
      <h3 className="text-base font-bold text-gray-900 mb-2">Assistive Technology and Activities of Daily Living</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant who requires health or community care
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Details</Label>
        <Textarea rows={3} {...dialogForm.register("details")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
function HealthInsuranceDialog({ editingRow, onSave, onCancel, applicantOptions = [] }) {
  const dialogSchema = z.object({
    applicant_name: z.string().min(1, "Name of applicant is required"),
    type_of_cover: z.string().optional(),
    insurer: z.string().optional(),
    policy_number: z.string().optional(),
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
        type_of_cover: "",
        insurer: "",
        policy_number: "",
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
      date_from_display: formatDate(data.date_from_day, data.date_from_month, data.date_from_year),
      date_to_display: formatDate(data.date_to_day, data.date_to_month, data.date_to_year),
    });
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Health Insurance</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter details of any applicant included in this application who holds Private Health Insurance that will cover them
        during their stay in Australia
      </p>
      <div>
        <Label className="mb-2 block">
          Name of Applicant <span className="text-red-600">*</span>
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
        <Label className="mb-2 block">Type of Cover</Label>
        <Input {...dialogForm.register("type_of_cover")} />
      </div>
      <div>
        <Label className="mb-2 block">Insurer</Label>
        <Input {...dialogForm.register("insurer")} />
      </div>
      <div>
        <Label className="mb-2 block">Insurance Policy Number</Label>
        <Input {...dialogForm.register("policy_number")} />
      </div>
      <div>
        <Label className="mb-2 block">Date From</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_from_day")}
            onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
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
            value={dialogForm.watch("date_from_month")}
            onValueChange={(value) => dialogForm.setValue("date_from_month", value)}
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
            value={dialogForm.watch("date_from_year")}
            onValueChange={(value) => dialogForm.setValue("date_from_year", value)}
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
        <Label className="mb-2 block">Date To</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_to_day")}
            onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
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
            value={dialogForm.watch("date_to_month")}
            onValueChange={(value) => dialogForm.setValue("date_to_month", value)}
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
            value={dialogForm.watch("date_to_year")}
            onValueChange={(value) => dialogForm.setValue("date_to_year", value)}
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
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">
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
  // Build applicant name options from main applicant, spouse/partner, and children draft data
  const applicantOptions = (() => {
    const opts = [];
    const buildLabel = (family, given, day, month, year) => {
      const name = [family, given].filter(Boolean).join(" ").trim();
      const dob = [day, month, year].filter(Boolean).join(" ");
      if (!name) return "";
      return dob ? `${name} (DOB: ${dob})` : name;
    };
    // Main applicant
    const main = draftStore.getSectionData('mainApplicant.details');
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
    const spouse = draftStore.getSectionData('spousePartner.details');
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
    const childrenData = draftStore.getSectionData('mainApplicant.family')?.children || [];
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
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      // If we have applicationId in store but not in URL, update URL to include it
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medical_condition: "no",
      requires_assistance: "no",
      health_insurance: "no",
      has_health_examinations: "no",
      health_examinations: [],
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
      close_contact_tb: "no",
      tuberculosis_exposure_details: [],
      health_conditions_list: [], // Keeping for backward compatibility if needed, or remove if fully deprecated
      medical_assistance_details: [],
      health_insurance_details: [],
    },
  });
  useEffect(() => {
    const savedData = draftSnap.draft?.partner_health || {};
    if (Object.keys(savedData).length > 0 && !form.formState.isDirty) {
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
          "close_contact_tb"
        ].includes(key)) {
          value = "no";
        }
        if (value !== undefined && value !== null) {
          form.setValue(key, value);
        }
      });
    }
  }, [draftSnap.draft?.partner_health, form]);
  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("partner_health", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/health`, null, "partner_health");
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
      const result = await draftStore.saveSectionData("partner_health", values);
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
        <CardTitle className="text-2xl font-semibold">Health</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          For everyone who is to be included in this application, provide the following details about their health.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            {/* Health examinations */}
            <div className="space-y-2">
              <Label>
                Has anyone who is to be included in this application undertaken a Health Examination for an Australian
                visa in the past 12 months?
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
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who has undertaken a Health Examination for
                  an Australian visa in the past 12 months.
                </p>
                <RepeaterTable
                  data={form.watch("health_examinations") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "date_completed_display", label: "Date Completed" },
                    { key: "country_of_exam", label: "Country" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("health_examinations") || [];
                    form.setValue("health_examinations", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("health_examinations") || [])];
                    current[index] = updatedRow;
                    form.setValue("health_examinations", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("health_examinations") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("health_examinations", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <HealthExamDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="health-exam"
                />
              </div>
            )}
            {/* Hospital / Health care facility */}
            <div className="pt-4 space-y-2">
              <Label>
                Does any applicant intend to enter a Hospital or Health Care Facility (including nursing home) while in
                Australia?
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
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who intends to enter any Australian
                  private or public Hospital or Health Care facilities including nursing homes as a patient, visitor,
                  employee or a trainee. A Health Care environment does not include a private doctor or dentist surgery.
                </p>
                <RepeaterTable
                  data={form.watch("hospital_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "reason", label: "Reason" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("hospital_details") || [];
                    form.setValue("hospital_details", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("hospital_details") || [])];
                    current[index] = updatedRow;
                    form.setValue("hospital_details", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("hospital_details") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("hospital_details", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <HospitalDetailsDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="hospital"
                />
              </div>
            )}
            {/* Work / study questions */}
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
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who intends to work as, or study or train to
                  be, a health care worker or work within a health care facility while in Australia
                </p>
                <RepeaterTable
                  data={form.watch("healthcare_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "role", label: "Role" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("healthcare_work_details") || [];
                    form.setValue("healthcare_work_details", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("healthcare_work_details") || [])];
                    current[index] = updatedRow;
                    form.setValue("healthcare_work_details", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("healthcare_work_details") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("healthcare_work_details", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <HealthCareWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="healthcare-work"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>
                Does any applicant intend to work, study or train with aged care, or disability care while in Australia?
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
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who intends to work, study or train within
                  aged care, or disability care while in Australia
                </p>
                <RepeaterTable
                  data={form.watch("aged_care_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "role", label: "Role" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("aged_care_work_details") || [];
                    form.setValue("aged_care_work_details", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("aged_care_work_details") || [])];
                    current[index] = updatedRow;
                    form.setValue("aged_care_work_details", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("aged_care_work_details") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("aged_care_work_details", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <AgedCareWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="aged-care-work"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>
                Does any applicant intend to work at, or be a trainee at a Childcare Centre (including preschools and
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
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who intends to work, or be a trainee, at a
                  Childcare Centre (including pre-schools and creches) while in Australia.
                </p>
                <RepeaterTable
                  data={form.watch("childcare_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "role", label: "Role" },
                    { key: "institution", label: "Institution" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("childcare_work_details") || [];
                    form.setValue("childcare_work_details", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("childcare_work_details") || [])];
                    current[index] = updatedRow;
                    form.setValue("childcare_work_details", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("childcare_work_details") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("childcare_work_details", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <ChildcareWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="childcare-work"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>
                Does any applicant intend to be in a Classroom situation for more than 3 months in their usual country
                of passport in the last 5 years?
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
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who intends to be in a Classroom situation
                  for more than 3 months (as a student, teacher, lecturer, or observer, etc) in Australia
                </p>
                <RepeaterTable
                  data={form.watch("classroom_work_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "course_type", label: "Course Type" },
                    { key: "institution", label: "Institution" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("classroom_work_details") || [];
                    form.setValue("classroom_work_details", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("classroom_work_details") || [])];
                    current[index] = updatedRow;
                    form.setValue("classroom_work_details", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("classroom_work_details") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("classroom_work_details", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <ClassroomWorkDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="classroom-work"
                />
              </div>
            )}
            {/* Tuberculosis questions */}
            <div className="space-y-2 pt-4">
              <Label>
                Has any applicant ever had or currently have Tuberculosis or had a chest X-ray which showed an
                abnormality?
              </Label>
              <RadioGroup
                value={form.watch("had_tuberculosis")}
                onValueChange={(value) => form.setValue("had_tuberculosis", value)}
              >
                <div className="flex gap-4">
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
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who has ever had or currently has Tuberculosis
                  or had a chest X-ray which showed an abnormality
                </p>
                <RepeaterTable
                  data={form.watch("tuberculosis_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "details", label: "Details" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("tuberculosis_details") || [];
                    form.setValue("tuberculosis_details", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("tuberculosis_details") || [])];
                    current[index] = updatedRow;
                    form.setValue("tuberculosis_details", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("tuberculosis_details") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("tuberculosis_details", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <TuberculosisDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="tuberculosis-details"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>
                Has any applicant been in close contact at home or at work with a person who has had Tuberculosis?
              </Label>
              <RadioGroup
                value={form.watch("close_contact_tb")}
                onValueChange={(value) => form.setValue("close_contact_tb", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`tb-contact-${option}`} />
                      <Label htmlFor={`tb-contact-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {form.watch("close_contact_tb") === "yes" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Enter details of any applicant included in this application who has ever been in close contact at home or
                  at work with a person who has had Tuberculosis
                </p>
                <RepeaterTable
                  data={form.watch("tuberculosis_exposure_details") || []}
                  columns={[
                    { key: "applicant_name", label: "Name" },
                    { key: "details", label: "Details" },
                  ]}
                  onAdd={(row) => {
                    const current = form.watch("tuberculosis_exposure_details") || [];
                    form.setValue("tuberculosis_exposure_details", [...current, row], {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(form.watch("tuberculosis_exposure_details") || [])];
                    current[index] = updatedRow;
                    form.setValue("tuberculosis_exposure_details", current, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  onDelete={(index) => {
                    const current = form.watch("tuberculosis_exposure_details") || [];
                    const updated = current.filter((_, i) => i !== index);
                    form.setValue("tuberculosis_exposure_details", updated, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }}
                  DialogComponent={(props) => (
                    <TuberculosisExposureDialog {...props} applicantOptions={applicantOptions} />
                  )}
                  addButtonText="Add"
                  testIdPrefix="tuberculosis-exposure"
                />
              </div>
            )}
            {/* Health conditions list */}
            <div className="space-y-3 pt-4">
              <Label>
                Does any applicant have any of the following Health Conditions that may incur medical costs, require
                treatment or medical supervision while in Australia?
              </Label>
              <RadioGroup
                value={form.watch("medical_condition")}
                onValueChange={(value) => form.setValue("medical_condition", value)}
              >
                <div className="flex gap-4">
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
                  <p className="text-sm text-gray-600">
                    Enter details of any applicant included in this application who has any of the following Health
                    Conditions that may incur medical costs, require treatment or medical follow up. Enter details of each
                    condition including the expected medical costs, treatments or follow-up required.
                  </p>
                  <div className="text-sm text-gray-600 mb-2 pl-2 border-l-2 border-gray-300">
                    Conditions to report: {HEALTH_CONDITIONS.join(", ")}
                  </div>
                  <RepeaterTable
                    data={form.watch("health_conditions_details") || []}
                    columns={[
                      { key: "applicant_name", label: "Name" },
                      { key: "condition", label: "Condition" },
                      { key: "details", label: "Details" },
                    ]}
                    onAdd={(row) => {
                      const current = form.watch("health_conditions_details") || [];
                      form.setValue("health_conditions_details", [...current, row], {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    onEdit={(index, updatedRow) => {
                      const current = [...(form.watch("health_conditions_details") || [])];
                      current[index] = updatedRow;
                      form.setValue("health_conditions_details", current, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    onDelete={(index) => {
                      const current = form.watch("health_conditions_details") || [];
                      const updated = current.filter((_, i) => i !== index);
                      form.setValue("health_conditions_details", updated, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    DialogComponent={(props) => (
                      <HealthConditionsDialog {...props} applicantOptions={applicantOptions} />
                    )}
                    addButtonText="Add"
                    testIdPrefix="health-condition"
                  />
                </div>
              )}
            </div>
            {/* Ongoing medical care */}
            <div className="space-y-2 pt-4">
              <Label>
                Does any applicant require ongoing medical care or need special equipment, assistive technology or
                assistance from others for their daily living?
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
                  <p className="text-sm text-gray-600">
                    Enter details of any applicant included in this application who requires ongoing medical care or need
                    special equipment, assistive technology or assistance from others for their daily living
                  </p>
                  <RepeaterTable
                    data={form.watch("medical_assistance_details") || []}
                    columns={[
                      { key: "applicant_name", label: "Name" },
                      { key: "details", label: "Details" },
                    ]}
                    onAdd={(row) => {
                      const current = form.watch("medical_assistance_details") || [];
                      form.setValue("medical_assistance_details", [...current, row], {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    onEdit={(index, updatedRow) => {
                      const current = [...(form.watch("medical_assistance_details") || [])];
                      current[index] = updatedRow;
                      form.setValue("medical_assistance_details", current, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    onDelete={(index) => {
                      const current = form.watch("medical_assistance_details") || [];
                      const updated = current.filter((_, i) => i !== index);
                      form.setValue("medical_assistance_details", updated, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    DialogComponent={(props) => (
                      <AssistiveTechnologyDialog {...props} applicantOptions={applicantOptions} />
                    )}
                    addButtonText="Add"
                    testIdPrefix="medical-assistance"
                  />
                </div>
              )}
            </div>
            {/* Private health insurance */}
            {/* <div className="space-y-2">
              <Label>
                Does any applicant hold Private Health Insurance that will cover them during their stay in Australia?
              </Label>
              <RadioGroup
                value={form.watch("health_insurance")}
                onValueChange={(value) => form.setValue("health_insurance", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`insurance-${option}`} />
                      <Label htmlFor={`insurance-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {form.watch("health_insurance") === "yes" && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-600">
                    Enter details of any applicant included in this application who holds Private Health Insurance that will
                    cover them during their stay in Australia
                  </p>
                  <RepeaterTable
                    data={form.watch("health_insurance_details") || []}
                    columns={[
                      { key: "applicant_name", label: "Name" },
                      { key: "type_of_cover", label: "Type of Cover" },
                      { key: "insurer", label: "Insurer" },
                    ]}
                    onAdd={(row) => {
                      const current = form.watch("health_insurance_details") || [];
                      form.setValue("health_insurance_details", [...current, row], {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    onEdit={(index, updatedRow) => {
                      const current = [...(form.watch("health_insurance_details") || [])];
                      current[index] = updatedRow;
                      form.setValue("health_insurance_details", current, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    onDelete={(index) => {
                      const current = form.watch("health_insurance_details") || [];
                      const updated = current.filter((_, i) => i !== index);
                      form.setValue("health_insurance_details", updated, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      });
                    }}
                    DialogComponent={(props) => (
                      <HealthInsuranceDialog {...props} applicantOptions={applicantOptions} />
                    )}
                    addButtonText="Add"
                    testIdPrefix="health-insurance"
                  />
                </div>
              )}
            </div> */}
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