"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getApplicationIdFromSearchParams, getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import {
  EMPTY_NATIONAL_ID_CARD,
  getIdentityLegacyRoot,
  getUnresolvedIdentityImports,
  hasIdentityExtras,
  normalizeIdentityForVisa,
  resolveIdentityDraftData,
  validateIdentityForVisa,
} from "@/lib/mainApplicantIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogFooter } from "@/components/ui/dialog";
import { FormNavigation } from "@/components/FormNavigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PassportDocumentsSection } from "@/components/intake/PassportDocumentsSection";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimplifiedOtherIdentityDialog } from "@/components/intake/temporary-work/SimplifiedOtherIdentityDialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/reuseable/countries";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { showCompletionIssuesToast } from "@/lib/temporaryWorkCompletionUi";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1));
const YEARS = Array.from({ length: 100 }, (_, index) => String(new Date().getFullYear() - index));
const CITIZENSHIP_METHODS = ["Birth", "Descent", "Naturalisation"];
const CEASED_REASONS = ["Renounced", "Revoked", "Other"];
const RESIDENCE_STATUSES = ["Permanent", "Temporary"];

const requiredString = z.string().min(1, "Required");
const formSchema = z.object({
  has_passport: z.enum(["yes", "no"]),
  passports: z.array(z.any()).optional(),
  has_national_id: z.enum(["yes", "no"]),
  national_id_card: z.object({
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
  }).optional(),
  other_identity_documents: z.array(z.object({
    family_name: requiredString,
    given_names: requiredString,
    document_type: requiredString,
    identification_number: requiredString,
    country_of_issue: requiredString,
  })).optional(),
  citizen_of_country: z.enum(["yes", "no"]).optional(),
  stateless_explanation: z.string().optional(),
  ever_been_citizen: z.enum(["yes", "no"]).optional(),
  citizenships: z.array(z.any()).optional(),
  permanent_residency_rights: z.enum(["yes", "no"]).optional(),
  pr_countries: z.array(z.any()).optional(),
  identity_import_review: z.array(z.any()).optional(),
}).passthrough().superRefine((data, ctx) => {
  validateIdentityForVisa(data, "temporary-work").forEach((issue) => {
    if (issue === "Passport/travel document details") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please add at least one passport/travel document", path: ["passports"] });
    }
    if (issue === "National ID family name") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Family name is required", path: ["national_id_card", "family_name"] });
    }
    if (issue === "National ID given names") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Given names are required", path: ["national_id_card", "given_names"] });
    }
    if (issue === "National ID number") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Identification number is required", path: ["national_id_card", "identification_number"] });
    }
    if (issue === "National ID country of issue") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Country of issue is required", path: ["national_id_card", "country_of_issue"] });
    }
    if (issue.startsWith("Other identity document")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Complete all other identity document rows", path: ["other_identity_documents"] });
    }
  });
});

function SelectField({ value, onChange, placeholder = "Choose", options, testId }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function DateSelects({ row, setValue, prefix, years = YEARS, testIdPrefix }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <SelectField value={row?.[`${prefix}_day`]} onChange={(value) => setValue(`${prefix}_day`, value)} placeholder="Day" options={DAYS} testId={testIdPrefix ? `${testIdPrefix}-day` : undefined} />
      <SelectField value={row?.[`${prefix}_month`]} onChange={(value) => setValue(`${prefix}_month`, value)} placeholder="Month" options={MONTHS} testId={testIdPrefix ? `${testIdPrefix}-month` : undefined} />
      <SelectField value={row?.[`${prefix}_year`]} onChange={(value) => setValue(`${prefix}_year`, value)} placeholder="Year" options={years} testId={testIdPrefix ? `${testIdPrefix}-year` : undefined} />
    </div>
  );
}

function CitizenshipDialog({ editingRow, onSave, onCancel }) {
  const form = useForm({
    defaultValues: {
      country: "",
      how_obtained: "",
      date_obtained_day: "",
      date_obtained_month: "",
      date_obtained_year: "",
      still_citizen: "yes",
      date_ceased_day: "",
      date_ceased_month: "",
      date_ceased_year: "",
      reason_ceased: "",
      ...editingRow,
    },
  });
  const values = form.watch();

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div>
        <Label>Country of citizenship</Label>
        <SelectField value={values.country} onChange={(value) => form.setValue("country", value)} options={COUNTRIES} testId="select-citizenship-country" />
      </div>
      <div>
        <Label>How was this citizenship obtained?</Label>
        <SelectField value={values.how_obtained} onChange={(value) => form.setValue("how_obtained", value)} options={CITIZENSHIP_METHODS} testId="select-citizenship-method" />
      </div>
      <div>
        <Label>Date obtained <span className="text-gray-500 font-normal">(optional)</span></Label>
        <DateSelects row={values} setValue={form.setValue} prefix="date_obtained" />
      </div>
      <div>
        <Label className="mb-2 block">Are you still a citizen of this country?</Label>
        <RadioGroup value={values.still_citizen} onValueChange={(value) => form.setValue("still_citizen", value)} className="flex gap-4">
          <div className="flex items-center"><RadioGroupItem value="yes" id="citizen-still-yes" /><Label htmlFor="citizen-still-yes" className="ml-2 font-normal">Yes</Label></div>
          <div className="flex items-center"><RadioGroupItem value="no" id="citizen-still-no" /><Label htmlFor="citizen-still-no" className="ml-2 font-normal">No</Label></div>
        </RadioGroup>
      </div>
      {values.still_citizen === "no" && (
        <>
          <div>
            <Label>Date ceased</Label>
            <DateSelects row={values} setValue={form.setValue} prefix="date_ceased" />
          </div>
          <div>
            <Label>Reason citizenship ceased</Label>
            <SelectField value={values.reason_ceased} onChange={(value) => form.setValue("reason_ceased", value)} options={CEASED_REASONS} testId="select-citizenship-ceased-reason" />
          </div>
        </>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={form.handleSubmit(onSave)}>OK</Button>
      </DialogFooter>
    </div>
  );
}

function ResidenceRightDialog({ editingRow, onSave, onCancel }) {
  const expiryYears = Array.from({ length: 80 }, (_, index) => String(new Date().getFullYear() + index));
  const form = useForm({ defaultValues: { country: "", status: "", expiry_day: "", expiry_month: "", expiry_year: "", ...editingRow } });
  const values = form.watch();

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div>
        <Label>Country</Label>
        <SelectField value={values.country} onChange={(value) => form.setValue("country", value)} options={COUNTRIES} testId="select-residence-country" />
      </div>
      <div>
        <Label>Residence right</Label>
        <SelectField value={values.status} onChange={(value) => form.setValue("status", value)} options={RESIDENCE_STATUSES} testId="select-residence-status" />
      </div>
      {values.status === "Temporary" && (
        <div>
          <Label>Expiry date</Label>
          <DateSelects row={values} setValue={form.setValue} prefix="expiry" years={expiryYears} />
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={form.handleSubmit(onSave)}>OK</Button>
      </DialogFooter>
    </div>
  );
}

function ImportReviewPanel({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h3 className="font-semibold">Imported identity documents need review</h3>
      <p className="mt-1">
        We found older government-ID answers that could not be safely converted. Add a National ID or Other Identity Document with the same identification number and country, then Continue.
      </p>
      <ul className="mt-3 list-disc pl-5">
        {rows.map((row, index) => (
          <li key={`${row.identification_number || row.id_number || "doc"}-${index}`}>
            {[row.document_type || row.doc_type || "Identity document", row.identification_number || row.id_number, row.country_of_issue].filter(Boolean).join(" - ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MainApplicantIdentityPage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
  const appIdParam = getApplicationIdFromSearchParams(searchParams);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const visaType = getVisaTypeFromPath(pathname);
  const showExtras = hasIdentityExtras(visaType);

  useEffect(() => {
    if (appIdParam && appIdParam !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdParam);
      draftStore.loadDraft(appIdParam);
    }
  }, [appIdParam, draftSnap.currentApplicationId]);

  const profile = profileId ? draftSnap.draft?.profiles?.find((item) => String(item.id) === String(profileId)) : null;
  const rawIdentity = useMemo(
    () => resolveIdentityDraftData(draftSnap.draft, visaType, profileId),
    [draftSnap.draft, visaType, profileId]
  );
  const defaultValues = useMemo(
    () => normalizeIdentityForVisa(rawIdentity, visaType, profile),
    [rawIdentity, visaType, profile]
  );
  const form = useForm({ resolver: zodResolver(formSchema), defaultValues });
  const values = form.watch();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const mergePayload = (data) => ({
    ...rawIdentity,
    ...data,
    national_id_card: { ...EMPTY_NATIONAL_ID_CARD, ...(data.national_id_card || {}) },
  });

  const saveData = (data) => {
    const payload = mergePayload(data);
    if (profileId) return draftStore.saveProfileSectionData(profileId, "identity", payload);
    return draftStore.saveSectionData(getIdentityLegacyRoot(visaType), payload);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveData(form.getValues());
      toast(result.success
        ? { title: "Draft saved", description: "Your changes have been saved successfully" }
        : { title: "Error", description: result.error || "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data) => {
    const issues = validateIdentityForVisa(data, visaType);
    if (issues.length > 0) {
      toast({
        title: "Identity section incomplete",
        description: issues.join(", "),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveData(data);
      if (!result.success) {
        toast({ title: "Error", description: result.error || "Failed to save changes", variant: "destructive" });
        return;
      }

      const pageKey = `${visaType}/main-applicant/identity`;
      const completionResult = profileId
        ? await draftStore.markProfilePageComplete(profileId, pageKey)
        : await draftStore.markPageComplete(pageKey, null, getIdentityLegacyRoot(visaType));

      if (!completionResult.success) {
        showCompletionIssuesToast(toast, completionResult);
        return;
      }

      const nextRoute = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      if (nextRoute) {
        startNavigation(nextRoute);
        router.push(nextRoute);
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

  const setArray = (name, value) => form.setValue(name, value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  const unresolvedImports = getUnresolvedIdentityImports(values);

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Main Applicant's Identity</CardTitle>
        <p className="text-sm text-gray-600 mt-2">In this section, provide details about the main applicant&apos;s identity.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <PassportDocumentsSection
            hasPassport={values.has_passport}
            passports={values.passports || []}
            onHasPassportChange={(value) => form.setValue("has_passport", value, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
            onPassportsChange={(value) => setArray("passports", value)}
            error={form.formState.errors.passports}
          />

          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">National Identity Document</h2>
            <Label className="text-base font-medium mb-3 block">Do you have a National ID card?</Label>
            <RadioGroup
              value={values.has_national_id || "no"}
              onValueChange={(value) => {
                form.setValue("has_national_id", value, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                if (value === "no") form.setValue("national_id_card", { ...EMPTY_NATIONAL_ID_CARD }, { shouldValidate: true });
              }}
              className="flex gap-4"
              data-testid="radio-national-id"
            >
              <div className="flex items-center"><RadioGroupItem value="yes" id="nid-yes" /><Label htmlFor="nid-yes" className="ml-2 cursor-pointer font-normal">Yes</Label></div>
              <div className="flex items-center"><RadioGroupItem value="no" id="nid-no" /><Label htmlFor="nid-no" className="ml-2 cursor-pointer font-normal">No</Label></div>
            </RadioGroup>

            {values.has_national_id === "yes" && (
              <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
                <h3 className="text-lg font-semibold text-gray-900">National identity card</h3>
                <p className="text-sm text-gray-600">Enter details exactly as shown on the national identity card.</p>
                <div className="bg-blue-50 p-3 rounded-md mb-4 border border-blue-100">
                  <p className="text-sm text-blue-800 italic">Note: If the National identity card does not have a Date of issue or a Date of expiry, do not enter a date. Leave the field/s blank.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Family name</Label><Input {...form.register("national_id_card.family_name")} />{form.formState.errors.national_id_card?.family_name && <p className="text-sm text-red-600 mt-1">{form.formState.errors.national_id_card.family_name.message}</p>}</div>
                  <div><Label>Given names</Label><Input {...form.register("national_id_card.given_names")} />{form.formState.errors.national_id_card?.given_names && <p className="text-sm text-red-600 mt-1">{form.formState.errors.national_id_card.given_names.message}</p>}</div>
                  <div><Label>Identification number</Label><Input {...form.register("national_id_card.identification_number")} />{form.formState.errors.national_id_card?.identification_number && <p className="text-sm text-red-600 mt-1">{form.formState.errors.national_id_card.identification_number.message}</p>}</div>
                  <div>
                    <Label>Country of issue</Label>
                    <SelectField value={values.national_id_card?.country_of_issue} onChange={(value) => form.setValue("national_id_card.country_of_issue", value, { shouldValidate: true })} options={COUNTRIES} />
                    {form.formState.errors.national_id_card?.country_of_issue && <p className="text-sm text-red-600 mt-1">{form.formState.errors.national_id_card.country_of_issue.message}</p>}
                  </div>
                </div>
                <div><Label>Date of issue <span className="text-gray-500 font-normal">(optional)</span></Label><DateSelects row={values.national_id_card} setValue={(field, value) => form.setValue(`national_id_card.${field}`, value)} prefix="date_issued" /></div>
                <div><Label>Date of expiry <span className="text-gray-500 font-normal">(optional)</span></Label><DateSelects row={values.national_id_card} setValue={(field, value) => form.setValue(`national_id_card.${field}`, value)} prefix="date_expiry" /></div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Other Identity Documents</h2>
            <p className="text-sm text-gray-600 mb-2">Enter details of other identity documents you hold.</p>
            <RepeaterTable
              data={values.other_identity_documents || []}
              columns={[
                { key: "document_type", label: "Type" },
                { key: "family_name", label: "Family name" },
                { key: "given_names", label: "Given names" },
                { key: "identification_number", label: "ID number" },
                { key: "country_of_issue", label: "Country" },
              ]}
              onAdd={(row) => setArray("other_identity_documents", [...(values.other_identity_documents || []), row])}
              onEdit={(index, row) => setArray("other_identity_documents", (values.other_identity_documents || []).map((item, itemIndex) => itemIndex === index ? row : item))}
              onDelete={(index) => setArray("other_identity_documents", (values.other_identity_documents || []).filter((_, itemIndex) => itemIndex !== index))}
              DialogComponent={SimplifiedOtherIdentityDialog}
              addButtonText="Add document"
              testIdPrefix="other-identity"
            />
          </div>

          <ImportReviewPanel rows={unresolvedImports} />

          {showExtras && (
            <div className="space-y-6 pt-6 border-t">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Additional Citizenship and Residence Information</h2>
              <div>
                <Label className="text-base font-medium mb-3 block">Are you currently a Citizen of any Country?</Label>
                <RadioGroup value={values.citizen_of_country || "no"} onValueChange={(value) => form.setValue("citizen_of_country", value, { shouldDirty: true })} className="flex gap-4" data-testid="radio-current-citizenship">
                  <div className="flex items-center"><RadioGroupItem value="yes" id="citizen-current-yes" /><Label htmlFor="citizen-current-yes" className="ml-2 font-normal">Yes</Label></div>
                  <div className="flex items-center"><RadioGroupItem value="no" id="citizen-current-no" /><Label htmlFor="citizen-current-no" className="ml-2 font-normal">No</Label></div>
                </RadioGroup>
              </div>
              {values.citizen_of_country === "no" && (
                <>
                  <div>
                    <Label>You have answered that you are not a Citizen of any Country. You must provide details of how, when and why you are stateless</Label>
                    <Textarea rows={4} {...form.register("stateless_explanation")} data-testid="textarea-stateless-explanation" />
                  </div>
                  <div>
                    <Label className="text-base font-medium mb-3 block">Have you ever been a Citizen of any Country?</Label>
                    <RadioGroup value={values.ever_been_citizen || "no"} onValueChange={(value) => form.setValue("ever_been_citizen", value, { shouldDirty: true })} className="flex gap-4" data-testid="radio-ever-citizen">
                      <div className="flex items-center"><RadioGroupItem value="yes" id="ever-citizen-yes" /><Label htmlFor="ever-citizen-yes" className="ml-2 font-normal">Yes</Label></div>
                      <div className="flex items-center"><RadioGroupItem value="no" id="ever-citizen-no" /><Label htmlFor="ever-citizen-no" className="ml-2 font-normal">No</Label></div>
                    </RadioGroup>
                  </div>
                </>
              )}
              {(values.citizen_of_country === "yes" || (values.citizen_of_country === "no" && values.ever_been_citizen === "yes")) && (
                <RepeaterTable
                  data={values.citizenships || []}
                  columns={[
                    { key: "country", label: "Country" },
                    { key: "how_obtained", label: "How obtained" },
                    { key: "still_citizen", label: "Still citizen" },
                  ]}
                  onAdd={(row) => setArray("citizenships", [...(values.citizenships || []), row])}
                  onEdit={(index, row) => setArray("citizenships", (values.citizenships || []).map((item, itemIndex) => itemIndex === index ? row : item))}
                  onDelete={(index) => setArray("citizenships", (values.citizenships || []).filter((_, itemIndex) => itemIndex !== index))}
                  DialogComponent={CitizenshipDialog}
                  addButtonText="Add citizenship"
                  testIdPrefix="citizenship"
                />
              )}
              <div>
                <Label className="text-base font-medium mb-3 block">Do you have the right to temporary or permanently reside in any country of which you are not a citizen?</Label>
                <RadioGroup value={values.permanent_residency_rights || "no"} onValueChange={(value) => form.setValue("permanent_residency_rights", value, { shouldDirty: true })} className="flex gap-4" data-testid="radio-residence-rights">
                  <div className="flex items-center"><RadioGroupItem value="yes" id="residence-rights-yes" /><Label htmlFor="residence-rights-yes" className="ml-2 font-normal">Yes</Label></div>
                  <div className="flex items-center"><RadioGroupItem value="no" id="residence-rights-no" /><Label htmlFor="residence-rights-no" className="ml-2 font-normal">No</Label></div>
                </RadioGroup>
              </div>
              {values.permanent_residency_rights === "yes" && (
                <RepeaterTable
                  data={values.pr_countries || []}
                  columns={[
                    { key: "country", label: "Country" },
                    { key: "status", label: "Status" },
                  ]}
                  onAdd={(row) => setArray("pr_countries", [...(values.pr_countries || []), row])}
                  onEdit={(index, row) => setArray("pr_countries", (values.pr_countries || []).map((item, itemIndex) => itemIndex === index ? row : item))}
                  onDelete={(index) => setArray("pr_countries", (values.pr_countries || []).filter((_, itemIndex) => itemIndex !== index))}
                  DialogComponent={ResidenceRightDialog}
                  addButtonText="Add country"
                  testIdPrefix="residence-right"
                />
              )}
            </div>
          )}

          <FormNavigation loading={isSaving} onPrev={handlePrevious} onNext={form.handleSubmit(onSubmit)} onSave={handleSave} saveLabel="Save Draft" nextLabel="Continue" />
        </form>
      </CardContent>
    </Card>
  );
}
