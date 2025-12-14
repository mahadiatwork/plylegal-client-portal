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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";

const ASSESSMENT_OUTCOMES = ["Positive", "Negative", "Unexpected", "Pending", "Other"];
const ASSESSMENT_TYPES = ["Full Skills Assessment", "Provisional Skills Assessment", "Job Ready Program", "Points Test Advice", "Other"];

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

function RegistrationDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    authority: z.string().min(1, "Name of Authority is required"),
    title: z.string().min(1, "Title/Name of Licence is required"),
    licence_number: z.string().min(1, "Licence/Registration Number is required"),
    english_requirement: z.enum(["yes", "no"]),
    english_requirement_details: z.string().optional(),
    occupation: z.string().min(1, "Occupation is required"),
    country: z.string().min(1, "Country is required"),
    issue_date_day: z.string().min(1, "Day is required"),
    issue_date_month: z.string().min(1, "Month is required"),
    issue_date_year: z.string().min(1, "Year is required"),
    expiry_date_day: z.string().optional(),
    expiry_date_month: z.string().optional(),
    expiry_date_year: z.string().optional(),
  }).refine((data) => {
    if (data.english_requirement === "yes" && !data.english_requirement_details?.trim()) {
      return false;
    }
    return true;
  }, {
    message: "Details are required",
    path: ["english_requirement_details"],
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      authority: "",
      title: "",
      licence_number: "",
      english_requirement: "no",
      english_requirement_details: "",
      occupation: "",
      country: "",
      issue_date_day: "",
      issue_date_month: "",
      issue_date_year: "",
      expiry_date_day: "",
      expiry_date_month: "",
      expiry_date_year: "",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div>
        <Label htmlFor="authority" className="mb-2 block">Name of Authority granting Licence or Registration or Membership</Label>
        <Input
          id="authority"
          {...dialogForm.register("authority")}
          data-testid="input-authority"
        />
        {dialogForm.formState.errors.authority && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.authority.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="title" className="mb-2 block">Title/Name of Licence or Registration or Membership</Label>
        <Input
          id="title"
          {...dialogForm.register("title")}
          data-testid="input-title"
        />
        {dialogForm.formState.errors.title && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="licence_number" className="mb-2 block">Licence/Registration Number</Label>
        <Input
          id="licence_number"
          {...dialogForm.register("licence_number")}
          data-testid="input-licence-number"
        />
        {dialogForm.formState.errors.licence_number && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.licence_number.message}</p>
        )}
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">
          Is there an English Language Requirement associated with obtaining this registration/licence?
        </Label>
        <RadioGroup
          value={dialogForm.watch("english_requirement")}
          onValueChange={(value) => dialogForm.setValue("english_requirement", value)}
          className="flex gap-4"
          data-testid="radio-english-requirement"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="english-yes" />
            <Label htmlFor="english-yes" className="ml-2 cursor-pointer font-normal">
              Yes
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="english-no" />
            <Label htmlFor="english-no" className="ml-2 cursor-pointer font-normal">
              No
            </Label>
          </div>
        </RadioGroup>
      </div>

      {dialogForm.watch("english_requirement") === "yes" && (
        <div>
          <Label htmlFor="english_requirement_details" className="mb-2 block">Enter details of the language requirement</Label>
          <Textarea
            id="english_requirement_details"
            {...dialogForm.register("english_requirement_details")}
            rows={3}
            data-testid="textarea-english-details"
          />
          {dialogForm.formState.errors.english_requirement_details && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.english_requirement_details.message}</p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="occupation" className="mb-2 block">Occupation</Label>
        <Input
          id="occupation"
          {...dialogForm.register("occupation")}
          data-testid="input-occupation"
        />
        {dialogForm.formState.errors.occupation && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.occupation.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Country of Licence or Registration or Membership</Label>
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

      <div>
        <Label className="mb-2 block">Issue Date</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("issue_date_day")}
            onValueChange={(value) => dialogForm.setValue("issue_date_day", value)}
          >
            <SelectTrigger data-testid="select-issue-date-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("issue_date_month")}
            onValueChange={(value) => dialogForm.setValue("issue_date_month", value)}
          >
            <SelectTrigger data-testid="select-issue-date-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("issue_date_year")}
            onValueChange={(value) => dialogForm.setValue("issue_date_year", value)}
          >
            <SelectTrigger data-testid="select-issue-date-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.issue_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.issue_date_day.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Expiry Date (If applicable)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("expiry_date_day")}
            onValueChange={(value) => dialogForm.setValue("expiry_date_day", value)}
          >
            <SelectTrigger data-testid="select-expiry-date-day">
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
            <SelectTrigger data-testid="select-expiry-date-month">
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
            <SelectTrigger data-testid="select-expiry-date-year">
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

function AssessmentDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    assessing_authority: z.string().min(1, "Name of Skills Assessing Authority is required"),
    assessment_type: z.string().min(1, "Type of Skills Assessment is required"),
    anzsco_code: z.string().min(1, "ANZSCO Code is required"),
    lodgement_date_day: z.string().min(1, "Day is required"),
    lodgement_date_month: z.string().min(1, "Month is required"),
    lodgement_date_year: z.string().min(1, "Year is required"),
    receipt_number: z.string().optional(),

    // Outcome section
    outcome: z.string().min(1, "Outcome is required"),
    outcome_date_day: z.string().optional(),
    outcome_date_month: z.string().optional(),
    outcome_date_year: z.string().optional(),
    outcome_reference_number: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      assessing_authority: "",
      assessment_type: "",
      anzsco_code: "",
      lodgement_date_day: "",
      lodgement_date_month: "",
      lodgement_date_year: "",
      receipt_number: "",
      outcome: "",
      outcome_date_day: "",
      outcome_date_month: "",
      outcome_date_year: "",
      outcome_reference_number: "",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Skills Assessment</h3>
      <p className="text-sm text-gray-500 mb-4">Enter details of the Skill Assessment you have applied for</p>

      {/* Authority */}
      <div>
        <Label htmlFor="assessing_authority" className="mb-2 block">Name of Skills Assessing Authority</Label>
        <Input
          id="assessing_authority"
          {...dialogForm.register("assessing_authority")}
          data-testid="input-assessing-authority"
        />
        {dialogForm.formState.errors.assessing_authority && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.assessing_authority.message}</p>
        )}
      </div>

      {/* Type */}
      <div>
        <Label className="mb-2 block">Type of Skills Assessment</Label>
        <Select
          value={dialogForm.watch("assessment_type")}
          onValueChange={(value) => dialogForm.setValue("assessment_type", value)}
        >
          <SelectTrigger data-testid="select-assessment-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {ASSESSMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.assessment_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.assessment_type.message}</p>
        )}
      </div>

      {/* ANZSCO Code */}
      <div>
        <Label htmlFor="anzsco_code" className="mb-2 block">ANZSCO Code</Label>
        <Input
          id="anzsco_code"
          {...dialogForm.register("anzsco_code")}
          data-testid="input-anzsco-code"
        />
        {dialogForm.formState.errors.anzsco_code && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.anzsco_code.message}</p>
        )}
      </div>

      {/* Lodgement Date */}
      <div>
        <Label className="mb-2 block">Logement Date</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("lodgement_date_day")}
            onValueChange={(value) => dialogForm.setValue("lodgement_date_day", value)}
          >
            <SelectTrigger data-testid="select-lodgement-date-day">
              <SelectValue placeholder="Choose Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("lodgement_date_month")}
            onValueChange={(value) => dialogForm.setValue("lodgement_date_month", value)}
          >
            <SelectTrigger data-testid="select-lodgement-date-month">
              <SelectValue placeholder="Choose Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("lodgement_date_year")}
            onValueChange={(value) => dialogForm.setValue("lodgement_date_year", value)}
          >
            <SelectTrigger data-testid="select-lodgement-date-year">
              <SelectValue placeholder="Choose Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.lodgement_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.lodgement_date_day.message}</p>
        )}
      </div>

      {/* Receipt Number */}
      <div>
        <Label htmlFor="receipt_number" className="mb-2 block">Receipt Number</Label>
        <Input
          id="receipt_number"
          {...dialogForm.register("receipt_number")}
          data-testid="input-receipt-number"
        />
      </div>

      <div className="pt-4 pb-2">
        <h3 className="text-base font-bold text-gray-900 mb-2">Assessment Outcome</h3>
        <p className="text-sm text-gray-500 mb-4">Enter details on the outcome of the Skills Assessment</p>

        {/* Outcome */}
        <div className="mb-4">
          <Label className="mb-2 block">Outcome</Label>
          <Select
            value={dialogForm.watch("outcome")}
            onValueChange={(value) => dialogForm.setValue("outcome", value)}
          >
            <SelectTrigger data-testid="select-outcome">
              <SelectValue placeholder="Choose Outcome" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OUTCOMES.map((outcome) => (
                <SelectItem key={outcome} value={outcome}>{outcome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.outcome && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.outcome.message}</p>
          )}
        </div>

        {/* Outcome Date */}
        <div className="mb-4">
          <Label className="mb-2 block">Outcome Date</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("outcome_date_day")}
              onValueChange={(value) => dialogForm.setValue("outcome_date_day", value)}
            >
              <SelectTrigger data-testid="select-outcome-date-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("outcome_date_month")}
              onValueChange={(value) => dialogForm.setValue("outcome_date_month", value)}
            >
              <SelectTrigger data-testid="select-outcome-date-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("outcome_date_year")}
              onValueChange={(value) => dialogForm.setValue("outcome_date_year", value)}
            >
              <SelectTrigger data-testid="select-outcome-date-year">
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

        {/* Outcome Reference Number */}
        <div className="mb-4">
          <Label htmlFor="outcome_reference_number" className="mb-2 block">Outcome Reference Number</Label>
          <Input
            id="outcome_reference_number"
            {...dialogForm.register("outcome_reference_number")}
            data-testid="input-outcome-reference-number"
          />
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

export default function SkillsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const draft = draftSnap.draft;

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftStore.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams]);

  const form = useForm({
    defaultValues: {
      has_occupational_registration: "no",
      registrations: [],
      has_skills_assessment: "no",
      assessments: [],
    }
  });

  const hasOccupationalRegistration = form.watch("has_occupational_registration");
  const hasSkillsAssessment = form.watch("has_skills_assessment");
  const registrations = form.watch("registrations") || [];
  const assessments = form.watch("assessments") || [];

  useEffect(() => {
    const savedData = draft.temporary_work_skills || {};
    if (Object.keys(savedData).length > 0) {
      form.reset(savedData);
    }
  }, [draft.temporary_work_skills, form]);

  const handleSave = async () => {
    const formData = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_skills", formData);

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
  };

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_skills", data);
    const visaType = getVisaTypeFromPath(pathname);
    draftStore.markPageComplete(`${visaType}/main-applicant/skills`);

    const nextRoute = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
    if (nextRoute) {
      router.push(nextRoute);
    }
  };

  const handlePrevious = () => {
    const visaType = getVisaTypeFromPath(pathname);
    const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
    if (previousRoute) {
      router.push(previousRoute);
    }
  };

  return (
    <div className="min-h-screen bg-[#E0E7FF]">


      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Q1: Do you hold any Occupational Registrations */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Do you hold any Occupational Registrations, Licences or Professional Memberships?
                </Label>
                <RadioGroup
                  value={hasOccupationalRegistration}
                  onValueChange={(value) => form.setValue("has_occupational_registration", value)}
                  className="flex gap-4"
                  data-testid="radio-occupational-registration"
                >
                  <div className="flex items-center" data-testid="radio-occupational-registration-yes">
                    <RadioGroupItem value="yes" id="registration-yes" />
                    <Label htmlFor="registration-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center" data-testid="radio-occupational-registration-no">
                    <RadioGroupItem value="no" id="registration-no" />
                    <Label htmlFor="registration-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>

                {/* Registrations Repeater (shown if Yes) */}
                {hasOccupationalRegistration === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Registrations/Licences</h3>
                    <RepeaterTable
                      data={registrations}
                      columns={[
                        { key: "authority", label: "Authority" },
                        { key: "title", label: "Title" },
                        { key: "licence_number", label: "Licence Number" },
                        { key: "issue_date_year", label: "Year" },
                        { key: "country", label: "Country" },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...registrations, newRow];
                        form.setValue("registrations", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...registrations];
                        updated[index] = updatedRow;
                        form.setValue("registrations", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onDelete={(index) => {
                        const updated = registrations.filter((_, i) => i !== index);
                        form.setValue("registrations", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      DialogComponent={RegistrationDialog}
                      addButtonText="Add"
                      testIdPrefix="registration"
                    />
                  </div>
                )}
              </div>

              {/* Q2: Have you applied for a Skills Assessment */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Have you applied for a Skills Assessment from an Australian Skills Assessing body?
                </Label>
                <RadioGroup
                  value={hasSkillsAssessment}
                  onValueChange={(value) => form.setValue("has_skills_assessment", value)}
                  className="flex gap-4"
                  data-testid="radio-skills-assessment"
                >
                  <div className="flex items-center" data-testid="radio-skills-assessment-yes">
                    <RadioGroupItem value="yes" id="assessment-yes" />
                    <Label htmlFor="assessment-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center" data-testid="radio-skills-assessment-no">
                    <RadioGroupItem value="no" id="assessment-no" />
                    <Label htmlFor="assessment-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>

                {/* Skills Assessments Repeater (shown if Yes) */}
                {hasSkillsAssessment === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills Assessments</h3>
                    <RepeaterTable
                      data={assessments}
                      columns={[
                        { key: "assessing_authority", label: "Authority" },
                        { key: "assessment_type", label: "Type" },
                        { key: "anzsco_code", label: "ANZSCO" },
                        { key: "outcome", label: "Outcome" },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...assessments, newRow];
                        form.setValue("assessments", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...assessments];
                        updated[index] = updatedRow;
                        form.setValue("assessments", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      onDelete={(index) => {
                        const updated = assessments.filter((_, i) => i !== index);
                        form.setValue("assessments", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }}
                      DialogComponent={AssessmentDialog}
                      addButtonText="Add"
                      testIdPrefix="assessment"
                    />
                  </div>
                )}
              </div>
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={draftSnap.isSaving}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
