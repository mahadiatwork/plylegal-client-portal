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
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { DateSelector } from "@/components/DateSelecters";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

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

const supportingWitnessDialogSchema = z.object({
  family_name: z.string().min(1, "Family Name is required"),
  given_names: z.string().min(1, "Given Names is required"),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  occupation: z.string().optional(),
  relationship_to_main_applicant: z.string().min(1, "Relationship to Main Applicant is required"),
  years_known_main_applicant: z.string().optional(),
  relationship_to_spouse: z.string().min(1, "Relationship to Spouse/Partner is required"),
  years_known_spouse: z.string().optional(),
  after_hours_phone_country_code: z.string().optional(),
  after_hours_phone_area_code: z.string().optional(),
  after_hours_phone_number: z.string().optional(),
  office_hours_phone_country_code: z.string().optional(),
  office_hours_phone_area_code: z.string().optional(),
  office_hours_phone_number: z.string().optional(),
  mobile_phone_country_code: z.string().optional(),
  mobile_phone_number: z.string().optional(),
  email_address: z.string().email("Invalid email address").optional().or(z.literal("")),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  suburb: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
});

function SupportingWitnessDialog({ editingRow, onSave, onCancel }) {
  // Get main applicant and spouse names for dynamic labels
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details');
  const mainApplicantName = mainApplicantDetails?.given_names && mainApplicantDetails?.family_name
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : mainApplicantDetails?.given_names || mainApplicantDetails?.family_name || "Main Applicant";

  const spousePartnerDetails = draftStore.getSectionData('spousePartner.details');
  const spouseName = spousePartnerDetails?.given_names && spousePartnerDetails?.family_name
    ? `${spousePartnerDetails.given_names} ${spousePartnerDetails.family_name}`
    : spousePartnerDetails?.given_names || spousePartnerDetails?.family_name || "Spouse/Partner";

  const dialogForm = useForm({
    resolver: zodResolver(supportingWitnessDialogSchema),
    defaultValues: editingRow || {
      family_name: "",
      given_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      occupation: "",
      relationship_to_main_applicant: "",
      years_known_main_applicant: "",
      relationship_to_spouse: "",
      years_known_spouse: "",
      after_hours_phone_country_code: "",
      after_hours_phone_area_code: "",
      after_hours_phone_number: "",
      office_hours_phone_country_code: "",
      office_hours_phone_area_code: "",
      office_hours_phone_number: "",
      mobile_phone_country_code: "",
      mobile_phone_number: "",
      email_address: "",
      address_line1: "",
      address_line2: "",
      suburb: "",
      state: "",
      postcode: "",
      country: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2 max-h-[90vh] overflow-y-auto"
    >
      <div className="mb-2">
        <p className="text-sm text-gray-600">
          Enter details of supporting witness of the relationship between you and your Spouse/Partner.
        </p>
      </div>

      {/* Personal Details Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Personal Details</h3>

        <Field
          type="text"
          name="family_name"
          control={dialogForm.control}
          label="Family Name"
          required
          data-testid="input-family-name"
        />

        <Field
          type="text"
          name="given_names"
          control={dialogForm.control}
          label="Given Names"
          required
          data-testid="input-given-names"
        />

        <Field
          type="radio"
          name="gender"
          control={dialogForm.control}
          label="Gender"
          options={[
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]}
        />

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

        <Field
          type="text"
          name="occupation"
          control={dialogForm.control}
          label="Occupation"
          data-testid="input-occupation"
        />
      </div>

      {/* Relationship Details Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">
          How does this Supporting Witness know the Main Applicant ({mainApplicantName}) and {spouseName}?
        </h3>

        <Field
          type="select"
          name="relationship_to_main_applicant"
          control={dialogForm.control}
          label={`This person is the Main Applicant (${mainApplicantName})'s:`}
          required
          options={RELATIONSHIP_OPTIONS.map(rel => ({ value: rel, label: rel }))}
          placeholder="Choose Relationship"
          data-testid="select-relationship-to-main-applicant"
        />

        <Field
          type="text"
          name="years_known_main_applicant"
          control={dialogForm.control}
          label={`Number of Years this person has known the Main Applicant (${mainApplicantName})`}
          data-testid="input-years-known-main-applicant"
        />

        <Field
          type="select"
          name="relationship_to_spouse"
          control={dialogForm.control}
          label={`This person is ${spouseName}'s:`}
          required
          options={RELATIONSHIP_OPTIONS.map(rel => ({ value: rel, label: rel }))}
          placeholder="Choose Relationship"
          data-testid="select-relationship-to-spouse"
        />

        <Field
          type="text"
          name="years_known_spouse"
          control={dialogForm.control}
          label={`Number of Years this person has known ${spouseName}`}
          data-testid="input-years-known-spouse"
        />
      </div>

      {/* Telephone and Email Contact Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Telephone and Email Contact</h3>

        <div>
          <Label className="mb-2 block">After Hours Phone Number</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Country Code"
              {...dialogForm.register("after_hours_phone_country_code")}
              data-testid="input-after-hours-country-code"
            />
            <Input
              placeholder="Area Code"
              {...dialogForm.register("after_hours_phone_area_code")}
              data-testid="input-after-hours-area-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("after_hours_phone_number")}
              data-testid="input-after-hours-number"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Office Hours Phone Number</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Country Code"
              {...dialogForm.register("office_hours_phone_country_code")}
              data-testid="input-office-hours-country-code"
            />
            <Input
              placeholder="Area Code"
              {...dialogForm.register("office_hours_phone_area_code")}
              data-testid="input-office-hours-area-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("office_hours_phone_number")}
              data-testid="input-office-hours-number"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Mobile Phone Number</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Country Code"
              {...dialogForm.register("mobile_phone_country_code")}
              data-testid="input-mobile-country-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("mobile_phone_number")}
              data-testid="input-mobile-number"
            />
          </div>
        </div>

        <Field
          type="email"
          name="email_address"
          control={dialogForm.control}
          label="Email Address"
          data-testid="input-email-address"
        />
      </div>

      {/* Residential Address Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">Residential Address</h3>
        <p className="text-sm text-gray-600">
          This must be a physical address, not a PO Box Number
        </p>

        <Field
          type="text"
          name="address_line1"
          control={dialogForm.control}
          label="Address (including Street Number and Name)"
          data-testid="input-address-line1"
        />

        <Field
          type="text"
          name="address_line2"
          control={dialogForm.control}
          label="Address Line 2"
          data-testid="input-address-line2"
        />

        <Field
          type="text"
          name="suburb"
          control={dialogForm.control}
          label="Suburb/Town/City"
          data-testid="input-suburb"
        />

        <Field
          type="text"
          name="state"
          control={dialogForm.control}
          label="State"
          data-testid="input-state"
        />

        <Field
          type="text"
          name="postcode"
          control={dialogForm.control}
          label="Postcode"
          data-testid="input-postcode"
        />

        <Field
          type="select"
          name="country"
          control={dialogForm.control}
          label="Choose Country"
          options={COUNTRIES.map(country => ({ value: country, label: country }))}
          placeholder="Choose Country"
          data-testid="select-country"
        />
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

const supportingWitnessesSchema = z.object({
  supporting_witnesses: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    gender: z.string().optional(),
    birth_day: z.string().optional(),
    birth_month: z.string().optional(),
    birth_year: z.string().optional(),
    occupation: z.string().optional(),
    relationship_to_main_applicant: z.string(),
    years_known_main_applicant: z.string().optional(),
    relationship_to_spouse: z.string(),
    years_known_spouse: z.string().optional(),
    after_hours_phone_country_code: z.string().optional(),
    after_hours_phone_area_code: z.string().optional(),
    after_hours_phone_number: z.string().optional(),
    office_hours_phone_country_code: z.string().optional(),
    office_hours_phone_area_code: z.string().optional(),
    office_hours_phone_number: z.string().optional(),
    mobile_phone_country_code: z.string().optional(),
    mobile_phone_number: z.string().optional(),
    email_address: z.string().optional(),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    suburb: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  })).min(2, "At least two supporting witnesses are required"),
});

export default function SupportingWitnessesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
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

  // Load section data from relationships.supportingWitnesses
  const sectionData = draftStore.getSectionData('relationships.supportingWitnesses');

  const form = useForm({
    resolver: zodResolver(supportingWitnessesSchema),
    mode: "onChange",
    defaultValues: {
      supporting_witnesses: sectionData?.supporting_witnesses || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values
  const supportingWitnesses = form.watch("supporting_witnesses") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        supporting_witnesses: sectionData.supporting_witnesses || [],
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
      draftStore.saveSectionData('relationships.supportingWitnesses', currentFormValues);
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
      const result = await draftStore.saveSectionData('relationships.supportingWitnesses', data);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/supporting-witnesses', null, 'relationships.supportingWitnesses');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        startNavigation(next);
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
    startNavigation(prev);
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

      const currentData = getValues();
      const result = await draftStore.saveSectionData('relationships.supportingWitnesses', currentData);

      if (result.success) {
        await draftStore.markPageComplete('partner/relationships/supporting-witnesses', null, 'relationships.supportingWitnesses');
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

  const updateSupportingWitnesses = (newWitnesses) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("supporting_witnesses", newWitnesses, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const currentData = getValues();
    draftStore.saveSectionData('relationships.supportingWitnesses', { 
      ...currentData,
      supporting_witnesses: newWitnesses 
    });
  };

  const witnessColumns = [
    {
      key: "name", label: "Name", format: (row) => {
        return `${row.given_names || ""} ${row.family_name || ""}`.trim();
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
    {
      key: "relationship", label: "Relationship", format: (row) => {
        const relToMain = row.relationship_to_main_applicant || "";
        const relToSpouse = row.relationship_to_spouse || "";
        if (relToMain && relToSpouse) {
          return `${relToMain} / ${relToSpouse}`;
        }
        return relToMain || relToSpouse || "";
      }
    },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Supporting Witnesses for Current Relationship</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Enter details of at least two supporting witness of the relationship between the main applicant and their spouse/partner.
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
            <RepeaterTable
              data={supportingWitnesses}
              columns={witnessColumns}
              onAdd={(row) => updateSupportingWitnesses([...supportingWitnesses, row])}
              onEdit={(index, row) => {
                const updated = [...supportingWitnesses];
                updated[index] = row;
                updateSupportingWitnesses(updated);
              }}
              onDelete={(index) => {
                const updated = supportingWitnesses.filter((_, i) => i !== index);
                updateSupportingWitnesses(updated);
              }}
              DialogComponent={SupportingWitnessDialog}
              addButtonText="Add"
              testIdPrefix="supporting-witness"
              dialogTitle="Supporting Witness"
            />
            {form.formState.errors.supporting_witnesses && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.supporting_witnesses.message}</p>
            )}

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

