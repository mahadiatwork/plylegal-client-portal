"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { authStore } from "@/stores";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, getApplicationIdFromPathname, getNextRoute, getPreviousRoute } from "@/lib/routes";
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
  Plus,
  Pencil,
  Trash2,
  UserMinus,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

const NON_MIGRATING_RELATIONSHIPS = [
  { value: "partner", label: "Partner" },
  { value: "child", label: "Child" },
  { value: "other_dependent", label: "Other Dependent" },
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

const MONTH_NUM_TO_NAME_NMF = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
};

function getNmfDisplayName(member) {
  const family = member.passport?.family_name || "";
  const given = member.passport?.given_names || "";
  const name = [given, family].filter(Boolean).join(" ");
  return name || "Unnamed Member";
}

function getNmfRelationshipLabel(rel) {
  return NON_MIGRATING_RELATIONSHIPS.find(r => r.value === rel)?.label || rel || "—";
}

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
          <DialogTitle>{editingMember ? "Edit Other Family Member" : "Add Other Family Member"}</DialogTitle>
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

export default function NonMigratingMembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);
  const { toast } = useToast();
  const { startNavigation } = useNavigationLoading();

  const [nmfDialogOpen, setNmfDialogOpen] = useState(false);
  const [editingNmf, setEditingNmf] = useState(null);
  const [deletingNmfId, setDeletingNmfId] = useState(null);
  const [isNmfSaving, setIsNmfSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const nonMigratingMembers = draftSnap.draft?.non_migrating_members || [];
  const [hasOtherFamily, setHasOtherFamily] = useState(() => {
    const saved = draftSnap.draft?.temporary_work_non_migrating?.has_other_family;
    if (saved === "yes" || saved === "no") return saved;
    return nonMigratingMembers.length > 0 ? "yes" : null;
  });

  // CRM dependents state
  const [crmDependents, setCrmDependents] = useState([]);

  useEffect(() => {
    const appIdFromUrl =
      getApplicationIdFromSearchParams(searchParams) ?? getApplicationIdFromPathname(pathname);
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, pathname, draftSnap.currentApplicationId]);

  // Open dialog from sidebar edit link (?editNonMigratingId=...)
  useEffect(() => {
    const editId = searchParams.get("editNonMigratingId");
    if (editId) {
      const member = draftStore.getNonMigratingMember(editId);
      if (member) {
        setEditingNmf(member);
        setNmfDialogOpen(true);
      }
    }
  }, [searchParams]);

  // Fetch CRM dependents
  const fetchCrmDependents = useCallback(async () => {
    const userId = authSnap.user?.id;
    const zohoContactId = authSnap.userProfile?.zohoContactId;
    if (!userId) return;
    try {
      const params = new URLSearchParams({ userId });
      if (zohoContactId) params.set("zohoContactId", zohoContactId);
      const res = await fetch(`/api/intake/dependents?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCrmDependents(data.dependents || []);
      }
    } catch {
      // ignore
    }
  }, [authSnap.user?.id, authSnap.userProfile?.zohoContactId]);

  useEffect(() => {
    fetchCrmDependents();
  }, [fetchCrmDependents]);

  const availableCrmNonMigrating = crmDependents.filter(
    (dep) =>
      dep.isNonMigrating &&
      !nonMigratingMembers.some(
        (m) =>
          (m.zohoDependentId && m.zohoDependentId === dep.zohoDependentId) ||
          (m.passport?.given_names?.toLowerCase() === dep.given_names?.toLowerCase() &&
            m.passport?.family_name?.toLowerCase() === dep.family_name?.toLowerCase())
      )
  );

  const handleAddNmf = async (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Could not save",
        description: "This page is missing the application reference. Go back via your applications list and open the questionnaire again.",
        variant: "destructive",
      });
      return;
    }

    setIsNmfSaving(true);
    try {
      if (editingNmf) {
        const ok = await draftStore.updateNonMigratingMember(editingNmf.id, data);
        if (!ok) {
          toast({
            title: "Could not save",
            description: "We could not sync this member to your draft. Check that you are signed in and try again.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Member updated", description: "Other family member has been updated." });
      } else {
        const saved = await draftStore.addNonMigratingMember(data);
        if (!saved) {
          toast({
            title: "Could not save",
            description: "We could not sync this member to your draft. Check that you are signed in and try again.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Member added", description: "Other family member has been added." });
      }
      setNmfDialogOpen(false);
      setEditingNmf(null);
    } finally {
      setIsNmfSaving(false);
    }
  };

  const handleEditNmf = (member) => {
    setEditingNmf(member);
    setNmfDialogOpen(true);
  };

  const handleDeleteNmf = async (memberId) => {
    const ok = await draftStore.deleteNonMigratingMember(memberId);
    setDeletingNmfId(null);
    if (!ok) {
      toast({
        title: "Could not remove",
        description: "We could not sync the change to your draft. Check that you are signed in and try again.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Member removed", description: "Other family member has been removed." });
  };

  const handlePrevious = () => {
    setIsNavigating(true);
    const prev = getPreviousRoute(pathname, "temporary-work", draftSnap.currentApplicationId, draftSnap.visaContext);
    if (prev) {
      startNavigation(prev);
      router.push(prev);
    }
  };

  const handleContinue = async () => {
    if (!hasOtherFamily) {
      toast({ variant: "destructive", title: "Please answer the question above before continuing" });
      return;
    }
    if (hasOtherFamily === "yes" && nonMigratingMembers.length === 0) {
      toast({ variant: "destructive", title: "Please add at least one other family member" });
      return;
    }

    setIsNavigating(true);
    try {
      await draftStore.saveSectionData("temporary_work_non_migrating", { has_other_family: hasOtherFamily });
      await draftStore.markPageComplete("temporary-work/non-migrating", null, false);

      const next = getNextRoute(pathname, "temporary-work", draftSnap.currentApplicationId, draftSnap.visaContext);
      if (next) {
        startNavigation(next);
        router.push(next);
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (hasOtherFamily === null) {
      toast({ title: "Nothing to save", description: "Please answer the question first." });
      return;
    }
    setIsNavigating(true);
    try {
      const result = await draftStore.saveSectionData("temporary_work_non_migrating", { has_other_family: hasOtherFamily });
      if (result.success) {
        toast({ title: "Draft saved", description: "Your changes have been saved." });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error || "Failed to save draft" });
      }
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Other Family</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Add any members of your family unit who are not included in this visa application.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-900">
            Do you have members of your family unit not included in the application who are not Australian citizens or Australian permanent residents?
          </Label>
          <RadioGroup
            value={hasOtherFamily || ""}
            onValueChange={(v) => setHasOtherFamily(v)}
            className="flex items-center gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="other-family-yes" />
              <Label htmlFor="other-family-yes" className="text-sm font-normal cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="other-family-no" />
              <Label htmlFor="other-family-no" className="text-sm font-normal cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        {hasOtherFamily === "yes" && (
          <>
            {nonMigratingMembers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">
                  {nonMigratingMembers.length} other family member{nonMigratingMembers.length !== 1 ? "s" : ""} added
                </p>
                {nonMigratingMembers.map((member) => {
                  const displayName = getNmfDisplayName(member);
                  const isConfirmingDelete = deletingNmfId === member.id;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:border-gray-400 hover:shadow-sm transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <UserMinus className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-100 text-gray-700 border-gray-200">
                            Other Family
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-100 text-gray-700 border-gray-200">
                            {getNmfRelationshipLabel(member.relationship)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          {member.place_of_birth?.country && <span>Born in: {member.place_of_birth.country}</span>}
                        </div>
                        {isConfirmingDelete && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-red-600 font-medium">Remove this member?</span>
                            <Button type="button" size="sm" variant="destructive" className="h-6 px-2 text-xs"
                              onClick={() => handleDeleteNmf(member.id)}>Yes, remove</Button>
                            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-xs"
                              onClick={() => setDeletingNmfId(null)}>Cancel</Button>
                          </div>
                        )}
                      </div>
                      {!isConfirmingDelete && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditNmf(member)}
                            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingNmfId(member.id)}
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <UserMinus className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No other family members added</p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => { setEditingNmf(null); setNmfDialogOpen(true); }}
              className="w-full border-dashed border-2 border-gray-300/50 text-gray-700 hover:bg-gray-50/50 hover:border-gray-400 h-11"
              data-testid="button-add-non-migrating"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Other Family Member
            </Button>
          </>
        )}

        {hasOtherFamily === "no" && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
            No other family members to declare.
          </div>
        )}

        <FormNavigation
          onPrev={handlePrevious}
          onNext={handleContinue}
          onSave={handleSaveDraft}
          loading={isNavigating}
          saveLabel="Save draft"
          nextLabel="Continue"
        />
      </CardContent>

      <NonMigratingMemberDialog
        open={nmfDialogOpen}
        onClose={() => { setNmfDialogOpen(false); setEditingNmf(null); }}
        onSave={handleAddNmf}
        editingMember={editingNmf}
        availableCrmNonMigrating={availableCrmNonMigrating}
        isSaving={isNmfSaving}
      />
    </Card>
  );
}
