"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PassportDocumentsSection } from "@/components/intake/PassportDocumentsSection";
import { SimplifiedOtherIdentityDialog } from "@/components/intake/temporary-work/SimplifiedOtherIdentityDialog";
import { RepeaterTable } from "@/components/RepeaterTable";
import { COUNTRIES } from "@/reuseable/countries";
import { PERSONAL_MONTHS } from "@/lib/targetVisaPersonalDetails";
import { getUnresolvedIdentityImports } from "@/lib/mainApplicantIdentity";
import { preserveEditedIdentityRows } from "@/lib/targetVisaIdentity";

export function IdentityDocumentFields({ form }) {
  const id = useId();
  const values = form.watch();
  const documents = values.other_identity_documents || [];
  const passports = values.passports || [];
  const set = (name, value) => form.setValue(name, value, { shouldDirty: true, shouldValidate: true });
  const days = Array.from({ length: 31 }, (_, index) => String(index + 1));
  const years = Array.from({ length: 100 }, (_, index) => String(new Date().getFullYear() - index));
  const select = (name, options, placeholder) => {
    const current = values.national_id_card?.[name] || "";
    const choices = current && !options.includes(current) ? [...options, current] : options;
    return <Select value={current} onValueChange={(value) => set(`national_id_card.${name}`, value)}>
      <SelectTrigger data-testid={`select-national-id-${name}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{choices.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
    </Select>;
  };
  const unresolved = getUnresolvedIdentityImports(values);
  return <>
    <PassportDocumentsSection hasPassport={values.has_passport} passports={passports}
      onHasPassportChange={(value) => set("has_passport", value)}
      onPassportsChange={(rows) => set("passports", preserveEditedIdentityRows(passports, rows))}
      error={form.formState.errors.passports} />
    <div className="space-y-4 pt-6 border-t">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">National Identity Document</h2>
      <Label className="text-base font-medium mb-3 block">Do you have a National ID card?</Label>
      <RadioGroup value={values.has_national_id || "no"} onValueChange={(value) => set("has_national_id", value)} className="flex gap-4" data-testid="radio-national-id">
        {["yes", "no"].map((value) => <div key={value} className="flex items-center"><RadioGroupItem id={`${id}-nid-${value}`} value={value} /><Label htmlFor={`${id}-nid-${value}`} className="ml-2 cursor-pointer font-normal">{value === "yes" ? "Yes" : "No"}</Label></div>)}
      </RadioGroup>
      {values.has_national_id === "yes" && <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-gray-900">National identity card</h3>
        <p className="text-sm text-gray-600">Enter details exactly as shown on the national identity card.</p>
        <div className="bg-blue-50 p-3 rounded-md mb-4 border border-blue-100"><p className="text-sm text-blue-800 italic">Note: If the National identity card does not have a Date of issue or a Date of expiry, do not enter a date. Leave the field/s blank.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[["family_name", "Family name"], ["given_names", "Given names"], ["identification_number", "Identification number"]].map(([name, label]) => <div key={name}><Label>{label}</Label><Input {...form.register(`national_id_card.${name}`)} data-testid={`input-national-id-${name}`} />{form.formState.errors.national_id_card?.[name] && <p className="text-sm text-red-600 mt-1">{form.formState.errors.national_id_card[name].message}</p>}</div>)}
          <div><Label>Country of issue</Label>{select("country_of_issue", COUNTRIES, "Choose Country")}{form.formState.errors.national_id_card?.country_of_issue && <p className="text-sm text-red-600 mt-1">{form.formState.errors.national_id_card.country_of_issue.message}</p>}</div>
        </div>
        {[["date_issued", "Date of issue"], ["date_expiry", "Date of expiry"]].map(([prefix, label]) => <div key={prefix}>
          <Label>{label} <span className="text-gray-500 font-normal">(optional)</span></Label>
          <div className="grid grid-cols-3 gap-2 mt-1">{select(`${prefix}_day`, days, "Day")}{select(`${prefix}_month`, PERSONAL_MONTHS, "Month")}{select(`${prefix}_year`, years, "Year")}</div>
        </div>)}
      </div>}
    </div>
    <div className="space-y-4 pt-6 border-t">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Other Identity Documents</h2>
      <p className="text-sm text-gray-600 mb-2">Enter details of other identity documents you hold.</p>
      <RepeaterTable data={documents} columns={[
        { key: "document_type", label: "Type" }, { key: "family_name", label: "Family name" }, { key: "given_names", label: "Given names" },
        { key: "identification_number", label: "ID number" }, { key: "country_of_issue", label: "Country" },
      ]} onAdd={(row) => set("other_identity_documents", [...documents, row])}
        onEdit={(index, row) => set("other_identity_documents", documents.map((current, i) => i === index ? { ...current, ...row } : current))}
        onDelete={(index) => set("other_identity_documents", documents.filter((_, i) => i !== index))}
        DialogComponent={SimplifiedOtherIdentityDialog} addButtonText="Add document" testIdPrefix="other-identity" />
    </div>
    {unresolved.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h3 className="font-semibold">Imported identity documents need review</h3>
      <p className="mt-1">Add these documents to the National ID or Other Identity Documents section using their identification number and country.</p>
      <ul className="mt-3 list-disc pl-5">{unresolved.map((row, index) => <li key={index}>{[row.document_type || row.doc_type || "Identity document", row.identification_number || row.id_number, row.country_of_issue].filter(Boolean).join(" - ")}</li>)}</ul>
    </div>}
  </>;
}
