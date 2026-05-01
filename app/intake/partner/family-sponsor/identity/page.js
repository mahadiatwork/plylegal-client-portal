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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { DateSelector } from "@/components/DateSelecters";
import { COUNTRIES } from "@/reuseable/countries";
import { monthNames } from "@/reuseable/months";
import { z } from "zod";
import { useForm as useDialogForm } from "react-hook-form";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const CITIZENSHIP_REASON_OPTIONS = ["Birth", "Descent", "Naturalisation", "Other"];
const PASSPORT_TYPE_OPTIONS = ["Passport", "Emergency Passport", "Travel Document"];
const GENDER_OPTIONS = ["Male", "Female", "X/Unspecified"];
const DOCUMENT_STATUS_OPTIONS = ["Current", "Expired", "Lost", "Stolen", "Cancelled", "Damaged"];
const CITIZENSHIP_CEASED_REASON_OPTIONS = ["Renounced", "Cancelled", "Other"];

const familySponsorIdentitySchema = z.object({
  citizen_of_country: z.enum(["Yes", "No"]).optional(),
  stateless_explanation: z.string().optional(),
  citizenships: z.array(z.object({
    country: z.string(),
    obtained_method: z.string(),
    date_obtained_day: z.string().optional(),
    date_obtained_month: z.string().optional(),
    date_obtained_year: z.string().optional(),
    still_citizen: z.string().optional(),
    date_ceased_day: z.string().optional(),
    date_ceased_month: z.string().optional(),
    date_ceased_year: z.string().optional(),
    reason: z.string().optional(),
  })).optional(),
  has_passport: z.enum(["Yes", "No"]).optional(),
  passports: z.array(z.object({
    document_type: z.string(),
    document_number: z.string(),
    passport_country: z.string(),
    place_of_issue: z.string(),
    nationality: z.string(),
    gender: z.string(),
    name: z.string().optional(),
    family_name: z.string().optional(),
    given_names: z.string().optional(),
    date_issued_day: z.string().optional(),
    date_issued_month: z.string().optional(),
    date_issued_year: z.string().optional(),
    is_original_date: z.string().optional(),
    original_date_day: z.string().optional(),
    original_date_month: z.string().optional(),
    original_date_year: z.string().optional(),
    date_expiry_day: z.string().optional(),
    date_expiry_month: z.string().optional(),
    date_expiry_year: z.string().optional(),
    document_status: z.string(),
  })).optional(),
}).superRefine((data, ctx) => {
  // If not a citizen, stateless explanation is required
  if (data.citizen_of_country === "No" && (!data.stateless_explanation || data.stateless_explanation.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Stateless explanation is required when your sponsor is not a citizen of any country",
      path: ["stateless_explanation"],
    });
  }
  
  // If is current citizen, require at least one citizenship entry
  if (data.citizen_of_country === "Yes" && (!data.citizenships || data.citizenships.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one citizenship is required",
      path: ["citizenships"],
    });
  }
  
  // If has passport, require at least one passport entry
  if (data.has_passport === "Yes" && (!data.passports || data.passports.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one passport/travel document is required",
      path: ["passports"],
    });
  }
});

function CitizenshipDialog({ editingRow, onSave, onCancel }) {
  const [stillCitizen, setStillCitizen] = useState(editingRow?.still_citizen || "Yes");

  const dialogForm = useDialogForm({
    defaultValues: editingRow || {
      country: "",
      obtained_method: "",
      date_obtained_day: "",
      date_obtained_month: "",
      date_obtained_year: "",
      still_citizen: "Yes",
      date_ceased_day: "",
      date_ceased_month: "",
      date_ceased_year: "",
      reason: "",
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
      className="space-y-4 px-1"
    >
      <div>
        <Label htmlFor="country">Country of Citizenship</Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-citizenship-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="obtained_method">How was this Citizenship obtained?</Label>
        <Select
          value={dialogForm.watch("obtained_method")}
          onValueChange={(value) => dialogForm.setValue("obtained_method", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-how-obtained">
            <SelectValue placeholder="Choose Reason" />
          </SelectTrigger>
          <SelectContent>
            {CITIZENSHIP_REASON_OPTIONS.map((reason) => (
              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.obtained_method && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.obtained_method.message}</p>
        )}
      </div>

      <DateSelector
        label="Date Obtained"
        values={{
          day: dialogForm.watch("date_obtained_day") || "",
          month: dialogForm.watch("date_obtained_month") || "",
          year: dialogForm.watch("date_obtained_year") || "",
        }}
        onValueChange={(type, value) => {
          const fieldName = `date_obtained_${type}`;
          dialogForm.setValue(fieldName, value);
        }}
        testIdPrefix="select-obtained"
      />

      <div>
        <Label className="mb-2 block">Is your sponsor still a Citizen of this country?</Label>
        <RadioGroup
          value={stillCitizen}
          onValueChange={(val) => {
            setStillCitizen(val);
            dialogForm.setValue("still_citizen", val);
          }}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Yes" id="still_citizen_yes" />
            <Label htmlFor="still_citizen_yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="No" id="still_citizen_no" />
            <Label htmlFor="still_citizen_no">No</Label>
          </div>
        </RadioGroup>
      </div>

      {stillCitizen === "No" && (
        <>
          <DateSelector
            label="Date ceased"
            values={{
              day: dialogForm.watch("date_ceased_day") || "",
              month: dialogForm.watch("date_ceased_month") || "",
              year: dialogForm.watch("date_ceased_year") || "",
            }}
            onValueChange={(type, value) => {
              const fieldName = `date_ceased_${type}`;
              dialogForm.setValue(fieldName, value);
            }}
            testIdPrefix="select-ceased"
          />

          <div>
            <Label>Reason</Label>
            <Select
              value={dialogForm.watch("reason")}
              onValueChange={(value) => dialogForm.setValue("reason", value)}
            >
              <SelectTrigger><SelectValue placeholder="Choose Reason" /></SelectTrigger>
              <SelectContent>
                {CITIZENSHIP_CEASED_REASON_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-primary text-primary-foreground" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

function PassportDialog({ editingRow, onSave, onCancel }) {
  const initialIsOriginal = editingRow?.is_original_date !== undefined ? (editingRow.is_original_date === "Yes" || editingRow.is_original_date === "yes" ? "Yes" : "No") : "Yes";
  const [isOriginalDate, setIsOriginalDate] = useState(initialIsOriginal);
  const [nameOption, setNameOption] = useState(editingRow?.name ? "select" : "manual");

  const dialogForm = useDialogForm({
    defaultValues: editingRow || {
      document_type: "",
      document_number: "",
      passport_country: "",
      place_of_issue: "",
      nationality: "",
      gender: "",
      name: "",
      family_name: "",
      given_names: "",
      date_issued_day: "",
      date_issued_month: "",
      date_issued_year: "",
      is_original_date: "Yes",
      original_date_day: "",
      original_date_month: "",
      original_date_year: "",
      date_expiry_day: "",
      date_expiry_month: "",
      date_expiry_year: "",
      document_status: "",
    },
  });

  useEffect(() => {
    if (editingRow?.is_original_date !== undefined) {
      const value = editingRow.is_original_date === "Yes" || editingRow.is_original_date === "yes" ? "Yes" : "No";
      setIsOriginalDate(value);
      dialogForm.setValue("is_original_date", value);
    }
    if (editingRow?.name) {
      setNameOption("select");
    } else if (editingRow?.family_name || editingRow?.given_names) {
      setNameOption("manual");
    }
  }, [editingRow, dialogForm]);

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  // Get sponsor's other names for the dropdown
  const sponsorDetails = draftStore.getSectionData('familySponsor.details');
  const otherNames = sponsorDetails?.other_names || [];
  const sponsorName = sponsorDetails?.given_names && sponsorDetails?.family_name
    ? `${sponsorDetails.given_names} ${sponsorDetails.family_name}`
    : null;
  
  const nameOptions = sponsorName ? [sponsorName] : [];
  otherNames.forEach(name => {
    if (name.family_name && name.given_names) {
      nameOptions.push(`${name.given_names} ${name.family_name}`);
    }
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <div>
        <Label htmlFor="document_type">Type of Document</Label>
        <Select
          value={dialogForm.watch("document_type")}
          onValueChange={(value) => dialogForm.setValue("document_type", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {PASSPORT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.document_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="document_number">Passport/Document Number</Label>
        <Input
          id="document_number"
          {...dialogForm.register("document_number")}
          data-testid="input-passport-number"
        />
        {dialogForm.formState.errors.document_number && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_number.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="passport_country">Passport Country</Label>
        <Select
          value={dialogForm.watch("passport_country")}
          onValueChange={(value) => dialogForm.setValue("passport_country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.passport_country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.passport_country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="place_of_issue">Place of Issue / Issuing Authority</Label>
        <Input
          id="place_of_issue"
          {...dialogForm.register("place_of_issue")}
          data-testid="input-place-of-issue"
        />
        {dialogForm.formState.errors.place_of_issue && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.place_of_issue.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="nationality">Nationality</Label>
        <Select
          value={dialogForm.watch("nationality")}
          onValueChange={(value) => dialogForm.setValue("nationality", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-nationality">
            <SelectValue placeholder="Choose Nationality" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.nationality && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.nationality.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="gender">Gender as shown on this document</Label>
        <Select
          value={dialogForm.watch("gender")}
          onValueChange={(value) => dialogForm.setValue("gender", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-passport-gender">
            <SelectValue placeholder="Choose Gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((gender) => (
              <SelectItem key={gender} value={gender}>{gender}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.gender && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.gender.message}</p>
        )}
      </div>

      <div>
        <Label className="block mb-2">Name</Label>
        <p className="text-sm text-gray-600 mb-2">
          Enter the name that is shown on the document. The name entered <strong>must</strong> be the same as it appears on the document. If the correct name is not shown as an option it will need to be added in the Other Names question located on this person's Other tab.
        </p>
        {nameOptions.length > 0 && (
          <div className="mb-2">
            <Select
              value={dialogForm.watch("name") || ""}
              onValueChange={(value) => {
                dialogForm.setValue("name", value);
                dialogForm.setValue("family_name", "");
                dialogForm.setValue("given_names", "");
                setNameOption("select");
              }}
            >
              <SelectTrigger data-testid="select-passport-name">
                <SelectValue placeholder="Choose Applicant Name" />
              </SelectTrigger>
              <SelectContent>
                {nameOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {nameOptions.length > 0 && (
          <div className="text-center my-2 text-sm text-gray-500">Or</div>
        )}
        <div className="space-y-2">
          <div>
            <Label htmlFor="family_name" className="text-sm">Family Name</Label>
            <Input
              id="family_name"
              {...dialogForm.register("family_name", {
                onChange: () => {
                  dialogForm.setValue("name", "");
                  setNameOption("manual");
                }
              })}
              data-testid="input-passport-family-name"
            />
          </div>
          <div>
            <Label htmlFor="given_names" className="text-sm">Given Names</Label>
            <Input
              id="given_names"
              {...dialogForm.register("given_names", {
                onChange: () => {
                  dialogForm.setValue("name", "");
                  setNameOption("manual");
                }
              })}
              data-testid="input-passport-given-names"
            />
          </div>
        </div>
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-3">Dates and Status</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter the issue date, expiry date and status of the Document
        </p>

        <div>
          <DateSelector
            label="Date of Issue"
            values={{
              day: dialogForm.watch("date_issued_day") || "",
              month: dialogForm.watch("date_issued_month") || "",
              year: dialogForm.watch("date_issued_year") || "",
            }}
            onValueChange={(type, value) => {
              const fieldName = `date_issued_${type}`;
              dialogForm.setValue(fieldName, value, { shouldValidate: true });
            }}
            testIdPrefix="select-passport-issue"
          />
        </div>

        <div className="mt-4">
          <Label className="text-sm font-normal mb-2 block">
            Is this the Original Date of Issue?
          </Label>
          <RadioGroup
            value={isOriginalDate}
            onValueChange={(value) => {
              setIsOriginalDate(value);
              dialogForm.setValue("is_original_date", value);
            }}
            className="flex gap-4"
            data-testid="radio-original-date"
          >
            <div className="flex items-center" data-testid="radio-original-date-yes">
              <RadioGroupItem value="Yes" id="original-date-yes" />
              <Label htmlFor="original-date-yes" className="ml-2 cursor-pointer font-normal">
                Yes
              </Label>
            </div>
            <div className="flex items-center" data-testid="radio-original-date-no">
              <RadioGroupItem value="No" id="original-date-no" />
              <Label htmlFor="original-date-no" className="ml-2 cursor-pointer font-normal">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {isOriginalDate === "No" && (
          <div className="mt-4">
            <DateSelector
              label="Original Date of Issue"
              values={{
                day: dialogForm.watch("original_date_day") || "",
                month: dialogForm.watch("original_date_month") || "",
                year: dialogForm.watch("original_date_year") || "",
              }}
              onValueChange={(type, value) => {
                const fieldName = `original_date_${type}`;
                dialogForm.setValue(fieldName, value);
              }}
              testIdPrefix="select-original"
            />
          </div>
        )}

        <div className="mt-4">
          <DateSelector
            label="Date of Expiry"
            values={{
              day: dialogForm.watch("date_expiry_day") || "",
              month: dialogForm.watch("date_expiry_month") || "",
              year: dialogForm.watch("date_expiry_year") || "",
            }}
            onValueChange={(type, value) => {
              const fieldName = `date_expiry_${type}`;
              dialogForm.setValue(fieldName, value, { shouldValidate: true });
            }}
            testIdPrefix="select-passport-expiry"
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="document_status">Document Status</Label>
          <Select
            value={dialogForm.watch("document_status")}
            onValueChange={(value) => dialogForm.setValue("document_status", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-passport-status">
              <SelectValue placeholder="Choose Status" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.document_status && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_status.message}</p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" className="bg-primary text-primary-foreground" data-testid="button-ok">
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function FamilySponsorIdentityPage() {
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

  // Load section data from familySponsor.details
  const sectionData = draftStore.getSectionData('familySponsor.details');
  
  // Get sponsor name for display
  const sponsorName = sectionData?.given_names && sectionData?.family_name
    ? `${sectionData.given_names} ${sectionData.family_name}`
    : sectionData?.given_names || sectionData?.family_name || "the sponsor";

  const form = useForm({
    resolver: zodResolver(familySponsorIdentitySchema),
    mode: "onChange",
    defaultValues: {
      citizen_of_country: sectionData?.citizen_of_country || "No",
      stateless_explanation: sectionData?.stateless_explanation || "",
      citizenships: sectionData?.citizenships || [],
      has_passport: sectionData?.has_passport || "No",
      passports: sectionData?.passports || [],
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch form values for conditional rendering
  const citizenOfCountry = form.watch("citizen_of_country");
  const hasPassport = form.watch("has_passport");
  const citizenships = form.watch("citizenships") || [];
  const passports = form.watch("passports") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        citizen_of_country: sectionData.citizen_of_country || "No",
        stateless_explanation: sectionData.stateless_explanation || "",
        citizenships: sectionData.citizenships || [],
        has_passport: sectionData.has_passport || "No",
        passports: sectionData.passports || [],
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset, isDirty]);

  // Reset stateless explanation when citizen_of_country changes to "Yes"
  useEffect(() => {
    if (citizenOfCountry === "Yes") {
      form.setValue("stateless_explanation", "");
    }
  }, [citizenOfCountry, form]);

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
        await draftStore.markPageComplete('partner/family-sponsor/identity', null, 'familySponsor.details');
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

      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const currentData = getValues();
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('familySponsor.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/identity', null, 'familySponsor.details');
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

  const updateCitizenships = (newCitizenships) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("citizenships", newCitizenships, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', { 
      ...existingData,
      ...currentData,
      citizenships: newCitizenships 
    });
  };

  const updatePassports = (newPassports) => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    form.setValue("passports", newPassports, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    const existingData = draftStore.getSectionData('familySponsor.details') || {};
    const currentData = getValues();
    draftStore.saveSectionData('familySponsor.details', { 
      ...existingData,
      ...currentData,
      passports: newPassports 
    });
  };

  const citizenshipColumns = [
    { key: "country", label: "Country" },
    { key: "obtained_method", label: "How was this Citizenship obtained?" },
    {
      key: "date_obtained", label: "Date Obtained", format: (row) => {
        if (row.date_obtained_day && row.date_obtained_month && row.date_obtained_year) {
          const monthIdx = parseInt(row.date_obtained_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_obtained_day}, ${row.date_obtained_year}`;
        }
        return "";
      }
    },
    { key: "still_citizen", label: "Is your sponsor still a Citizen of this country?" },
  ];

  const passportColumns = [
    { key: "document_number", label: "Passport/Document Number" },
    { key: "name", label: "Name", format: (row) => row.name || (row.family_name && row.given_names ? `${row.given_names} ${row.family_name}` : "") },
    { key: "nationality", label: "Nationality" },
    {
      key: "date_issued", label: "Date of Issue", format: (row) => {
        if (row.date_issued_day && row.date_issued_month && row.date_issued_year) {
          const monthIdx = parseInt(row.date_issued_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_issued_day}, ${row.date_issued_year}`;
        }
        return "";
      }
    },
    { key: "document_status", label: "Status" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Identity</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about your Family Sponsor.
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
            {/* Question 1: Is your sponsor currently a Citizen of any Country? */}
            <div>
              <Field
                type="radio"
                name="citizen_of_country"
                control={form.control}
                label="Is your sponsor currently a Citizen of any Country?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {citizenOfCountry === "No" && (
                <div className="mt-4">
                  <Label htmlFor="stateless_explanation" className="text-sm font-normal mb-2 block">
                    You have answered that your Sponsor is not a Citizen of any country. You must provide details of how, when and why they are stateless <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="stateless_explanation"
                    {...form.register("stateless_explanation")}
                    rows={4}
                    className="w-full"
                    data-testid="textarea-stateless-explanation"
                    placeholder="Please provide details of how, when and why your sponsor is stateless"
                  />
                  {form.formState.errors.stateless_explanation && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.stateless_explanation.message}</p>
                  )}
                </div>
              )}

              {citizenOfCountry === "Yes" && (
                <div className="mt-4">
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    Citizenships for {sponsorName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all Citizenships that your Sponsor holds or have previously held
                  </p>
                  <RepeaterTable
                    data={citizenships}
                    columns={citizenshipColumns}
                    onAdd={(row) => updateCitizenships([...citizenships, row])}
                    onEdit={(index, row) => {
                      const updated = [...citizenships];
                      updated[index] = row;
                      updateCitizenships(updated);
                    }}
                    onDelete={(index) => {
                      const updated = citizenships.filter((_, i) => i !== index);
                      updateCitizenships(updated);
                    }}
                    DialogComponent={CitizenshipDialog}
                    addButtonText="Add"
                    testIdPrefix="citizenship"
                    dialogTitle="Citizenship"
                  />
                  {form.formState.errors.citizenships && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.citizenships.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Question 2: Does your sponsor currently hold or have they ever held a Passport or Travel Document? */}
            <div>
              <Field
                type="radio"
                name="has_passport"
                control={form.control}
                label="Does your sponsor currently hold or have they ever held a Passport or Travel Document?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {hasPassport === "Yes" && (
                <div className="mt-4">
                  <h3 className="text-base font-medium text-gray-900 mb-2">
                    Passports/Travel Documents for {sponsorName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of your Sponsor's current Passport/Travel Documents
                  </p>
                  <RepeaterTable
                    data={passports}
                    columns={passportColumns}
                    onAdd={(row) => updatePassports([...passports, row])}
                    onEdit={(index, row) => {
                      const updated = [...passports];
                      updated[index] = row;
                      updatePassports(updated);
                    }}
                    onDelete={(index) => {
                      const updated = passports.filter((_, i) => i !== index);
                      updatePassports(updated);
                    }}
                    DialogComponent={PassportDialog}
                    addButtonText="Add"
                    testIdPrefix="passport"
                    dialogTitle="Passport/Travel Document"
                  />
                  {form.formState.errors.passports && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.passports.message}</p>
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

