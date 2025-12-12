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

const REGISTRATION_TYPES = ["Registration", "Licence", "Professional Membership", "Other"];
const ASSESSMENT_OUTCOMES = ["Positive", "Negative", "Pending", "Other"];

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
    type: z.string().min(1, "Type is required"),
    occupation: z.string().min(1, "Occupation is required"),
    date_day: z.string().min(1, "Day is required"),
    date_month: z.string().min(1, "Month is required"),
    date_year: z.string().min(1, "Year is required"),
    authority: z.string().min(1, "Authority is required"),
    country: z.string().min(1, "Country is required"),
    reference: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      type: "",
      occupation: "",
      date_day: "",
      date_month: "",
      date_year: "",
      authority: "",
      country: "",
      reference: "",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Type *</Label>
        <Select
          value={dialogForm.watch("type")}
          onValueChange={(value) => dialogForm.setValue("type", value)}
        >
          <SelectTrigger data-testid="select-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {REGISTRATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="occupation" className="mb-2 block">Occupation *</Label>
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
        <Label className="mb-2 block">Date *</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_day")}
            onValueChange={(value) => dialogForm.setValue("date_day", value)}
          >
            <SelectTrigger data-testid="select-date-day">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_month")}
            onValueChange={(value) => dialogForm.setValue("date_month", value)}
          >
            <SelectTrigger data-testid="select-date-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_year")}
            onValueChange={(value) => dialogForm.setValue("date_year", value)}
          >
            <SelectTrigger data-testid="select-date-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_day.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="authority" className="mb-2 block">Authority/Issuing Body *</Label>
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
        <Label className="mb-2 block">Country *</Label>
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
        <Label htmlFor="reference" className="mb-2 block">Reference/Number</Label>
        <Input
          id="reference"
          {...dialogForm.register("reference")}
          data-testid="input-reference"
        />
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
    assessing_authority: z.string().min(1, "Assessing authority is required"),
    occupation: z.string().min(1, "Occupation is required"),
    reference_number: z.string().optional(),
    outcome: z.string().min(1, "Outcome is required"),
    outcome_date_day: z.string().optional(),
    outcome_date_month: z.string().optional(),
    outcome_date_year: z.string().optional(),
    comments: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      assessing_authority: "",
      occupation: "",
      reference_number: "",
      outcome: "",
      outcome_date_day: "",
      outcome_date_month: "",
      outcome_date_year: "",
      comments: "",
    }
  });

  const outcome = dialogForm.watch("outcome");

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="assessing_authority" className="mb-2 block">Assessing Authority *</Label>
        <Input
          id="assessing_authority"
          {...dialogForm.register("assessing_authority")}
          data-testid="input-assessing-authority"
        />
        {dialogForm.formState.errors.assessing_authority && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.assessing_authority.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="occupation" className="mb-2 block">Occupation (ANZSCO if available) *</Label>
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
        <Label htmlFor="reference_number" className="mb-2 block">Application/Reference Number</Label>
        <Input
          id="reference_number"
          {...dialogForm.register("reference_number")}
          data-testid="input-reference-number"
        />
      </div>

      <div>
        <Label className="mb-2 block">Outcome *</Label>
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

      {outcome !== "Pending" && (
        <div>
          <Label className="mb-2 block">Outcome Date *</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("outcome_date_day")}
              onValueChange={(value) => dialogForm.setValue("outcome_date_day", value)}
            >
              <SelectTrigger data-testid="select-outcome-date-day">
                <SelectValue placeholder="Day" />
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
                <SelectValue placeholder="Month" />
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
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="comments" className="mb-2 block">Comments/Notes</Label>
        <Textarea
          id="comments"
          {...dialogForm.register("comments")}
          rows={3}
          data-testid="textarea-comments"
        />
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
                        { key: "type", label: "Type" },
                        { key: "occupation", label: "Occupation" },
                        { key: "date_day", label: "Date", format: (row) => `${row.date_day}/${row.date_month}/${row.date_year}` },
                        { key: "authority", label: "Authority" },
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
                        { key: "occupation", label: "Occupation" },
                        { key: "outcome_date_day", label: "Outcome Date", format: (row) => row.outcome_date_day ? `${row.outcome_date_day}/${row.outcome_date_month}/${row.outcome_date_year}` : "Pending" },
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
