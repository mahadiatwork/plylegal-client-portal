"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
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
import { identitySchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { monthNames } from "@/reuseable/months";
import { COUNTRIES } from "@/reuseable/countries";
import { DateSelector } from "@/components/DateSelecters";



const CITIZENSHIP_REASON_OPTIONS = ["Birth", "Descent", "Naturalisation"];
const PASSPORT_TYPE_OPTIONS = ["Passport", "Emergency Passport", "Travel Document"];
const GENDER_OPTIONS = ["Male", "Female", "X/Unspecified"];
const DOCUMENT_STATUS_OPTIONS = ["Current", "Expired", "Lost", "Stolen", "Cancelled", "Damaged"];

const DOCUMENT_TYPE_OPTIONS = [
  "Aircrew Identity Document",
  "Alien Registration Number",
  "Bank Statement - Personal",
  "Birth Certificate",
  "Change of Name Certificate",
  "Deed Poll",
  "Driver's Licence",
  "DFTTA",
  "Family Register",
  "Marriage Certificate",
  "Military Identity Document",
  "National Identity Document",
  "Proof of Age Card",
  "Rates Notice",
  "Rental Contract",
  "Seafarer Identity Document",
  "Social Security Card",
  "Student Card",
  "United Nations High Commissioner for Refugees (UNHCR) Document",
  "Other"
];

// DateSelector component handles days and years internally

const CITIZENSHIP_CEASED_REASON_OPTIONS = ["Renounced", "Revoked", "Other"];

function CitizenshipDialog({ editingRow, onSave, onCancel }) {
  const [stillCitizen, setStillCitizen] = useState(editingRow?.still_citizen || "Yes");

  const dialogForm = useForm({
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
        <Label className="mb-2 block">Are you still a Citizen of this country?</Label>
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

  const dialogForm = useForm({
    defaultValues: editingRow || {
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
  }, [editingRow, dialogForm]);

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
        <Input
          id="passport_country"
          {...dialogForm.register("passport_country")}
          placeholder="Choose Country"
          data-testid="input-passport-country"
        />
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
        <Input
          id="nationality"
          {...dialogForm.register("nationality")}
          placeholder="Choose Nationality"
          data-testid="input-passport-nationality"
        />
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
        <Input
          id="name"
          {...dialogForm.register("name")}
          placeholder="Choose Applicant Name"
          data-testid="input-passport-name"
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

function IdentityDocDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    defaultValues: editingRow || {
      document_type: "",
      identification_number: "",
      country_of_issue: "",
      state_province_of_issue: "",
      place_of_issue: "",
      name: "",
      date_issued_day: "",
      date_issued_month: "",
      date_issued_year: "",
      date_expiry_day: "",
      date_expiry_month: "",
      date_expiry_year: "",
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
      className="space-y-4 pr-2"
    >
      <div>
        <Label htmlFor="document_type">Document Type</Label>
        <Select
          value={dialogForm.watch("document_type")}
          onValueChange={(value) => dialogForm.setValue("document_type", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-identity-doc-type">
            <SelectValue placeholder="Choose Type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.document_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.document_type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="identification_number">Identification Number</Label>
        <Input
          id="identification_number"
          {...dialogForm.register("identification_number")}
          data-testid="input-identification-number"
        />
        {dialogForm.formState.errors.identification_number && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.identification_number.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="country_of_issue">Country of Issue</Label>
        <Input
          id="country_of_issue"
          {...dialogForm.register("country_of_issue")}
          placeholder="Choose Country"
          data-testid="input-country-of-issue"
        />
        {dialogForm.formState.errors.country_of_issue && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_issue.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="state_province_of_issue">State/Province of Issue <span className="text-gray-500 font-normal">(optional)</span></Label>
        <Input
          id="state_province_of_issue"
          {...dialogForm.register("state_province_of_issue")}
          data-testid="input-state-province"
        />
      </div>

      <div>
        <Label htmlFor="place_of_issue">Place of Issue / Issuing Authority <span className="text-gray-500 font-normal">(optional)</span></Label>
        <Input
          id="place_of_issue"
          {...dialogForm.register("place_of_issue")}
          data-testid="input-place-of-issue"
        />
      </div>

      <div>
        <Label className="block mb-2">Name</Label>
        <p className="text-sm text-gray-600 mb-2">
          Specify the name that is shown on this Identity Document by selecting one of the names for this person previously entered in to this questionnaire. If the correct name is not shown as an option it will need to be added in the Other Names question located on this person's Other tab.
        </p>
        <Input
          id="name"
          {...dialogForm.register("name")}
          placeholder="Undefined First Name Undefined Family Name"
          data-testid="input-identity-doc-name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-base font-medium text-gray-900 mb-3">Dates</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter the issue and expiry dates of the Document (Leave blank if not applicable)
        </p>

        <div>
          <DateSelector
            label="Date Issued"
            values={{
              day: dialogForm.watch("date_issued_day") || "",
              month: dialogForm.watch("date_issued_month") || "",
              year: dialogForm.watch("date_issued_year") || "",
            }}
            onValueChange={(type, value) => {
              const fieldName = `date_issued_${type}`;
              dialogForm.setValue(fieldName, value);
            }}
            testIdPrefix="select-identity-doc-issue"
          />
        </div>

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
              dialogForm.setValue(fieldName, value);
            }}
            testIdPrefix="select-identity-doc-expiry"
          />
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

function CountryDialog({ editingRow, onSave, onCancel }) {
  const [residencyStatus, setResidencyStatus] = useState(editingRow?.residency_status || "Permanent");

  const dialogForm = useForm({
    defaultValues: editingRow || {
      country: "",
      residency_status: "Permanent",
      expiry_date_day: "",
      expiry_date_month: "",
      expiry_date_year: "",
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
      className="space-y-4"
    >
      <div>
        <Label htmlFor="country">Country</Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
        >
          <SelectTrigger data-testid="select-pr-country">
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
        <Label className="text-sm font-medium mb-2 block">
          Residency Status
        </Label>
        <RadioGroup
          value={residencyStatus}
          onValueChange={(value) => {
            setResidencyStatus(value);
            dialogForm.setValue("residency_status", value);
          }}
          className="flex gap-4"
          data-testid="radio-residency-status"
        >
          <div className="flex items-center" data-testid="radio-residency-status-permanent">
            <RadioGroupItem value="Permanent" id="residency-status-permanent" />
            <Label htmlFor="residency-status-permanent" className="ml-2 cursor-pointer font-normal">
              Permanent
            </Label>
          </div>
          <div className="flex items-center" data-testid="radio-residency-status-temporary">
            <RadioGroupItem value="Temporary" id="residency-status-temporary" />
            <Label htmlFor="residency-status-temporary" className="ml-2 cursor-pointer font-normal">
              Temporary
            </Label>
          </div>
        </RadioGroup>
      </div>

      {residencyStatus === "Temporary" && (
        <div>
          <DateSelector
            label="Expiry Date of Temporary Residency"
            values={{
              day: dialogForm.watch("expiry_date_day") || "",
              month: dialogForm.watch("expiry_date_month") || "",
              year: dialogForm.watch("expiry_date_year") || "",
            }}
            onValueChange={(type, value) => {
              const fieldName = `expiry_date_${type}`;
              dialogForm.setValue(fieldName, value);
            }}
            testIdPrefix="select-expiry"
          />
          {dialogForm.formState.errors.expiry_date_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.expiry_date_day.message}</p>
          )}
        </div>
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

export default function MainApplicantIdentityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
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

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.identity');

  const form = useForm({
    resolver: zodResolver(identitySchema),
    mode: "onChange",
    defaultValues: {
      citizen_of_country: sectionData?.citizen_of_country || "No",
      stateless_explanation: sectionData?.stateless_explanation || "",
      ever_been_citizen: sectionData?.ever_been_citizen || "",
      citizenships: sectionData?.citizenships || [],
      has_passport: sectionData?.has_passport || "No",
      passports: sectionData?.passports || [],
      has_identity_doc: sectionData?.has_identity_doc || "No",
      identity_docs: sectionData?.identity_docs || [],
      permanent_residency_rights: sectionData?.permanent_residency_rights || "No",
      pr_countries: sectionData?.pr_countries || [],
    },
  });
  const { reset } = form; // Add this line

  
  // Watch form values for conditional rendering
  const citizenOfCountry = form.watch("citizen_of_country");
  const everBeenCitizen = form.watch("ever_been_citizen");
  const hasPassport = form.watch("has_passport");
  const hasIdentityDoc = form.watch("has_identity_doc");
  const permanentResidencyRights = form.watch("permanent_residency_rights");
  const citizenships = form.watch("citizenships") || [];
  const passports = form.watch("passports") || [];
  const identityDocs = form.watch("identity_docs") || [];
  const prCountries = form.watch("pr_countries") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    // Only reset if we have an ID and aren't loading
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0) {
      // Use 'keepDefaultValues: true' to prevent flickering
      reset({
        citizen_of_country: sectionData.citizen_of_country || "No",
        stateless_explanation: sectionData.stateless_explanation || "",
        ever_been_citizen: sectionData.ever_been_citizen || "",
        citizenships: sectionData.citizenships || [],
        has_passport: sectionData.has_passport || "No",
        passports: sectionData.passports || [],
        has_identity_doc: sectionData.has_identity_doc || "No",
        identity_docs: sectionData.identity_docs || [],
        permanent_residency_rights: sectionData.permanent_residency_rights || "No",
        pr_countries: sectionData.pr_countries || [],
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset]);

  // Reset fields when citizen_of_country changes
  useEffect(() => {
    if (citizenOfCountry === "Yes") {
      // If user selects "Yes", clear stateless explanation and ever_been_citizen
      // These fields are only relevant when answer is "No"
      form.setValue("stateless_explanation", "");
      form.setValue("ever_been_citizen", "");
    }
    // Note: We don't clear citizenships when switching to "No" because
    // the user might have already entered past citizenships that are still valid
  }, [citizenOfCountry, form]);

  // Reset citizenships when ever_been_citizen changes to "No" (only when first question is "No")
  useEffect(() => {
    if (citizenOfCountry === "No" && everBeenCitizen === "No") {
      // If user says they've never been a citizen, clear any existing citizenships
      form.setValue("citizenships", []);
    }
  }, [everBeenCitizen, citizenOfCountry, form]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) return;
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    // Don't auto-save immediately after form reset or while loading
    if (draftSnap.isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Use form.getValues() to get the actual current state of all fields
      const currentFormValues = form.getValues();
      const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
      const mergedData = { ...existingData, ...currentFormValues };
      
      draftStore.saveSectionData('mainApplicant.identity', mergedData);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading]);

  const onSubmit = async (data) => {
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
      // Merge with existing section data to preserve other fields
      const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
      const mergedData = { ...existingData, ...data };
      
      const result = await draftStore.saveSectionData('mainApplicant.identity', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/main-applicant/identity');
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
      // Trigger validation and check for errors
      const isValid = await form.trigger();
      
      if (!isValid) {
        // DEBUG: This will show you exactly what is stopping the save in the browser console
        console.log("Validation Errors:", form.formState.errors);
        
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Merge with existing section data to preserve other fields
      const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
      const currentData = form.getValues();
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('mainApplicant.identity', mergedData);

      if (result.success) {
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
    form.setValue("citizenships", newCitizenships, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    // Merge with existing section data
    const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
    const currentData = form.getValues();
    draftStore.saveSectionData('mainApplicant.identity', { 
      ...existingData,
      ...currentData,
      citizenships: newCitizenships 
    });
  };

  const updatePassports = (newPassports) => {
    form.setValue("passports", newPassports, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    // Merge with existing section data
    const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
    const currentData = form.getValues();
    draftStore.saveSectionData('mainApplicant.identity', { 
      ...existingData,
      ...currentData,
      passports: newPassports 
    });
  };

  const updateIdentityDocs = (newDocs) => {
    form.setValue("identity_docs", newDocs, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    // Merge with existing section data
    const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
    const currentData = form.getValues();
    draftStore.saveSectionData('mainApplicant.identity', { 
      ...existingData,
      ...currentData,
      identity_docs: newDocs 
    });
  };

  const updatePrCountries = (newCountries) => {
    form.setValue("pr_countries", newCountries, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    // Merge with existing section data
    const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
    const currentData = form.getValues();
    draftStore.saveSectionData('mainApplicant.identity', { 
      ...existingData,
      ...currentData,
      pr_countries: newCountries 
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
    { key: "still_citizen", label: "Current Citizen?" },
  ];

  const passportColumns = [
    { key: "document_number", label: "Passport/Document Number" },
    { key: "name", label: "Name" },
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

  const identityDocColumns = [
    { key: "document_type", label: "Document Type" },
    { key: "identification_number", label: "Identification Number" },
    { key: "name", label: "Name" },
    { key: "country_of_issue", label: "Country of Issue" },
    {
      key: "date_issued", label: "Date of Issue", format: (row) => {
        if (row.date_issued_day && row.date_issued_month && row.date_issued_year) {
          const monthIdx = parseInt(row.date_issued_month) - 1;
          return `${monthNames[monthIdx]} ${row.date_issued_day}, ${row.date_issued_year}`;
        }
        return "";
      }
    },
  ];

  const countryColumns = [
    { key: "country", label: "Country" },
    { key: "residency_status", label: "Status" },
    {
      key: "expiry_date", label: "Expiry Date", format: (row) => {
        if (row.residency_status === "Temporary" && row.expiry_date_day && row.expiry_date_month && row.expiry_date_year) {
          const monthIdx = parseInt(row.expiry_date_month) - 1;
          return `${monthNames[monthIdx]} ${row.expiry_date_day}, ${row.expiry_date_year}`;
        }
        return "";
      }
    },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Identity</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            In this section, provide details about the main applicant's identity.
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
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Question 1: Are you currently a Citizen of any Country? */}
            <div>
              <Field
                type="radio"
                name="citizen_of_country"
                control={form.control}
                label="Are you currently a Citizen of any Country?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />
              {citizenOfCountry === "No" && (
                <>
                  <div className="mt-4">
                    <Label htmlFor="stateless_explanation" className="text-sm font-normal mb-2 block">
                      You have answered that you are not a Citizen of any country. You must provide details of how, when and why you are stateless <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="stateless_explanation"
                      {...form.register("stateless_explanation")}
                      rows={4}
                      className="w-full"
                      data-testid="textarea-stateless-explanation"
                      placeholder="Please provide details of how, when and why you are stateless"
                    />
                    {form.formState.errors.stateless_explanation && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.stateless_explanation.message}</p>
                    )}
                  </div>
                  
                  {/* Question 2: Have you ever been a citizen in the past? (only shown when Question 1 is No) */}
                  <div className="mt-4">
                    <Field
                      type="radio"
                      name="ever_been_citizen"
                      control={form.control}
                      label="Have you ever been a citizen in the past?"
                      options={[
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" },
                      ]}
                    />
                    {form.formState.errors.ever_been_citizen && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.ever_been_citizen.message}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Citizenship Details Table */}
            {/* Shown when: (Question 1 is Yes) OR (Question 1 is No AND Question 2 is Yes) */}
            {((citizenOfCountry === "Yes") || (citizenOfCountry === "No" && everBeenCitizen === "Yes")) && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-4">
                  {citizenOfCountry === "Yes" 
                    ? "Enter details of all Citizenships that you hold or have previously held"
                    : "Enter details of all Citizenships that you have previously held"}
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

            {/* Question 2: Do you currently hold or have you ever held a Passport or Travel Document? */}
            <div>
              <Field
                type="radio"
                name="has_passport"
                control={form.control}
                label="Do you currently hold or have you ever held a Passport or Travel Document?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {hasPassport === "Yes" && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all passports ever held by you
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
                </div>
              )}
            </div>

            {/* Question 3: Do you have or have you ever had a government issued Identity Document or Identity Number? */}
            <div>
              <Field
                type="radio"
                name="has_identity_doc"
                control={form.control}
                label="Do you have or have you ever had a government issued Identity Document or Identity Number?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {hasIdentityDoc === "Yes" && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all government issued Identity Documents or Identity Numbers ever held by you
                  </p>
                  <RepeaterTable
                    data={identityDocs}
                    columns={identityDocColumns}
                    onAdd={(row) => updateIdentityDocs([...identityDocs, row])}
                    onEdit={(index, row) => {
                      const updated = [...identityDocs];
                      updated[index] = row;
                      updateIdentityDocs(updated);
                    }}
                    onDelete={(index) => {
                      const updated = identityDocs.filter((_, i) => i !== index);
                      updateIdentityDocs(updated);
                    }}
                    DialogComponent={IdentityDocDialog}
                    addButtonText="Add"
                    testIdPrefix="identity-doc"
                    dialogTitle="Identity Document"
                  />
                </div>
              )}
            </div>

            {/* Question 4: Do you have the right to temporary or permanently reside in any country of which you are not a citizen? */}
            <div>
              <Field
                type="radio"
                name="permanent_residency_rights"
                control={form.control}
                label="Do you have the right to temporary or permanently reside in any country of which you are not a citizen?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {permanentResidencyRights === "Yes" && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Enter details of all countries that you hold temporary or permanent residency for
                  </p>
                  <RepeaterTable
                    data={prCountries}
                    columns={countryColumns}
                    onAdd={(row) => updatePrCountries([...prCountries, row])}
                    onEdit={(index, row) => {
                      const updated = [...prCountries];
                      updated[index] = row;
                      updatePrCountries(updated);
                    }}
                    onDelete={(index) => {
                      const updated = prCountries.filter((_, i) => i !== index);
                      updatePrCountries(updated);
                    }}
                    DialogComponent={CountryDialog}
                    addButtonText="Add"
                    testIdPrefix="pr-country"
                    dialogTitle="Temporary or Permanent Residency"
                  />
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
