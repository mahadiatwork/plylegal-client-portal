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

const formSchema = z.object({
  medical_condition: z.enum(["yes", "no"]).optional(),
  requires_assistance: z.enum(["yes", "no"]).optional(),
  health_insurance: z.enum(["yes", "no"]).optional(),
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
      medical_condition: "",
      requires_assistance: "",
      health_insurance: "",
      has_health_examinations: "",
      health_examinations: [],
      intends_hospital_entry: "",
      hospital_details: [],
      intends_healthcare_work: "",
      intends_aged_care: "",
      intends_childcare: "",
      intends_classroom: "",
      had_tuberculosis: "",
      close_contact_tb: "",
      health_conditions_list: [],
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_health || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, [draftSnap.draft?.temporary_work_health, form]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("temporary_work_health", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/health`, null, "temporary_work_health");
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

  return (
    <div className="min-h-screen bg-background">


      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Health</h1>
          <p className="text-muted-foreground mt-2">
            For everyone who is to be included in this application, provide the following details about their health.
          </p>
        </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {HEALTH_CONDITIONS.map((cond) => {
                    const selected = (form.watch("health_conditions_list") || []).includes(cond);
                    return (
                      <label key={cond} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            const current = form.watch("health_conditions_list") || [];
                            if (checked) {
                              if (!current.includes(cond)) {
                                form.setValue("health_conditions_list", [...current, cond], {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                });
                              }
                            } else {
                              form.setValue(
                                "health_conditions_list",
                                current.filter((c) => c !== cond),
                                { shouldDirty: true, shouldTouch: true }
                              );
                            }
                          }}
                        />
                        <span>{cond}</span>
                      </label>
                    );
                  })}
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
            </div>

            {/* Private health insurance */}
            <div className="space-y-2">
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
      </div>
    </div>
  );
}
