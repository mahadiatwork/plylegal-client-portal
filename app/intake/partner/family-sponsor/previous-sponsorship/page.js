"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";

const VISA_SUBCLASS_OPTIONS = [
  "100", "101", "102", "103", "104", "105", "106", "108", "109", "110",
  "115", "116", "117", "118", "119", "120", "121", "124", "125", "126",
  "127", "128", "129", "130", "131", "132", "134", "135", "136", "137",
  "138", "139", "143", "144", "151", "152", "155", "156", "157", "158",
  "159", "160", "161", "162", "163", "164", "165", "173", "174", "175",
  "176", "177", "200", "201", "202", "203", "204", "300", "309", "310",
  "400", "401", "402", "403", "404", "405", "406", "407", "408", "410",
  "411", "415", "416", "417", "418", "419", "420", "421", "422", "423",
  "424", "425", "426", "427", "428", "442", "444", "445", "447", "449",
  "450", "451", "456", "457", "461", "462", "476", "482", "485", "489",
  "491", "494", "500", "570", "571", "572", "573", "574", "575", "576",
  "580", "590", "600", "601", "602", "651", "676", "679", "771", "773",
  "785", "790", "820", "825", "826", "827", "828", "829", "830", "831",
  "832", "833", "834", "835", "836", "837", "838", "839", "840", "841",
  "842", "843", "844", "845", "846", "847", "848", "849", "850", "851",
  "852", "853", "854", "855", "856", "857", "858", "859", "860", "861",
  "862", "863", "864", "865", "866", "867", "868", "869", "870", "884",
  "885", "886", "887", "888", "890", "891", "892", "893", "895", "896",
  "897", "898", "899"
];

const OUTCOME_OPTIONS = [
  "Granted",
  "Pending",
  "Refused",
  "Withdrawn"
];

const RELATIONSHIP_OPTIONS = [
  "Acquaintance",
  "Adopted Child",
  "Adopted Parent",
  "Associate",
  "Child",
  "Child-in-Law",
  "Cousin",
  "Former Spouse/Partner",
  "Friend",
  "Grand-Child",
  "Grand-Parent",
  "Guardian",
  "Half-Sibling",
  "Niece or Nephew",
  "Other",
  "Parent",
  "Parent-in-Law",
  "Sibling",
  "Sister/Brother-in-Law",
  "Spouse/Partner",
  "Step-Child",
  "Step-Grandchild",
  "Step-Grandparent",
  "Step-Niece or Step-Nephew",
  "Step-Parent",
  "Step-Sibling",
  "Step-Uncle or Step-Aunt",
  "Uncle or Aunt",
  "Ward"
];

const previousSponsorshipDialogSchema = z.object({
  visa_subclass: z.string().min(1, "Visa Subclass is required"),
  application_date_day: z.string().min(1, "Day is required"),
  application_date_month: z.string().min(1, "Month is required"),
  application_date_year: z.string().min(1, "Year is required"),
  office_applied_at: z.string().optional(),
  outcome: z.string().min(1, "Outcome is required"),
  decision_date_day: z.string().optional(),
  decision_date_month: z.string().optional(),
  decision_date_year: z.string().optional(),

  // Person details
  person_mode: z.string().optional(),
  selected_person: z.string().optional(),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  relationship: z.string().optional(),
}).superRefine((data, ctx) => {
  // If any part of Decision Date is filled, all parts must be filled
  const hasDecisionDay = data.decision_date_day && data.decision_date_day.trim() !== "";
  const hasDecisionMonth = data.decision_date_month && data.decision_date_month.trim() !== "";
  const hasDecisionYear = data.decision_date_year && data.decision_date_year.trim() !== "";

  if (hasDecisionDay || hasDecisionMonth || hasDecisionYear) {
    if (!hasDecisionDay || !hasDecisionMonth || !hasDecisionYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All date parts must be completed or left empty",
        path: ["decision_date_day"],
      });
    } else {
      // Validate that Decision Date is not earlier than Application Date
      const appDate = new Date(
        parseInt(data.application_date_year),
        parseInt(data.application_date_month) - 1,
        parseInt(data.application_date_day)
      );
      const decisionDate = new Date(
        parseInt(data.decision_date_year),
        parseInt(data.decision_date_month) - 1,
        parseInt(data.decision_date_day)
      );

      if (decisionDate < appDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Decision Date must not be earlier than Application Date",
          path: ["decision_date_day"],
        });
      }
    }
  }

  // Validate based on mode
  const mode = data.person_mode || "select";

  if (mode === "select") {
    if (!data.selected_person || data.selected_person.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a person",
        path: ["selected_person"],
      });
    }
  } else {
    // Add mode - validate required fields
    if (!data.family_name || data.family_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Family Name is required",
        path: ["family_name"],
      });
    }
    if (!data.given_names || data.given_names.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Given Names is required",
        path: ["given_names"],
      });
    }
    if (!data.gender || data.gender === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gender is required",
        path: ["gender"],
      });
    } else if (data.gender !== "Male" && data.gender !== "Female") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gender must be Male or Female",
        path: ["gender"],
      });
    }
    if (!data.relationship || data.relationship.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Relationship is required",
        path: ["relationship"],
      });
    }
  }
});

function PreviousSponsorshipDialog({ editingRow, onSave, onCancel }) {
  // Use isMounted to prevent hydration mismatch when reading from store
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Safe access to store data
  const rawSponsorDetails = draftStore.getSectionData('familySponsor.details') || {};
  const sponsorDetails = isMounted ? rawSponsorDetails : {};

  const sponsorName = sponsorDetails.given_names && sponsorDetails.family_name
    ? `${sponsorDetails.given_names} ${sponsorDetails.family_name}`
    : sponsorDetails.given_names || sponsorDetails.family_name || "the sponsor";

  const [personMode, setPersonMode] = useState(editingRow?.family_name || editingRow?.given_names ? "add" : "select");
  const [selectedPerson, setSelectedPerson] = useState(editingRow?.selected_person || "");

  const dialogForm = useForm({
    resolver: zodResolver(previousSponsorshipDialogSchema),
    defaultValues: {
      ...editingRow,
      visa_subclass: editingRow?.visa_subclass || "",
      application_date_day: editingRow?.application_date_day || "",
      application_date_month: editingRow?.application_date_month || "",
      application_date_year: editingRow?.application_date_year || "",
      office_applied_at: editingRow?.office_applied_at || "",
      outcome: editingRow?.outcome || "",
      decision_date_day: editingRow?.decision_date_day || "",
      decision_date_month: editingRow?.decision_date_month || "",
      decision_date_year: editingRow?.decision_date_year || "",
      family_name: editingRow?.family_name || "",
      given_names: editingRow?.given_names || "",
      gender: editingRow?.gender || "",
      birth_day: editingRow?.birth_day || "",
      birth_month: editingRow?.birth_month || "",
      birth_year: editingRow?.birth_year || "",
      relationship: editingRow?.relationship || "",
      selected_person: editingRow?.selected_person || "",
      person_mode: (editingRow?.family_name || editingRow?.given_names) ? "add" : "select",
    },
  });

  useEffect(() => {
    if (editingRow?.family_name || editingRow?.given_names) {
      setPersonMode("add");
      dialogForm.setValue("person_mode", "add");
    } else if (editingRow?.selected_person) {
      setPersonMode("select");
      setSelectedPerson(editingRow.selected_person);
      dialogForm.setValue("person_mode", "select");
    }
  }, [editingRow, dialogForm]);

  const handleFormSubmit = (data) => {
    // If select mode, include selected_person; if add mode, include person details
    const finalData = {
      ...data,
      selected_person: personMode === "select" ? selectedPerson : "",
    };
    onSave(finalData);
  };

  // Get available people from the application (main applicant, spouse, children, family members)
  const getAvailablePeople = () => {
    if (!isMounted) return []; // Return empty during SSR/Hydration

    const people = [];

    // Main applicant
    const mainApplicant = draftStore.getSectionData('mainApplicant.details');
    if (mainApplicant?.given_names && mainApplicant?.family_name) {
      people.push({
        id: 'main-applicant',
        name: `${mainApplicant.given_names} ${mainApplicant.family_name}`,
        type: 'Main Applicant'
      });
    }

    // Spouse/Partner
    const spouse = draftStore.getSectionData('spousePartner.details');
    if (spouse?.given_names && spouse?.family_name) {
      people.push({
        id: 'spouse-partner',
        name: `${spouse.given_names} ${spouse.family_name}`,
        type: 'Spouse/Partner'
      });
    }

    // Children
    const children = draftStore.getSectionData('mainApplicant.family')?.children || [];
    children.forEach((child, index) => {
      if (child.given_names && child.family_name) {
        people.push({
          id: `child-${index}`,
          name: `${child.given_names} ${child.family_name}`,
          type: 'Child'
        });
      }
    });

    // Family members
    const familyMembers = draftStore.getSectionData('familySponsor.details')?.family_members || [];
    familyMembers.forEach((member, index) => {
      if (member.given_names && member.family_name) {
        people.push({
          id: `family-member-${index}`,
          name: `${member.given_names} ${member.family_name}`,
          type: 'Family Member'
        });
      }
    });

    return people;
  };

  const availablePeople = getAvailablePeople();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          Enter details of the Visa your Sponsor has applied to sponsor
        </p>
      </div>

      {/* Previous Sponsorship Details */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Previous Sponsorship Details</h3>

        <div>
          <Label htmlFor="visa_subclass">
            Subclass of Visa sponsored <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("visa_subclass")}
            onValueChange={(value) => dialogForm.setValue("visa_subclass", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-visa-subclass">
              <SelectValue placeholder="Choose Subclass" />
            </SelectTrigger>
            <SelectContent>
              {VISA_SUBCLASS_OPTIONS.map((subclass) => (
                <SelectItem key={subclass} value={subclass}>{subclass}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.visa_subclass && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.visa_subclass.message}</p>
          )}
        </div>

        <DateSelector
          label="Application Date"
          values={{
            day: dialogForm.watch("application_date_day") || "",
            month: dialogForm.watch("application_date_month") || "",
            year: dialogForm.watch("application_date_year") || "",
          }}
          onValueChange={(type, value) => {
            const fieldName = `application_date_${type}`;
            dialogForm.setValue(fieldName, value, { shouldValidate: true });
          }}
          testIdPrefix="select-application-date"
          required
        />
        {(dialogForm.formState.errors.application_date_day || dialogForm.formState.errors.application_date_month || dialogForm.formState.errors.application_date_year) && (
          <p className="text-sm text-red-600 mt-1">Application Date is required</p>
        )}

        <div>
          <Label htmlFor="office_applied_at">Office Applied At</Label>
          <Input
            id="office_applied_at"
            {...dialogForm.register("office_applied_at")}
            data-testid="input-office-applied-at"
          />
        </div>

        <div>
          <Label htmlFor="outcome">
            Outcome <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("outcome")}
            onValueChange={(value) => dialogForm.setValue("outcome", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-outcome">
              <SelectValue placeholder="Choose Outcome" />
            </SelectTrigger>
            <SelectContent>
              {OUTCOME_OPTIONS.map((outcome) => (
                <SelectItem key={outcome} value={outcome}>{outcome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.outcome && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.outcome.message}</p>
          )}
        </div>

        <DateSelector
          label="Decision Date"
          values={{
            day: dialogForm.watch("decision_date_day") || "",
            month: dialogForm.watch("decision_date_month") || "",
            year: dialogForm.watch("decision_date_year") || "",
          }}
          onValueChange={(type, value) => {
            const fieldName = `decision_date_${type}`;
            dialogForm.setValue(fieldName, value, { shouldValidate: true });
          }}
          testIdPrefix="select-decision-date"
        />
        {dialogForm.formState.errors.decision_date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.decision_date_day.message}</p>
        )}
      </div>

      {/* Who was previously Sponsored? */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Who was previously Sponsored?</h3>
        <p className="text-sm text-gray-600">
          Provide details of the person who was sponsored by either selecting an existing person or add the details of a new Person
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={personMode === "select" ? "default" : "outline"}
            onClick={() => {
              setPersonMode("select");
              dialogForm.setValue("person_mode", "select");
              dialogForm.setValue("family_name", "");
              dialogForm.setValue("given_names", "");
              dialogForm.setValue("gender", "");
              dialogForm.setValue("birth_day", "");
              dialogForm.setValue("birth_month", "");
              dialogForm.setValue("birth_year", "");
              dialogForm.setValue("relationship", "");
              dialogForm.clearErrors(); // Clear errors from previous mode
            }}
            data-testid="button-select-person"
          >
            Select
          </Button>
          <Button
            type="button"
            variant={personMode === "add" ? "default" : "outline"}
            onClick={() => {
              setPersonMode("add");
              dialogForm.setValue("person_mode", "add");
              setSelectedPerson("");
              dialogForm.setValue("selected_person", "");
              dialogForm.clearErrors(); // Clear errors from previous mode
            }}
            data-testid="button-add-person"
          >
            Add
          </Button>
        </div>

        {personMode === "select" && (
          <div>
            <Label className="mb-2 block">
              Select the person who was previously sponsored by your Sponsor
            </Label>
            <Select
              value={selectedPerson}
              onValueChange={(value) => {
                setSelectedPerson(value);
                dialogForm.setValue("selected_person", value, { shouldValidate: true });
              }}
            >
              <SelectTrigger data-testid="select-person">
                <SelectValue placeholder="Choose Person" />
              </SelectTrigger>
              <SelectContent>
                {availablePeople.map((person) => (
                  <SelectItem key={person.id} value={person.id}>{person.name} ({person.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dialogForm.formState.errors.selected_person && (
              <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.selected_person.message}</p>
            )}
          </div>
        )}

        {personMode === "add" && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-base font-semibold text-gray-900">Personal Details</h3>

            <div>
              <Label htmlFor="family_name">
                Family Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="family_name"
                {...dialogForm.register("family_name")}
                data-testid="input-family-name"
              />
              {dialogForm.formState.errors.family_name && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.family_name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="given_names">
                Given Names <span className="text-red-500">*</span>
              </Label>
              <Input
                id="given_names"
                {...dialogForm.register("given_names")}
                data-testid="input-given-names"
              />
              {dialogForm.formState.errors.given_names && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.given_names.message}</p>
              )}
            </div>

            <div>
              <Label>Gender <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={dialogForm.watch("gender")}
                onValueChange={(value) => dialogForm.setValue("gender", value, { shouldValidate: true })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Male" id="gender-male" />
                  <Label htmlFor="gender-male" className="cursor-pointer">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Female" id="gender-female" />
                  <Label htmlFor="gender-female" className="cursor-pointer">Female</Label>
                </div>
              </RadioGroup>
              {dialogForm.formState.errors.gender && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.gender.message}</p>
              )}
            </div>

            <DateSelector
              label="Date of Birth"
              values={{
                day: dialogForm.watch("birth_day") || "",
                month: dialogForm.watch("birth_month") || "",
                year: dialogForm.watch("birth_year") || "",
              }}
              onValueChange={(type, value) => {
                const fieldName = `birth_${type}`;
                dialogForm.setValue(fieldName, value);
              }}
              testIdPrefix="select-birth"
            />

            <div>
              <Label htmlFor="relationship">
                This person is {sponsorName}'s: <span className="text-red-500">*</span>
              </Label>
              <Select
                value={dialogForm.watch("relationship")}
                onValueChange={(value) => dialogForm.setValue("relationship", value, { shouldValidate: true })}
              >
                <SelectTrigger data-testid="select-relationship">
                  <SelectValue placeholder="Choose Relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dialogForm.formState.errors.relationship && (
                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary text-primary-foreground"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

const familySponsorPreviousSponsorshipSchema = z.object({
  has_previous_sponsorship: z.enum(["Yes", "No"]).optional(),
  previous_sponsorships: z.array(z.object({
    visa_subclass: z.string(),
    application_date_day: z.string().optional(),
    application_date_month: z.string().optional(),
    application_date_year: z.string().optional(),
    office_applied_at: z.string().optional(),
    outcome: z.string(),
    decision_date_day: z.string().optional(),
    decision_date_month: z.string().optional(),
    decision_date_year: z.string().optional(),
    family_name: z.string().optional(),
    given_names: z.string().optional(),
    gender: z.string().optional(),
    birth_day: z.string().optional(),
    birth_month: z.string().optional(),
    birth_year: z.string().optional(),
    relationship: z.string().optional(),
    selected_person: z.string().optional(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If has previous sponsorship, require at least one entry
  if (data.has_previous_sponsorship === "Yes" && (!data.previous_sponsorships || data.previous_sponsorships.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one previous sponsorship entry is required",
      path: ["previous_sponsorships"],
    });
  }
});

export default function FamilySponsorPreviousSponsorshipPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);

  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  // Load section data from familySponsor.details
  const rawSectionData = draftStore.getSectionData('familySponsor.details');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only use data after mount to prevent hydration mismatch
  const sectionData = isMounted ? rawSectionData : {};

  // Get sponsor name for display
  const sponsorName = sectionData?.given_names && sectionData?.family_name
    ? `${sectionData.given_names} ${sectionData.family_name}`
    : sectionData?.given_names || sectionData?.family_name || "the sponsor";

  const form = useForm({
    resolver: zodResolver(familySponsorPreviousSponsorshipSchema),
    mode: "onChange",
    defaultValues: {
      has_previous_sponsorship: sectionData?.has_previous_sponsorship || "No",
      previous_sponsorships: sectionData?.previous_sponsorships || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values for conditional rendering
  const hasPreviousSponsorship = form.watch("has_previous_sponsorship");
  const previousSponsorships = form.watch("previous_sponsorships") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        has_previous_sponsorship: sectionData.has_previous_sponsorship || "No",
        previous_sponsorships: sectionData.previous_sponsorships || [],
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset, isDirty]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) {
      console.warn('No application ID set for auto-save');
      return;
    }
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    if (draftSnap.isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentFormValues = getValues();
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const mergedData = { ...existingData, ...currentFormValues };

      draftStore.saveSectionData('familySponsor.details', mergedData);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading, getValues]);

  const onSubmit = async (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);
    try {
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const finalData = {
        ...existingData,
        ...data,
      };

      const result = await draftStore.saveSectionData('familySponsor.details', finalData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/previous-sponsorship', null, 'familySponsor.details');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        if (next) router.push(next);
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
        setIsSaving(false);
      }
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const isValid = await form.trigger();

      if (!isValid) {
        console.log("Validation Errors:", form.formState.errors);
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const currentData = getValues();
      const mergedData = { ...existingData, ...currentData };

      const result = await draftStore.saveSectionData('familySponsor.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/previous-sponsorship', null, 'familySponsor.details');
        toast({
          title: "Draft saved",
          description: "Progress saved successfully.",
        });
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreviousSponsorships = (newSponsorships) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("previous_sponsorships", newSponsorships, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', {
      ...existingData,
      ...currentData,
      previous_sponsorships: newSponsorships
    });
  };

  const sponsorshipColumns = [
    {
      key: "name", label: "Name", format: (row) => {
        if (row.selected_person) {
          // Try to get name from selected person
          const people = [];
          const mainApplicant = draftStore.getSectionData('mainApplicant.details');
          if (mainApplicant?.given_names && mainApplicant?.family_name) {
            people.push({ id: 'main-applicant', name: `${mainApplicant.given_names} ${mainApplicant.family_name}` });
          }
          const spouse = draftStore.getSectionData('spousePartner.details');
          if (spouse?.given_names && spouse?.family_name) {
            people.push({ id: 'spouse-partner', name: `${spouse.given_names} ${spouse.family_name}` });
          }
          const children = draftStore.getSectionData('mainApplicant.family')?.children || [];
          children.forEach((child, idx) => {
            if (child.given_names && child.family_name) {
              people.push({ id: `child-${idx}`, name: `${child.given_names} ${child.family_name}` });
            }
          });
          const familyMembers = draftStore.getSectionData('familySponsor.details')?.family_members || [];
          familyMembers.forEach((member, idx) => {
            if (member.given_names && member.family_name) {
              people.push({ id: `family-member-${idx}`, name: `${member.given_names} ${member.family_name}` });
            }
          });
          const person = people.find(p => p.id === row.selected_person);
          if (person) return person.name;
        }
        if (row.given_names || row.family_name) {
          return `${row.given_names || ""} ${row.family_name || ""}`.trim();
        }
        return "";
      }
    },
    {
      key: "date_of_birth", label: "Date of Birth", format: (row) => {
        if (row.birth_day && row.birth_month && row.birth_year) {
          const monthIdx = parseInt(row.birth_month) - 1;
          return `${monthNames[monthIdx]} ${row.birth_day}, ${row.birth_year}`;
        }
        return "";
      }
    },
    { key: "visa_subclass", label: "Visa Subclass" },
    {
      key: "decision_date", label: "Decision Date", format: (row) => {
        if (row.decision_date_day && row.decision_date_month && row.decision_date_year) {
          const monthIdx = parseInt(row.decision_date_month) - 1;
          return `${monthNames[monthIdx]} ${row.decision_date_day}, ${row.decision_date_year}`;
        }
        return "";
      }
    },
    { key: "outcome", label: "Outcome" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Previous Sponsorship</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about your sponsor's previous sponsorships.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {/* Question: Has your Family Sponsor previously sponsored or nominated anyone for an Australian Visa? */}
            <div>
              <Field
                type="radio"
                name="has_previous_sponsorship"
                control={form.control}
                label="Has your Family Sponsor previously sponsored or nominated anyone for an Australian Visa?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {hasPreviousSponsorship === "Yes" && (
                <div className="mt-4">
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    Previous Sponsorships for {sponsorName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all Visitor/Tourist Visas your Sponsor has sponsored
                  </p>
                  <RepeaterTable
                    data={previousSponsorships}
                    columns={sponsorshipColumns}
                    onAdd={(row) => updatePreviousSponsorships([...previousSponsorships, row])}
                    onEdit={(index, row) => {
                      const updated = [...previousSponsorships];
                      updated[index] = row;
                      updatePreviousSponsorships(updated);
                    }}
                    onDelete={(index) => {
                      const updated = previousSponsorships.filter((_, i) => i !== index);
                      updatePreviousSponsorships(updated);
                    }}
                    DialogComponent={PreviousSponsorshipDialog}
                    addButtonText="Add"
                    testIdPrefix="previous-sponsorship"
                    dialogTitle="Previous Sponsorship"
                  />
                  {form.formState.errors.previous_sponsorships && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.previous_sponsorships.message}</p>
                  )}
                </div>
              )}
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={form.handleSubmit(onSubmit)}
              disabledNext={!form.formState.isValid}
              loading={isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </>
  );
}

