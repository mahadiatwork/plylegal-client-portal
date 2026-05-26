"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { authStore } from "@/stores";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, getApplicationIdFromPathname, getNextRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserCircle2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Baby,
  UserCheck,
  User,
  ChevronRight,
  UserMinus,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const RELATIONSHIPS = [
  { value: "main_applicant", label: "Main Applicant (Nominated Worker)" },
  { value: "spouse", label: "Spouse or De Facto Partner" },
  { value: "child", label: "Dependent Child" },
  { value: "other", label: "Other Dependent" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

const GENDERS = ["Male", "Female", "Other"];

const NON_MIGRATING_RELATIONSHIPS = [
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "child", label: "Child (not migrating)" },
  { value: "grandparent", label: "Grandparent" },
  { value: "other_relative", label: "Other Relative" },
];

const RELATIONSHIP_STATUSES = [
  { value: "never_married", label: "Never Married" },
  { value: "married", label: "Married" },
  { value: "de_facto", label: "De Facto" },
  { value: "separated", label: "Separated" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const OTHER_NAME_TYPES = [
  { value: "alias", label: "Alias" },
  { value: "maiden_name", label: "Maiden Name" },
  { value: "name_at_birth", label: "Name at Birth" },
  { value: "other_spelling", label: "Other Spelling" },
];

const nmfSchema = z.object({
  relationship: z.string().min(1, "Relationship is required"),
  relationship_status: z.string().optional(),
  has_current_passport: z.enum(["yes", "no"]),
  passport_family_name: z.string().optional(),
  passport_given_names: z.string().optional(),
  passport_sex: z.string().optional(),
  passport_dob_day: z.string().optional(),
  passport_dob_month: z.string().optional(),
  passport_dob_year: z.string().optional(),
  has_national_identity_card: z.enum(["yes", "no"]).optional(),
  place_of_birth_town: z.string().optional(),
  place_of_birth_state: z.string().optional(),
  place_of_birth_country: z.string().optional(),
  other_names: z.array(z.object({
    family_name: z.string().optional(),
    given_names: z.string().optional(),
    type: z.string().optional(),
  })).optional(),
  citizenship_has_other: z.enum(["yes", "no"]).optional(),
  citizenship_countries: z.string().optional(),
  has_other_identity_documents: z.enum(["yes", "no"]).optional(),
  requires_health_examination: z.enum(["yes", "no"]).optional(),
});

// Map zero-padded month number → full month name expected by the form
const MONTH_NUM_TO_NAME_NMF = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
};

function NonMigratingMemberDialog({ open, onClose, onSave, editingMember, availableCrmNonMigrating = [], isSaving = false }) {
  const [selectedCrmId, setSelectedCrmId] = useState(null);

  const form = useForm({
    resolver: zodResolver(nmfSchema),
    defaultValues: {
      relationship: "",
      relationship_status: "",
      has_current_passport: "no",
      passport_family_name: "",
      passport_given_names: "",
      passport_sex: "",
      passport_dob_day: "",
      passport_dob_month: "",
      passport_dob_year: "",
      has_national_identity_card: "no",
      place_of_birth_town: "",
      place_of_birth_state: "",
      place_of_birth_country: "",
      other_names: [],
      citizenship_has_other: "no",
      citizenship_countries: "",
      has_other_identity_documents: "no",
      requires_health_examination: "no",
    },
  });

  const { fields: otherNameFields, append: appendOtherName, remove: removeOtherName } = useFieldArray({
    control: form.control,
    name: "other_names",
  });

  useEffect(() => {
    if (!open) {
      setSelectedCrmId(null);
      return;
    }
    if (editingMember) {
      form.reset({
        relationship: editingMember.relationship || "",
        relationship_status: editingMember.relationship_status || "",
        has_current_passport: editingMember.has_current_passport || "no",
        passport_family_name: editingMember.passport?.family_name || "",
        passport_given_names: editingMember.passport?.given_names || "",
        passport_sex: editingMember.passport?.sex || "",
        passport_dob_day: editingMember.passport?.dob_day || "",
        passport_dob_month: editingMember.passport?.dob_month || "",
        passport_dob_year: editingMember.passport?.dob_year || "",
        has_national_identity_card: editingMember.has_national_identity_card || "no",
        place_of_birth_town: editingMember.place_of_birth?.town_city || "",
        place_of_birth_state: editingMember.place_of_birth?.state_province || "",
        place_of_birth_country: editingMember.place_of_birth?.country || "",
        other_names: editingMember.other_names || [],
        citizenship_has_other: editingMember.citizenship?.has_other || "no",
        citizenship_countries: editingMember.citizenship?.countries?.join(", ") || "",
        has_other_identity_documents: editingMember.has_other_identity_documents || "no",
        requires_health_examination: editingMember.requires_health_examination || "no",
      });
      if (editingMember.zohoDependentId) {
        setSelectedCrmId(editingMember.zohoDependentId);
      }
    } else {
      form.reset({
        relationship: "",
        relationship_status: "",
        has_current_passport: "no",
        passport_family_name: "",
        passport_given_names: "",
        passport_sex: "",
        passport_dob_day: "",
        passport_dob_month: "",
        passport_dob_year: "",
        has_national_identity_card: "no",
        place_of_birth_town: "",
        place_of_birth_state: "",
        place_of_birth_country: "",
        other_names: [],
        citizenship_has_other: "no",
        citizenship_countries: "",
        has_other_identity_documents: "no",
        requires_health_examination: "no",
      });
      setSelectedCrmId(null);
    }
  }, [editingMember, open]);

  const hasPassport = form.watch("has_current_passport") === "yes";
  const hasCitizenshipOther = form.watch("citizenship_has_other") === "yes";

  const handleSelectCrm = (dep) => {
    setSelectedCrmId(dep.zohoDependentId);
    form.reset({
      relationship: dep.relationship === "child" ? "child" : "other_relative",
      relationship_status: "",
      has_current_passport: "yes",
      passport_family_name: dep.family_name || "",
      passport_given_names: dep.given_names || "",
      passport_sex: dep.gender || "",
      passport_dob_day: dep.birth_day ? String(parseInt(dep.birth_day, 10)) : "",
      passport_dob_month: MONTH_NUM_TO_NAME_NMF[dep.birth_month] || dep.birth_month || "",
      passport_dob_year: dep.birth_year || "",
      has_national_identity_card: "no",
      place_of_birth_town: "",
      place_of_birth_state: "",
      place_of_birth_country: dep.citizenship || "",
      other_names: [],
      citizenship_has_other: dep.citizenship ? "yes" : "no",
      citizenship_countries: dep.citizenship || "",
      has_other_identity_documents: "no",
      requires_health_examination: "no",
    });
  };

  const handleClearCrm = () => {
    setSelectedCrmId(null);
    form.reset({
      relationship: "",
      relationship_status: "",
      has_current_passport: "no",
      passport_family_name: "",
      passport_given_names: "",
      passport_sex: "",
      passport_dob_day: "",
      passport_dob_month: "",
      passport_dob_year: "",
      has_national_identity_card: "no",
      place_of_birth_town: "",
      place_of_birth_state: "",
      place_of_birth_country: "",
      other_names: [],
      citizenship_has_other: "no",
      citizenship_countries: "",
      has_other_identity_documents: "no",
      requires_health_examination: "no",
    });
  };

  const handleSubmit = (data) => {
    const member = {
      relationship: data.relationship,
      relationship_status: data.relationship_status,
      has_current_passport: data.has_current_passport,
      passport: data.has_current_passport === "yes" ? {
        family_name: data.passport_family_name,
        given_names: data.passport_given_names,
        sex: data.passport_sex,
        dob_day: data.passport_dob_day,
        dob_month: data.passport_dob_month,
        dob_year: data.passport_dob_year,
      } : null,
      has_national_identity_card: data.has_national_identity_card,
      place_of_birth: {
        town_city: data.place_of_birth_town,
        state_province: data.place_of_birth_state,
        country: data.place_of_birth_country,
      },
      other_names: data.other_names || [],
      citizenship: {
        has_other: data.citizenship_has_other,
        countries: data.citizenship_has_other === "yes"
          ? data.citizenship_countries.split(",").map(c => c.trim()).filter(Boolean)
          : [],
      },
      has_other_identity_documents: data.has_other_identity_documents,
      requires_health_examination: data.requires_health_examination,
      zohoDependentId: selectedCrmId || undefined,
    };
    onSave(member);
    form.reset();
    setSelectedCrmId(null);
  };

  const showCrmSection = !editingMember && availableCrmNonMigrating.length > 0;

  const YesNoRadio = ({ name, label }) => (
    <div>
      <Label className="mb-2 block font-medium">{label}</Label>
      <RadioGroup
        value={form.watch(name)}
        onValueChange={(v) => form.setValue(name, v)}
        className="flex gap-4"
      >
        {["yes", "no"].map((v) => (
          <div key={v} className="flex items-center gap-2">
            <RadioGroupItem value={v} id={`${name}-${v}`} />
            <Label htmlFor={`${name}-${v}`} className="font-normal cursor-pointer capitalize">{v === "yes" ? "Yes" : "No"}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }}>
        <DialogHeader>
          <DialogTitle>{editingMember ? "Edit Non-Migrating Family Member" : "Add Non-Migrating Family Member"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">

          {/* CRM non-migrating members quick-select */}
          {showCrmSection && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From your CRM profile</p>
              <div className="space-y-1.5">
                {availableCrmNonMigrating.map((dep) => {
                  const isSelected = selectedCrmId === dep.zohoDependentId;
                  const initials =
                    (dep.given_names?.[0] || "").toUpperCase() +
                    (dep.family_name?.[0] || "").toUpperCase();
                  const relLabel =
                    dep.relationship === "child" ? "Child" :
                    dep.relationship === "spouse" ? "Spouse / Partner" : "Other";
                  const dob = dep.birth_year
                    ? [dep.birth_day ? String(parseInt(dep.birth_day, 10)) : "", MONTH_NUM_TO_NAME_NMF[dep.birth_month] || dep.birth_month || "", dep.birth_year].filter(Boolean).join(" ")
                    : null;

                  return (
                    <button
                      key={dep.zohoDependentId}
                      type="button"
                      onClick={() => isSelected ? handleClearCrm() : handleSelectCrm(dep)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-[#285646] bg-[#285646]/5 ring-1 ring-[#285646]"
                          : "border-gray-200 hover:border-[#285646]/50 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? "bg-[#285646] text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {initials || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {dep.given_names} {dep.family_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {relLabel}{dob ? ` · DOB: ${dob}` : ""}{dep.citizenship ? ` · ${dep.citizenship}` : ""}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#285646] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or add new person manually</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            </div>
          )}

          {/* Relationship */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Relationship</h3>
            <div>
              <Label className="mb-2 block font-medium">Relationship to Main Applicant <span className="text-red-600">*</span></Label>
              <Select value={form.watch("relationship")} onValueChange={(v) => form.setValue("relationship", v)}>
                <SelectTrigger><SelectValue placeholder="Select relationship..." /></SelectTrigger>
                <SelectContent>
                  {NON_MIGRATING_RELATIONSHIPS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.relationship && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.relationship.message}</p>
              )}
            </div>
            <div>
              <Label className="mb-2 block font-medium">Relationship Status</Label>
              <Select value={form.watch("relationship_status")} onValueChange={(v) => form.setValue("relationship_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Passport */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Passport Details</h3>
            <YesNoRadio name="has_current_passport" label="Does this person have a current passport?" />
            {hasPassport && (
              <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block font-medium">Family Name</Label>
                    <Input {...form.register("passport_family_name")} placeholder="Family name on passport" />
                  </div>
                  <div>
                    <Label className="mb-1 block font-medium">Given Names</Label>
                    <Input {...form.register("passport_given_names")} placeholder="Given names on passport" />
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block font-medium">Sex</Label>
                  <RadioGroup
                    value={form.watch("passport_sex")}
                    onValueChange={(v) => form.setValue("passport_sex", v)}
                    className="flex gap-4"
                  >
                    {["Male", "Female", "Other"].map((g) => (
                      <div key={g} className="flex items-center gap-2">
                        <RadioGroupItem value={g} id={`passport-sex-${g}`} />
                        <Label htmlFor={`passport-sex-${g}`} className="font-normal cursor-pointer">{g}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label className="mb-2 block font-medium">Date of Birth</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={form.watch("passport_dob_day")} onValueChange={(v) => form.setValue("passport_dob_day", v)}>
                      <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                      <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={form.watch("passport_dob_month")} onValueChange={(v) => form.setValue("passport_dob_month", v)}>
                      <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                      <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={form.watch("passport_dob_year")} onValueChange={(v) => form.setValue("passport_dob_year", v)}>
                      <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Identity Documents */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Identity Documents</h3>
            <YesNoRadio name="has_national_identity_card" label="Does this person have a national identity card?" />
            <YesNoRadio name="has_other_identity_documents" label="Does this person have any other identity documents?" />
          </div>

          {/* Place of Birth */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Place of Birth</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block font-medium">Town or City</Label>
                <Input {...form.register("place_of_birth_town")} placeholder="Town or city" />
              </div>
              <div>
                <Label className="mb-1 block font-medium">State or Province</Label>
                <Input {...form.register("place_of_birth_state")} placeholder="State or province" />
              </div>
            </div>
            <div>
              <Label className="mb-1 block font-medium">Country</Label>
              <Input {...form.register("place_of_birth_country")} placeholder="Country of birth" />
            </div>
          </div>

          {/* Other Names */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Other Names / Spellings</h3>
            {otherNameFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="mb-1 block font-medium text-xs">Family Name</Label>
                  <Input {...form.register(`other_names.${index}.family_name`)} placeholder="Family name" />
                </div>
                <div>
                  <Label className="mb-1 block font-medium text-xs">Given Names</Label>
                  <Input {...form.register(`other_names.${index}.given_names`)} placeholder="Given names" />
                </div>
                <div className="flex gap-1 items-end">
                  <div className="flex-1">
                    <Label className="mb-1 block font-medium text-xs">Type</Label>
                    <Select
                      value={form.watch(`other_names.${index}.type`)}
                      onValueChange={(v) => form.setValue(`other_names.${index}.type`, v)}
                    >
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                      <SelectContent>
                        {OTHER_NAME_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeOtherName(index)}
                    className="h-9 w-9 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendOtherName({ family_name: "", given_names: "", type: "" })}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Other Name
            </Button>
          </div>

          {/* Citizenship */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Citizenship</h3>
            <YesNoRadio name="citizenship_has_other" label="Does this person hold citizenship of any other country?" />
            {hasCitizenshipOther && (
              <div>
                <Label className="mb-1 block font-medium">Countries (comma-separated)</Label>
                <Input {...form.register("citizenship_countries")} placeholder="e.g. India, United Kingdom" />
              </div>
            )}
          </div>

          {/* Health */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-1">Health</h3>
            <YesNoRadio name="requires_health_examination" label="Does this person require a health examination?" />
          </div>

        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSaving}
            className="bg-[#285646] hover:bg-[#1f4236] text-white min-w-[120px]"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              editingMember ? "Save Changes" : "Add Member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const profileSchema = z.object({
  given_names: z.string().min(1, "Given name is required"),
  family_name: z.string().min(1, "Family name is required"),
  relationship: z.string().min(1, "Please select a relationship"),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
});

function getRelationshipIcon(rel) {
  switch (rel) {
    case "main_applicant": return UserCheck;
    case "spouse": return Users;
    case "child": return Baby;
    default: return User;
  }
}

function getRelationshipLabel(rel) {
  return RELATIONSHIPS.find(r => r.value === rel)?.label || rel;
}

function getRelationshipColor(rel) {
  switch (rel) {
    case "main_applicant": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "spouse": return "bg-blue-100 text-blue-800 border-blue-200";
    case "child": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Map zero-padded month number → full month name expected by the form
const MONTH_NUM_TO_NAME = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
};

function crmRelToProfileRel(rel) {
  if (rel === "spouse") return "spouse";
  if (rel === "child") return "child";
  return "other";
}

function ProfileDialog({ open, onClose, onSave, editingProfile, hasMainApplicant, availableCrmDependents = [], isSaving = false }) {
  const [selectedCrmId, setSelectedCrmId] = useState(null);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      given_names: "",
      family_name: "",
      relationship: hasMainApplicant ? "" : "main_applicant",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
    },
  });

  // Reset form + CRM selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCrmId(null);
      return;
    }
    if (editingProfile) {
      form.reset({
        given_names: editingProfile.given_names || "",
        family_name: editingProfile.family_name || "",
        relationship: editingProfile.relationship || "",
        gender: editingProfile.gender || "",
        birth_day: editingProfile.birth_day || "",
        birth_month: editingProfile.birth_month || "",
        birth_year: editingProfile.birth_year || "",
      });
    } else {
      form.reset({
        given_names: "",
        family_name: "",
        relationship: hasMainApplicant ? "" : "main_applicant",
        gender: "",
        birth_day: "",
        birth_month: "",
        birth_year: "",
      });
      setSelectedCrmId(null);
    }
  }, [editingProfile, open, hasMainApplicant]);

  const handleSelectCrm = (dep) => {
    setSelectedCrmId(dep.zohoDependentId);
    form.reset({
      given_names: dep.given_names || "",
      family_name: dep.family_name || "",
      relationship: crmRelToProfileRel(dep.relationship),
      gender: dep.gender || "",
      birth_day: dep.birth_day ? String(parseInt(dep.birth_day, 10)) : "",
      birth_month: MONTH_NUM_TO_NAME[dep.birth_month] || dep.birth_month || "",
      birth_year: dep.birth_year || "",
    });
  };

  const handleClearCrm = () => {
    setSelectedCrmId(null);
    form.reset({
      given_names: "",
      family_name: "",
      relationship: hasMainApplicant ? "" : "main_applicant",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
    });
  };

  const handleSubmit = (data) => {
    onSave({ ...data, zohoDependentId: selectedCrmId || undefined });
    form.reset();
    setSelectedCrmId(null);
  };

  const showCrmSection = !editingProfile && availableCrmDependents.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }}>
        <DialogHeader>
          <DialogTitle>{editingProfile ? "Edit Person" : "Add Person"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">

          {/* CRM dependents quick-select */}
          {showCrmSection && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From your CRM profile</p>
              <div className="space-y-1.5">
                {availableCrmDependents.map((dep) => {
                  const isSelected = selectedCrmId === dep.zohoDependentId;
                  const initials =
                    (dep.given_names?.[0] || "").toUpperCase() +
                    (dep.family_name?.[0] || "").toUpperCase();
                  const relLabel =
                    dep.relationship === "spouse" ? "Spouse / Partner" :
                    dep.relationship === "child" ? "Dependent Child" : "Other Dependent";
                  const dob = dep.birth_year
                    ? [dep.birth_day ? String(parseInt(dep.birth_day, 10)) : "", MONTH_NUM_TO_NAME[dep.birth_month] || dep.birth_month || "", dep.birth_year].filter(Boolean).join(" ")
                    : null;

                  return (
                    <button
                      key={dep.zohoDependentId}
                      type="button"
                      onClick={() => isSelected ? handleClearCrm() : handleSelectCrm(dep)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-[#285646] bg-[#285646]/5 ring-1 ring-[#285646]"
                          : "border-gray-200 hover:border-[#285646]/50 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? "bg-[#285646] text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {initials || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {dep.given_names} {dep.family_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {relLabel}{dob ? ` · DOB: ${dob}` : ""}{dep.citizenship ? ` · ${dep.citizenship}` : ""}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#285646] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">or add new person manually</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            </div>
          )}

          {/* Relationship */}
          <div>
            <Label className="mb-2 block font-medium">
              Relationship to Application <span className="text-red-600">*</span>
            </Label>
            <Select
              value={form.watch("relationship")}
              onValueChange={(v) => form.setValue("relationship", v)}
            >
              <SelectTrigger data-testid="select-relationship">
                <SelectValue placeholder="Select relationship..." />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem
                    key={r.value}
                    value={r.value}
                    disabled={r.value === "main_applicant" && hasMainApplicant && editingProfile?.relationship !== "main_applicant"}
                  >
                    {r.label}
                    {r.value === "main_applicant" && hasMainApplicant && editingProfile?.relationship !== "main_applicant" && " (already added)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.relationship && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.relationship.message}</p>
            )}
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="given_names" className="mb-1 block font-medium">
                Given Name(s) <span className="text-red-600">*</span>
              </Label>
              <Input
                id="given_names"
                {...form.register("given_names")}
                placeholder="First name"
                data-testid="input-given-names"
              />
              {form.formState.errors.given_names && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.given_names.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="family_name" className="mb-1 block font-medium">
                Family Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="family_name"
                {...form.register("family_name")}
                placeholder="Last name"
                data-testid="input-family-name"
              />
              {form.formState.errors.family_name && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.family_name.message}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            Add name as it appears in their passport. If they have one name, add it as a family name.
          </p>

          {/* Gender */}
          <div>
            <Label className="mb-2 block font-medium">Gender</Label>
            <RadioGroup
              value={form.watch("gender")}
              onValueChange={(v) => form.setValue("gender", v)}
              className="flex flex-wrap gap-3"
            >
              {GENDERS.map((g) => (
                <div key={g} className="flex items-center gap-2">
                  <RadioGroupItem value={g} id={`gender-${g}`} />
                  <Label htmlFor={`gender-${g}`} className="font-normal cursor-pointer text-sm">
                    {g}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Date of Birth */}
          <div>
            <Label className="mb-2 block font-medium">Date of Birth</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.watch("birth_day")} onValueChange={(v) => form.setValue("birth_day", v)}>
                <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.watch("birth_month")} onValueChange={(v) => form.setValue("birth_month", v)}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.watch("birth_year")} onValueChange={(v) => form.setValue("birth_year", v)}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSaving}
            className="bg-[#285646] hover:bg-[#1f4236] text-white min-w-[120px]"
            data-testid="button-save-profile"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              editingProfile ? "Save Changes" : "Add Person"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApplicationProfilePage() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  // CRM dependents state
  const [crmDependents, setCrmDependents] = useState([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmError, setCrmError] = useState(null);

  useEffect(() => {
    const appIdFromUrl =
      getApplicationIdFromSearchParams(searchParams) ?? getApplicationIdFromPathname(pathname);
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, pathname, draftSnap.currentApplicationId]);

  // Fetch CRM dependents when userId/zohoContactId are available
  const fetchCrmDependents = useCallback(async () => {
    const userId = authSnap.user?.id;
    const zohoContactId = authSnap.userProfile?.zohoContactId;
    if (!userId) return;
    setCrmLoading(true);
    setCrmError(null);
    try {
      const params = new URLSearchParams({ userId });
      if (zohoContactId) params.set("zohoContactId", zohoContactId);
      const res = await fetch(`/api/intake/dependents?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCrmDependents(data.dependents || []);
      } else if (data.reason !== "no_zoho_contact") {
        setCrmError(data.error || "Failed to load");
      }
    } catch {
      setCrmError("Network error");
    } finally {
      setCrmLoading(false);
    }
  }, [authSnap.user?.id, authSnap.userProfile?.zohoContactId]);

  useEffect(() => {
    fetchCrmDependents();
  }, [fetchCrmDependents]);

  const profiles = draftSnap.draft?.profiles || [];
  const hasMainApplicant = profiles.some(p => p.relationship === "main_applicant");
  // Sort: main applicant first, then spouse, then children, then others
  const sortedProfiles = [...profiles].sort((a, b) => {
    const order = { main_applicant: 0, spouse: 1, child: 2, other: 3 };
    return (order[a.relationship] ?? 4) - (order[b.relationship] ?? 4);
  });

  const handleAddProfile = async (data) => {
    setIsProfileSaving(true);
    try {
      if (editingProfile) {
        await draftStore.updateProfile(editingProfile.id, data);
        toast({ title: "Person updated", description: `${data.given_names} ${data.family_name} has been updated.` });
      } else {
        const newProfile = await draftStore.addProfile(data);
        // Auto-set as active if first profile
        if (profiles.length === 0) {
          draftStore.setActiveProfile(newProfile.id);
        }
        toast({ title: "Person added", description: `${data.given_names} ${data.family_name} has been added to the application.` });
      }
      setDialogOpen(false);
      setEditingProfile(null);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setDialogOpen(true);
  };

  const handleDelete = async (profile) => {
    if (profile.relationship === "main_applicant" && profiles.length > 1) {
      toast({
        title: "Cannot remove Main Applicant",
        description: "Please remove all other applicants first.",
        variant: "destructive",
      });
      return;
    }
    await draftStore.deleteProfile(profile.id);
    toast({ title: "Person removed", description: `${profile.given_names} ${profile.family_name} has been removed.` });
  };

  // CRM dependents not yet added to the profiles list (migrating only),
  // de-duplicated by identity so duplicate CRM rows don't appear twice.
  const availableCrmDependents = (() => {
    const candidates = crmDependents.filter(
      (dep) =>
        !dep.isNonMigrating &&
        !profiles.some(
          (p) =>
            (p.zohoDependentId && p.zohoDependentId === dep.zohoDependentId) ||
            (p.given_names?.toLowerCase() === dep.given_names?.toLowerCase() &&
              p.family_name?.toLowerCase() === dep.family_name?.toLowerCase())
        )
    );

    const normalize = (value) => String(value || "").trim().toLowerCase();
    const seen = new Set();

    return candidates.filter((dep) => {
      const identityKey = [
        normalize(dep.given_names),
        normalize(dep.family_name),
        normalize(dep.birth_year),
        normalize(dep.birth_month),
        normalize(dep.birth_day),
        normalize(dep.relationship),
      ].join("|");

      const key = identityKey === "|||||" ? `id:${dep.zohoDependentId}` : identityKey;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const handleContinue = async () => {
    if (profiles.length === 0) return;
    setIsNavigating(true);

    console.log("[DEBUG] Continue clicked - starting navigation process");
    const startTime = performance.now();

    console.log("[DEBUG] Step 1: Marking profile page as complete");
    const step1Start = performance.now();
    await draftStore.markPageComplete(`${visaType}/profile`, null, false);
    console.log(`[DEBUG] Step 1 complete: Marked page complete in ${(performance.now() - step1Start).toFixed(2)}ms`);

    console.log("[DEBUG] Step 2: Setting active profile");
    const step2Start = performance.now();
    const mainApplicant = profiles.find(p => p.relationship === "main_applicant") || profiles[0];
    draftStore.setActiveProfile(mainApplicant.id);
    console.log(`[DEBUG] Step 2 complete: Set active profile in ${(performance.now() - step2Start).toFixed(2)}ms`);
    console.log(`[DEBUG] Active profile ID: ${mainApplicant.id}`);

    console.log("[DEBUG] Step 3: Building next route URL");
    const step3Start = performance.now();
    const appId = draftSnap.currentApplicationId;
    const next = buildIntakeHref({
      appId,
      internalHref: "/intake/temporary-work/main-applicant/details",
      profileId: mainApplicant.id,
      visaType,
      visaContext: draftSnap.visaContext,
    });
    console.log(`[DEBUG] Step 3 complete: Built URL in ${(performance.now() - step3Start).toFixed(2)}ms`);
    console.log(`[DEBUG] Next route: ${next}`);

    console.log("[DEBUG] Step 4: Navigating to next page");
    const step4Start = performance.now();
    startNavigation(next);
    router.push(next);
    console.log(`[DEBUG] Step 4 complete: Navigation initiated in ${(performance.now() - step4Start).toFixed(2)}ms`);

    console.log(`[DEBUG] Total time from click to navigation: ${(performance.now() - startTime).toFixed(2)}ms`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header card */}
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#285646]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#285646]" />
            </div>
            Application Profile
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Add all persons who will be included in this visa application. Start with the main applicant (nominated worker),
            then add any family members who will be migrating together.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Main Applicant Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Add the nominated worker (main applicant) first.</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mt-4">Family Unit Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Then add a spouse or partner and each dependent child who will be included.</p>
          </div>
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-bold mb-1" style={{ color: '#1E4034' }}>Who should be included?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li style={{ color: '#1E4034' }} className="font-bold"><strong>Main Applicant</strong> — the person applying for {draftSnap.visaContext === '186' ? 'Employer Nomination (subclass 186)' : 'Skills in Demand (subclass 482)'} (nominated worker)</li>
              <li style={{ color: '#1E4034' }} className="font-bold"><strong>Spouse / De Facto</strong> — add if migrating together</li>
              <li style={{ color: '#1E4034' }} className="font-bold"><strong>Dependent Children</strong> — add each child who will be included</li>
            </ul>
          </div>

          {/* Profile list */}
          {sortedProfiles.length > 0 ? (
            <div className="space-y-3">
              <p className="text-base font-semibold text-gray-900">
                {sortedProfiles.length} person{sortedProfiles.length !== 1 ? "s" : ""} added
              </p>
              {sortedProfiles.map((profile) => {
                const Icon = getRelationshipIcon(profile.relationship);
                const colorClass = getRelationshipColor(profile.relationship);
                const dob = [profile.birth_day, profile.birth_month, profile.birth_year]
                  .filter(Boolean).join(" ") || null;

                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:border-[#285646]/30 hover:shadow-sm transition-all"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-gray-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">
                        {profile.given_names} {profile.family_name}
                      </p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
                        {getRelationshipLabel(profile.relationship)}
                      </span>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        {profile.gender && <span>{profile.gender}</span>}
                        {profile.gender && (profile.birth_day || profile.birth_month || profile.birth_year) && (
                          <span className="mx-1">•</span>
                        )}
                        {(profile.birth_day || profile.birth_month || profile.birth_year) && (
                          <span>DOB: {[profile.birth_day, profile.birth_month, profile.birth_year].filter(Boolean).join(" ")}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(profile)}
                        className="h-8 w-8 text-gray-400 hover:text-[#285646] hover:bg-[#285646]/10"
                        data-testid={`button-edit-profile-${profile.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(profile)}
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        data-testid={`button-delete-profile-${profile.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
              <UserCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No persons added yet</p>
              <p className="text-sm text-gray-400 mt-1">Start by adding the main applicant</p>
            </div>
          )}

          {/* Add person button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => { setEditingProfile(null); setDialogOpen(true); }}
            className="w-full border-dashed border-2 border-[#285646]/30 text-[#285646] hover:bg-[#285646]/5 hover:border-[#285646]/60 h-11"
            data-testid="button-add-profile"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Person
          </Button>

          {/* Continue */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleContinue}
              disabled={profiles.length === 0 || isNavigating}
              className="w-full bg-[#285646] hover:bg-[#1f4236] text-white h-12 text-base font-semibold flex items-center justify-between px-5"
              data-testid="button-continue"
            >
              <span>{isNavigating ? "Loading..." : "Continue to Forms"}</span>
              {!isNavigating && <ChevronRight className="w-5 h-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile dialog */}
      <ProfileDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingProfile(null); }}
        onSave={handleAddProfile}
        editingProfile={editingProfile}
        hasMainApplicant={hasMainApplicant}
        availableCrmDependents={availableCrmDependents}
        isSaving={isProfileSaving}
      />

    </div>
  );
}
