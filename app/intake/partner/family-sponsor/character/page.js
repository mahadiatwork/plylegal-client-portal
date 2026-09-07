"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/reuseable/countries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlignedDateSelector as DateSelector } from "@/components/intake/AlignedDateSelector";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import {
  SPONSOR_CHARACTER_KEYS,
  SPONSOR_CHARACTER_LABELS,
  normalizeSponsorCharacter,
  optionsWithSavedValue,
} from "@/lib/partnerQuestionnaireAlignment";

const TRAINING_TYPES = [
  "Military Training",
  "Paramilitary Training",
  "Weapons Training",
  "Explosives Training",
  "Chemical Product Manufacturing",
  "Biological Product Manufacturing",
  "Other",
];

const SERVICE_TYPES = [
  "Intelligence",
  "Military - Voluntary Service",
  "Military - Compulsory National Service",
  "Military - Conscription",
  "Military - Reserve",
  "National Guard",
  "Militia",
  "Paramilitary",
  "Police",
  "Secret Police",
];

const OFFENCE_KEYS = new Set([
  "convicted_child_offence", "charged_child_offence",
  "convicted_general_offence", "charged_general_offence",
]);

const formSchema = z.object(Object.fromEntries(SPONSOR_CHARACTER_KEYS.flatMap((key) => [
  [key, z.enum(["yes", "no"])],
  [`${key}_details`, z.array(z.any())],
])));

function formatDate(row, prefix) {
  const parts = [row[`${prefix}_day`], row[`${prefix}_month`], row[`${prefix}_year`]].filter(Boolean);
  return parts.join(" ") || row[`${prefix}_display`] || "";
}

// Every existing sponsor declaration has exactly one detail collection. Distinct
// offence, military and general fields are retained; none asks for an applicant.
function SponsorCharacterDialog({ editingRow, onSave, onCancel, questionKey, sponsorName }) {
  const isService = questionKey === "military_service";
  const isTraining = questionKey === "military_training";
  const isMilitary = isService || isTraining;
  const isOffence = OFFENCE_KEYS.has(questionKey);
  const isGeneral = !isMilitary && !isOffence;
  const hasEventDate = isOffence || (isGeneral && !["national_security_risk", "outstanding_debts"].includes(questionKey));
  const form = useForm({
    defaultValues: {
      country: "", date_day: "", date_month: "", date_year: "", offence_type: "", details: "",
      date_from_day: "", date_from_month: "", date_from_year: "",
      date_to_day: "", date_to_month: "", date_to_year: "",
      country_of_service: editingRow?.country_of_service || editingRow?.country || "",
      country_of_deployment: "",
      country_of_training: editingRow?.country_of_training || editingRow?.country || "",
      training_type: "", service_type: "", organisation_name: "",
      position_rank: editingRow?.position_rank || editingRow?.position || "",
      duties_description: "",
      ...editingRow,
    },
  });
  const countryField = isService ? "country_of_service" : isTraining ? "country_of_training" : "country";
  const countryLabel = isService ? "Country of Service" : isTraining ? "Country of Training" : "Country";
  const set = (name, value) => form.setValue(name, value, { shouldDirty: true });
  const select = (name, label, options, placeholder) => <div className="space-y-2">
    <Label htmlFor={`sponsor-${name}`}>{label}</Label>
    <Select value={form.watch(name) || ""} onValueChange={(value) => set(name, value)}>
      <SelectTrigger id={`sponsor-${name}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{optionsWithSavedValue(options, form.watch(name)).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
  const date = (prefix, label) => <DateSelector
    label={label}
    values={{ day: form.watch(`${prefix}_day`) || "", month: form.watch(`${prefix}_month`) || "", year: form.watch(`${prefix}_year`) || "" }}
    onValueChange={(part, value) => set(`${prefix}_${part}`, value)}
    testIdPrefix={`sponsor-${prefix}`}
  />;
  const textField = (name, label) => <div className="space-y-2">
    <Label htmlFor={`sponsor-${name}`}>{label}</Label>
    <Input id={`sponsor-${name}`} {...form.register(name)} />
  </div>;
  const save = form.handleSubmit((values) => {
    // Legacy records may contain data not displayed by this particular dialog.
    // Keep that data and correct the attribution only when the record is edited.
    onSave({ ...editingRow, ...values, applicant_name: sponsorName, ...(editingRow?.name ? { name: sponsorName } : {}) });
  });
  return <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
    <p className="text-sm font-medium">Sponsor: {sponsorName}</p>
    <p className="text-sm text-gray-600">{SPONSOR_CHARACTER_LABELS[questionKey]}</p>
    {select(countryField, countryLabel, COUNTRIES, "Choose Country")}
    {isService && select("country_of_deployment", "Country of Deployment", COUNTRIES, "Choose Country")}
    {hasEventDate && date("date", isOffence ? "Date of Offence" : "Date")}
    {isMilitary && <>{date("date_from", "Date From")}{date("date_to", "Date To (leave blank if ongoing)")}</>}
    {isOffence && textField("offence_type", "Offence Type")}
    {isTraining && select("training_type", "Type of Training", TRAINING_TYPES, "Choose Type")}
    {isService && <>
      {select("service_type", "Type of Service", SERVICE_TYPES, "Choose Type")}
      {textField("organisation_name", "Name of Organisation/Unit/Brigade Group")}
      {textField("position_rank", "Position/Rank")}
      <div className="space-y-2"><Label htmlFor="sponsor-duties_description">Description of Duties</Label><Textarea id="sponsor-duties_description" {...form.register("duties_description")} rows={3} /></div>
    </>}
    <div className="space-y-2">
      <Label htmlFor="sponsor-details">Give details</Label>
      <Textarea id="sponsor-details" {...form.register("details")} rows={4} placeholder="Please provide full details as requested in the instructions above..." />
    </div>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="button" onClick={save} className="bg-[#4F726B] text-white">OK</Button>
    </DialogFooter>
  </div>;
}

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { startNavigation } = useNavigationLoading();
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const sponsorDetails = draftSnap.draft?.familySponsor?.details || draftStore.getSectionData("familySponsor.details") || {};
  const sponsorName = [sponsorDetails.given_names, sponsorDetails.family_name].filter(Boolean).join(" ") || "Family Sponsor";
  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: normalizeSponsorCharacter() });

  useEffect(() => {
    const appId = searchParams.get("applicationId");
    if (appId && appId !== draftStore.currentApplicationId) {
      draftStore.setApplicationId(appId);
      draftStore.loadDraft(appId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!draftSnap.isLoading) form.reset(normalizeSponsorCharacter(draftStore.getSectionData("familySponsor.details")));
  }, [draftSnap.currentApplicationId, draftSnap.isLoading, form]);

  const save = async (values, continueAfterSave = false) => {
    const existing = draftStore.getSectionData("familySponsor.details") || {};
    const merged = { ...existing, ...values };
    if (Array.isArray(existing.national_security_details)) merged.national_security_details = values.national_security_risk_details;
    const result = await draftStore.saveSectionData("familySponsor.details", merged);
    if (!result.success) {
      toast({ title: "Error saving draft", description: result.error || "Please try again.", variant: "destructive" });
      return;
    }
    if (continueAfterSave) {
      const completion = await draftStore.markPageComplete("partner/family-sponsor/character", null, "familySponsor.details");
      if (!completion.success) {
        toast({ title: "Unable to continue", description: completion.error || "Please try again.", variant: "destructive" });
        return;
      }
      const next = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
      if (next) { startNavigation(next); router.push(next); }
    } else toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
  };
  const previous = () => {
    const route = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
    if (route) { startNavigation(route); router.push(route); }
  };

  return <Card className="rounded-2xl shadow-md bg-white">
    <CardHeader>
      <CardTitle className="text-2xl font-semibold">Character</CardTitle>
      <p className="text-sm text-gray-600">Provide character information for your Sponsor.</p>
      <p className="text-sm text-gray-600">If your Sponsor answers 'Yes' to any of the character declarations they must give all relevant details.</p>
      <p className="text-sm text-gray-600">If the matter relates to a criminal conviction, provide:</p>
      <ul className="list-disc pl-5 text-sm text-gray-600">
        <li>the date and nature of the offence</li><li>full details of the sentence</li><li>dates of any period of imprisonment or other detention.</li>
      </ul>
    </CardHeader>
    <CardContent>
      <form onSubmit={form.handleSubmit((values) => save(values, true))} className="space-y-8">
        {SPONSOR_CHARACTER_KEYS.map((key) => {
          const field = `${key}_details`;
          const rows = form.watch(field) || [];
          const setRows = (next) => form.setValue(field, next, { shouldDirty: true });
          const military = key === "military_service" || key === "military_training";
          const columns = [
            { key: "country", label: key === "military_service" ? "Country of Service" : key === "military_training" ? "Country of Training" : "Country", format: (row) => row.country_of_service || row.country_of_training || row.country || "" },
            ...(military ? [
              { key: "date_from_year", label: "Date From", format: (row) => formatDate(row, "date_from") },
              { key: "date_to_year", label: "Date To", format: (row) => formatDate(row, "date_to") || "Ongoing" },
            ] : [{ key: "date_year", label: "Date", format: (row) => formatDate(row, "date") }]),
            ...(OFFENCE_KEYS.has(key) ? [{ key: "offence_type", label: "Offence" }] : []),
            { key: "details", label: "Give details", format: (row) => row.details || row.duties_description || "" },
          ];
          return <div key={key} className="space-y-3 border-b pb-6" data-testid={`sponsor-declaration-${key}`}>
            <Label>{SPONSOR_CHARACTER_LABELS[key]}</Label>
            <RadioGroup value={form.watch(key)} onValueChange={(value) => form.setValue(key, value, { shouldDirty: true })} className="flex gap-4">
              {["yes", "no"].map((value) => <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value} id={`${key}-${value}`} data-testid={`radio-${key}-${value}`} />
                <Label htmlFor={`${key}-${value}`}>{value === "yes" ? "Yes" : "No"}</Label>
              </div>)}
            </RadioGroup>
            {form.watch(key) === "yes" && <RepeaterTable
              data={rows}
              columns={columns}
              onAdd={(row) => setRows([...rows, row])}
              onEdit={(index, row) => setRows(rows.map((current, i) => i === index ? row : current))}
              onDelete={(index) => setRows(rows.filter((_, i) => i !== index))}
              DialogComponent={(props) => <SponsorCharacterDialog {...props} questionKey={key} sponsorName={sponsorName} />}
              dialogTitle="Character details"
              addButtonText="Add Details"
              testIdPrefix={`sponsor-${key}`}
            />}
          </div>;
        })}
        <FormNavigation onPrev={previous} onSave={() => save(form.getValues())} onNext={form.handleSubmit((values) => save(values, true))} nextLabel="Continue" loading={draftSnap.isSaving} />
      </form>
    </CardContent>
  </Card>;
}
