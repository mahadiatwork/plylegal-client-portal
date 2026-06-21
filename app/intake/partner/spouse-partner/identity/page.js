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
import { getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SimplifiedOtherIdentityDialog } from "@/components/intake/temporary-work/SimplifiedOtherIdentityDialog";
import { COUNTRIES } from "@/reuseable/countries";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { showCompletionIssuesToast } from "@/lib/temporaryWorkCompletionUi";

const nationalIdCardSchema = z.object({
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  identification_number: z.string().optional(),
  country_of_issue: z.string().optional(),
  date_issued_day: z.string().optional(),
  date_issued_month: z.string().optional(),
  date_issued_year: z.string().optional(),
  date_expiry_day: z.string().optional(),
  date_expiry_month: z.string().optional(),
  date_expiry_year: z.string().optional(),
});

const otherIdentityRowSchema = z.object({
  family_name: z.string().min(1, "Required"),
  given_names: z.string().min(1, "Required"),
  document_type: z.string().min(1, "Required"),
  identification_number: z.string().min(1, "Required"),
  country_of_issue: z.string().min(1, "Required"),
});

const formSchema = z
  .object({
    has_passport: z.enum(["yes", "no"]),
    passports: z
      .array(
        z.object({
          document_type: z.string(),
          document_number: z.string(),
          passport_country: z.string(),
          place_of_issue: z.string(),
          nationality: z.string(),
          gender: z.string(),
          name: z.string(),
          date_issued_day: z.string(),
          date_issued_month: z.string(),
          date_issued_year: z.string(),
          is_original_date: z.string(),
          original_date_day: z.string().optional(),
          original_date_month: z.string().optional(),
          original_date_year: z.string().optional(),
          date_expiry_day: z.string().optional(),
          date_expiry_month: z.string().optional(),
          date_expiry_year: z.string().optional(),
          document_status: z.string(),
        })
      )
      .optional(),
    has_national_id: z.enum(["yes", "no"]),
    national_id_card: nationalIdCardSchema.optional(),
    other_identity_documents: z.array(otherIdentityRowSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.has_passport === "yes" && (!data.passports || data.passports.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Please add at least one passport/travel document",
      path: ["passports"],
    }
  )
  .superRefine((data, ctx) => {
    if (data.has_national_id !== "yes") return;
    const n = data.national_id_card || {};
    [
      ["family_name", "Family name is required"],
      ["given_names", "Given names are required"],
      ["identification_number", "Identification number is required"],
      ["country_of_issue", "Country of issue is required"],
    ].forEach(([field, message]) => {
      if (!String(n[field] || "").trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ["national_id_card", field],
        });
      }
    });
  });

function mapLegacyDocumentTypeToSimplified(t) {
  const lower = String(t || "").toLowerCase();
  if (lower.includes("birth")) return "Birth certificate";
  if (lower.includes("driver")) return "Drivers licence";
  if (lower.includes("marriage")) return "Marriage certificate";
  if (lower.includes("change of name")) return "Change of name certificate";
  if (lower.includes("military discharge")) return "Military discharge certificate";
  return "Other";
}

function migrateLegacyIdentity(savedData) {
  const emptyNational = {
    family_name: "",
    given_names: "",
    identification_number: "",
    country_of_issue: "",
    date_issued_day: "",
    date_issued_month: "",
    date_issued_year: "",
    date_expiry_day: "",
    date_expiry_month: "",
    date_expiry_year: "",
  };

  if (savedData?.has_national_id === "yes" || savedData?.has_national_id === "no") {
    return {
      has_passport: savedData.has_passport || "no",
      passports: savedData.passports || [],
      has_national_id: savedData.has_national_id,
      national_id_card: { ...emptyNational, ...(savedData.national_id_card || {}) },
      other_identity_documents: savedData.other_identity_documents || [],
    };
  }

  const legacyDocs = savedData?.identity_documents;
  if (!legacyDocs?.length) {
    return {
      has_passport: savedData?.has_passport || "no",
      passports: savedData?.passports || [],
      has_national_id: "no",
      national_id_card: { ...emptyNational },
      other_identity_documents: [],
    };
  }

  const nationalRow = legacyDocs.find((d) => /national identity/i.test(String(d.document_type || "")));
  const otherRows = legacyDocs.filter((d) => d !== nationalRow);

  const splitName = (name) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/);
    return { family: parts[0] || "", given: parts.slice(1).join(" ") || "" };
  };

  let national_id_card = { ...emptyNational };
  if (nationalRow) {
    const { family, given } = splitName(nationalRow.name);
    national_id_card = {
      ...emptyNational,
      family_name: family,
      given_names: given,
      identification_number: nationalRow.identification_number || "",
      country_of_issue: nationalRow.country_of_issue || "",
      date_issued_day: nationalRow.date_issued_day || "",
      date_issued_month: nationalRow.date_issued_month || "",
      date_issued_year: nationalRow.date_issued_year || "",
      date_expiry_day: nationalRow.date_expiry_day || "",
      date_expiry_month: nationalRow.date_expiry_month || "",
      date_expiry_year: nationalRow.date_expiry_year || "",
    };
  }

  const other_identity_documents = otherRows.map((d) => {
    const { family, given } = splitName(d.name);
    return {
      family_name: family || "—",
      given_names: given || "—",
      document_type: mapLegacyDocumentTypeToSimplified(d.document_type),
      identification_number: d.identification_number || "",
      country_of_issue: d.country_of_issue || "",
    };
  });

  return {
    has_passport: savedData.has_passport || "no",
    passports: savedData.passports || [],
    has_national_id: nationalRow ? "yes" : "no",
    national_id_card,
    other_identity_documents,
  };
}

const PASSPORT_TYPE_OPTIONS = [
  "Passport",
  "Emergency Passport",
  "Travel Document"
];

const GENDER_OPTIONS = ["Male", "Female", "X/Unspecified"];

const DOCUMENT_STATUS_OPTIONS = [
  "Current",
  "Expired",
  "Lost",
  "Stolen",
  "Cancelled",
  "Damaged"
];

function PassportDialog({ editingRow: row, onSave: onSubmit, onCancel }) {
  const initialIsOriginal = row?.is_original_date !== undefined ? row.is_original_date : "yes";
  const [isOriginalDate, setIsOriginalDate] = useState(initialIsOriginal);

  const dialogForm = useForm({
    resolver: zodResolver(passportDialogSchema),
    defaultValues: row || {
      document_type: "",
      document_number: "",
      passport_country: "",
      place_of_issue: "",
      nationality: "",
      gender: "",
      name: "",
      date_issued_day: "",
      date_issued_month: "",
      date_issued_year: "",
      is_original_date: "yes",
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
    if (row?.is_original_date !== undefined) {
      setIsOriginalDate(row.is_original_date);
      dialogForm.setValue("is_original_date", row.is_original_date);
    }
  }, [row]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
  const passportExpiryYears = Array.from({ length: currentYear + 50 - 2016 + 1 }, (_, i) => (2016 + i).toString());

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
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
          <SelectTrigger id="passport_country" data-testid="select-passport-country">
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
          <SelectTrigger id="nationality" data-testid="select-passport-nationality">
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
        <Label htmlFor="passport_name">Name</Label>
        <Input
          id="passport_name"
          {...dialogForm.register("name")}
          data-testid="input-passport-name"
          placeholder="Enter name exactly as shown on document"
        />
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
          <Label>Date of Issue</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_issued_day")}
              onValueChange={(value) => dialogForm.setValue("date_issued_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-issue-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_issued_month")}
              onValueChange={(value) => dialogForm.setValue("date_issued_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-issue-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_issued_year")}
              onValueChange={(value) => dialogForm.setValue("date_issued_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-issue-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              <RadioGroupItem value="yes" id="original-date-yes" />
              <Label htmlFor="original-date-yes" className="ml-2 cursor-pointer font-normal">
                Yes
              </Label>
            </div>
            <div className="flex items-center" data-testid="radio-original-date-no">
              <RadioGroupItem value="no" id="original-date-no" />
              <Label htmlFor="original-date-no" className="ml-2 cursor-pointer font-normal">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {isOriginalDate === "no" && (
          <div className="mt-4">
            <Label>Original Date of Issue</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={dialogForm.watch("original_date_day")}
                onValueChange={(value) => dialogForm.setValue("original_date_day", value)}
              >
                <SelectTrigger data-testid="select-original-day">
                  <SelectValue placeholder="Choose Day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("original_date_month")}
                onValueChange={(value) => dialogForm.setValue("original_date_month", value)}
              >
                <SelectTrigger data-testid="select-original-month">
                  <SelectValue placeholder="Choose Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dialogForm.watch("original_date_year")}
                onValueChange={(value) => dialogForm.setValue("original_date_year", value)}
              >
                <SelectTrigger data-testid="select-original-year">
                  <SelectValue placeholder="Choose Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-4">
          <Label>Date of Expiry</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_expiry_day")}
              onValueChange={(value) => dialogForm.setValue("date_expiry_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-expiry-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_expiry_month")}
              onValueChange={(value) => dialogForm.setValue("date_expiry_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-expiry-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_expiry_year")}
              onValueChange={(value) => dialogForm.setValue("date_expiry_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-passport-expiry-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent>
                {passportExpiryYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        <Button type="button" onClick={dialogForm.handleSubmit(handleFormSubmit)} data-testid="button-ok">
          OK
        </Button>
      </DialogFooter>
    </div>
  );
}

const passportDialogSchema = z.object({
  document_type: z.string().min(1, "Document type is required"),
  document_number: z.string().min(1, "Document number is required"),
  passport_country: z.string().min(1, "Passport country is required"),
  place_of_issue: z.string().min(1, "Place of issue is required"),
  nationality: z.string().min(1, "Nationality is required"),
  gender: z.string().min(1, "Gender is required"),
  name: z.string().min(1, "Name is required"),
  date_issued_day: z.string().min(1, "Day is required"),
  date_issued_month: z.string().min(1, "Month is required"),
  date_issued_year: z.string().min(1, "Year is required"),
  is_original_date: z.string(),
  original_date_day: z.string().optional(),
  original_date_month: z.string().optional(),
  original_date_year: z.string().optional(),
  date_expiry_day: z.string().optional(),
  date_expiry_month: z.string().optional(),
  date_expiry_year: z.string().optional(),
  document_status: z.string().min(1, "Document status is required"),
}).refine(
  (data) => {
    if (data.document_status === "Current") {
      return data.date_expiry_day && data.date_expiry_month && data.date_expiry_year;
    }
    return true;
  },
  {
    message: "Expiry date is required for current documents",
    path: ["date_expiry_day"],
  }
);

export default function IdentityPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const visaType = getVisaTypeFromPath(pathname);
  const [isSaving, setIsSaving] = useState(false);
  const appIdParam = searchParams.get("applicationId");

  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const emptyNational = {
    family_name: "",
    given_names: "",
    identification_number: "",
    country_of_issue: "",
    date_issued_day: "",
    date_issued_month: "",
    date_issued_year: "",
    date_expiry_day: "",
    date_expiry_month: "",
    date_expiry_year: "",
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      has_passport: "no",
      passports: [],
      has_national_id: "no",
      national_id_card: { ...emptyNational },
      other_identity_documents: [],
    },
  });

  useEffect(() => {
    const savedData = profileId
      ? (draftSnap.draft?.profiles_data?.[profileId]?.identity || {})
      : (draftSnap.draft?.partner_spouse_identity || {});

    if (savedData && Object.keys(savedData).length > 0) {
      const migrated = migrateLegacyIdentity(savedData);
      form.reset({
        ...migrated,
        national_id_card: { ...emptyNational, ...(migrated.national_id_card || {}) },
        other_identity_documents: migrated.other_identity_documents || [],
      });
    }
  }, [
    draftSnap.draft?.partner_spouse_identity,
    draftSnap.draft?.profiles_data,
    profileId,
    form,
  ]);

  const hasPassport = form.watch("has_passport");
  const hasNationalId = form.watch("has_national_id");

  const passports = form.watch("passports") || [];
  const otherIdentityDocuments = form.watch("other_identity_documents") || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = form.getValues();
      const result = profileId
        ? await draftStore.saveProfileSectionData(profileId, "identity", data)
        : await draftStore.saveSectionData("partner_spouse_identity", data);

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
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const result = profileId
        ? await draftStore.saveProfileSectionData(profileId, "identity", data)
        : await draftStore.saveSectionData("partner_spouse_identity", data);

      if (result.success) {
        let completionResult;
        if (profileId) {
          completionResult = await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/identity`);
        } else {
          completionResult = await draftStore.markPageComplete(`${visaType}/spouse-partner/identity`);
        }

        if (!completionResult.success) {
          showCompletionIssuesToast(toast, completionResult);
          return;
        }

        const nextRoute = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
        if (nextRoute) {
          startNavigation(nextRoute);
          router.push(nextRoute);
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const previousRoute = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (previousRoute) {
      startNavigation(previousRoute);
      router.push(previousRoute);
    }
  };

  const updatePassports = async (newPassports) => {
    const currentValues = form.getValues();
    form.setValue("passports", newPassports, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (profileId) {
      await draftStore.saveProfileSectionData(profileId, "identity", { ...currentValues, passports: newPassports });
    } else {
      await draftStore.saveSectionData("partner_spouse_identity", { ...currentValues, passports: newPassports });
    }
  };

  const updateOtherIdentityDocs = async (newDocs) => {
    const currentValues = form.getValues();
    form.setValue("other_identity_documents", newDocs, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    if (profileId) {
      await draftStore.saveProfileSectionData(profileId, "identity", { ...currentValues, other_identity_documents: newDocs });
    } else {
      await draftStore.saveSectionData("partner_spouse_identity", { ...currentValues, other_identity_documents: newDocs });
    }
  };

  const passportColumns = [
    { key: "document_type", label: "Document Type" },
    { key: "document_number", label: "Document Number" },
    { key: "passport_country", label: "Country" },
    { key: "document_status", label: "Status" },
  ];

  const otherIdColumns = [
    { key: "document_type", label: "Document Type" },
    { key: "identification_number", label: "ID Number" },
    { key: "country_of_issue", label: "Country of Issue" },
  ];

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Spouse / Partner — Identity</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide identity documents for the spouse or partner included in this application.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Passports / Travel Documents */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Do you currently hold or have you ever held a Passport or Travel Document?
            </Label>
            <RadioGroup
              value={hasPassport}
              onValueChange={(value) => form.setValue("has_passport", value)}
              className="flex gap-4"
              data-testid="radio-passport"
            >
              <div className="flex items-center">
                <RadioGroupItem value="yes" id="passport-yes" data-testid="radio-passport-yes" />
                <Label htmlFor="passport-yes" className="ml-2 cursor-pointer font-normal">
                  Yes
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="no" id="passport-no" data-testid="radio-passport-no" />
                <Label htmlFor="passport-no" className="ml-2 cursor-pointer font-normal">
                  No
                </Label>
              </div>
            </RadioGroup>
            {form.formState.errors.has_passport && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.has_passport.message}</p>
            )}

            {hasPassport === "yes" && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-4">
                  Enter details of all current and expired passports/travel documents held by the spouse/partner.
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
                  addButtonText="Add passport"
                  emptyMessage="No passports added"
                  dialogTitle="Passport"
                  testIdPrefix="passport"
                />
                {form.formState.errors.passports && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.passports.message}</p>
                )}
              </div>
            )}
          </div>

          {/* National Identity Documents */}
          <div className="pt-6 border-t border-gray-200">
            <Label className="text-base font-medium mb-3 block">
              Do you currently hold or have you ever held a National Identity Card?
            </Label>
            <RadioGroup
              value={hasNationalId}
              onValueChange={(value) => form.setValue("has_national_id", value)}
              className="flex gap-4"
              data-testid="radio-national-id"
            >
              <div className="flex items-center">
                <RadioGroupItem value="yes" id="national-id-yes" data-testid="radio-national-id-yes" />
                <Label htmlFor="national-id-yes" className="ml-2 cursor-pointer font-normal">
                  Yes
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="no" id="national-id-no" data-testid="radio-national-id-no" />
                <Label htmlFor="national-id-no" className="ml-2 cursor-pointer font-normal">
                  No
                </Label>
              </div>
            </RadioGroup>

            {hasNationalId === "yes" && (
              <div className="mt-4 space-y-4 max-w-xl">
                <p className="text-sm text-gray-600">
                  Enter details of your national identity card exactly as they appear on the document.
                </p>
                <div>
                  <Label htmlFor="nid_family_name">Family Name</Label>
                  <Input id="nid_family_name" {...form.register("national_id_card.family_name")} />
                  {form.formState.errors.national_id_card?.family_name && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.national_id_card.family_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nid_given_names">Given Names</Label>
                  <Input id="nid_given_names" {...form.register("national_id_card.given_names")} />
                  {form.formState.errors.national_id_card?.given_names && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.national_id_card.given_names.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nid_number">Identification Number</Label>
                  <Input id="nid_number" {...form.register("national_id_card.identification_number")} />
                  {form.formState.errors.national_id_card?.identification_number && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.national_id_card.identification_number.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nid_country">Country of Issue</Label>
                  <Select
                    value={form.watch("national_id_card.country_of_issue")}
                    onValueChange={(v) => form.setValue("national_id_card.country_of_issue", v, { shouldValidate: true })}
                  >
                    <SelectTrigger id="nid_country" data-testid="select-nid-country">
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
                  {form.formState.errors.national_id_card?.country_of_issue && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.national_id_card.country_of_issue.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Other Identity Documents */}
          <div className="pt-6 border-t border-gray-200">
            <Label className="text-base font-medium mb-3 block">
              Other Identity Documents
            </Label>
            <p className="text-sm text-gray-600 mb-4">
              Enter details of any other identity documents held (e.g. birth certificate, driver&apos;s licence).
            </p>
            <RepeaterTable
              data={otherIdentityDocuments}
              columns={otherIdColumns}
              onAdd={(row) => updateOtherIdentityDocs([...otherIdentityDocuments, row])}
              onEdit={(index, row) => {
                const updated = [...otherIdentityDocuments];
                updated[index] = row;
                updateOtherIdentityDocs(updated);
              }}
              onDelete={(index) => {
                const updated = otherIdentityDocuments.filter((_, i) => i !== index);
                updateOtherIdentityDocs(updated);
              }}
              DialogComponent={SimplifiedOtherIdentityDialog}
              addButtonText="Add document"
              emptyMessage="No other identity documents added"
              dialogTitle="Identity Document"
              testIdPrefix="other-id"
            />
          </div>

          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            nextLabel="Continue"
            loading={isSaving}
          />
        </form>
      </CardContent>
    </Card>
  );
}
