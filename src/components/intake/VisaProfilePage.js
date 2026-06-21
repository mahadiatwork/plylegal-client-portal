"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { authStore } from "@/stores";
import { applicationsStore } from "@/stores/applicationsStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, getApplicationIdFromPathname, getNextRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getApplicationIdFromSearchParams } from "@/lib/intakeQueryParams";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
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
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

// ─── Constants ──────────────────────────────────────────────────────────────

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
const GENDERS = ["Male", "Female", "Other"];

const profileSchema = z.object({
  given_names: z.string().min(1, "Given name is required"),
  family_name: z.string().min(1, "Family name is required"),
  relationship: z.string().min(1, "Please select a relationship"),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
});

// Map zero-padded month number → full month name expected by the form
const MONTH_NUM_TO_NAME = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
};

const blankProfileDefaults = {
  given_names: "",
  family_name: "",
  relationship: "",
  gender: "",
  birth_day: "",
  birth_month: "",
  birth_year: "",
};

// ─── Helper Functions ───────────────────────────────────────────────────────

const firstText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeBirthDay = (value) => {
  const text = firstText(value);
  if (!text) return "";
  const number = Number(text);
  if (!Number.isFinite(number)) return text;
  return String(number).padStart(2, "0");
};

const normalizeBirthMonth = (value) => {
  const text = firstText(value);
  if (!text) return "";
  const number = Number(text);
  if (Number.isFinite(number)) {
    return MONTH_NUM_TO_NAME[String(number).padStart(2, "0")] || "";
  }
  return MONTHS.find((month) => month.toLowerCase() === text.toLowerCase()) || "";
};

const normalizeGender = (value) => {
  const text = firstText(value);
  return GENDERS.find((gender) => gender.toLowerCase() === text.toLowerCase()) || "";
};

const parseDateOfBirth = (value) => {
  if (!value) return {};

  const rawValue = typeof value?.toDate === "function" ? value.toDate() : value;
  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return {
      birth_day: normalizeBirthDay(rawValue.getDate()),
      birth_month: normalizeBirthMonth(rawValue.getMonth() + 1),
      birth_year: String(rawValue.getFullYear()),
    };
  }

  const text = firstText(rawValue);
  if (!text) return {};

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return {
      birth_day: normalizeBirthDay(isoMatch[3]),
      birth_month: normalizeBirthMonth(isoMatch[2]),
      birth_year: isoMatch[1],
    };
  }

  const dateMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dateMatch) {
    const first = Number(dateMatch[1]);
    const second = Number(dateMatch[2]);
    const day = first > 12 ? dateMatch[1] : second > 12 ? dateMatch[2] : dateMatch[1];
    const month = first > 12 ? dateMatch[2] : second > 12 ? dateMatch[1] : dateMatch[2];
    return {
      birth_day: normalizeBirthDay(day),
      birth_month: normalizeBirthMonth(month),
      birth_year: dateMatch[3],
    };
  }

  return {};
};

function buildMainApplicantPrefill(draft, userProfile, crmContact, sectionKey) {
  const details = draft?.[sectionKey] || {};
  const userDob = parseDateOfBirth(
    firstText(
      crmContact?.dateOfBirth,
      crmContact?.Date_of_Birth,
      userProfile?.dateOfBirth,
      userProfile?.Date_of_Birth,
      userProfile?.dob,
      userProfile?.birthDate
    )
  );

  return {
    given_names: firstText(
      details.given_names,
      crmContact?.firstName,
      crmContact?.First_Name,
      userProfile?.firstName,
      userProfile?.given_names,
      userProfile?.givenName
    ),
    family_name: firstText(
      details.family_name,
      crmContact?.lastName,
      crmContact?.Last_Name,
      userProfile?.lastName,
      userProfile?.family_name,
      userProfile?.familyName
    ),
    relationship: "main_applicant",
    gender: normalizeGender(
      firstText(details.gender, crmContact?.gender, crmContact?.Gender, userProfile?.gender, userProfile?.Gender, userProfile?.sex)
    ),
    birth_day: normalizeBirthDay(firstText(details.birth_day, userProfile?.birth_day, userProfile?.birthDay, userDob.birth_day)),
    birth_month: normalizeBirthMonth(firstText(details.birth_month, userProfile?.birth_month, userProfile?.birthMonth, userDob.birth_month)),
    birth_year: firstText(details.birth_year, userProfile?.birth_year, userProfile?.birthYear, userDob.birth_year),
  };
}

function getProfileDefaults(hasMainApplicant, mainApplicantPrefill) {
  if (!hasMainApplicant) {
    return {
      ...blankProfileDefaults,
      ...mainApplicantPrefill,
      relationship: "main_applicant",
    };
  }
  return blankProfileDefaults;
}

function crmRelToProfileRel(rel) {
  if (rel === "spouse") return "spouse";
  if (rel === "child") return "child";
  return "other";
}

function getRelationshipIcon(rel) {
  switch (rel) {
    case "main_applicant": return UserCheck;
    case "spouse": return Users;
    case "child": return Baby;
    default: return User;
  }
}

function getRelationshipColor(rel) {
  switch (rel) {
    case "main_applicant": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "spouse": return "bg-blue-100 text-blue-800 border-blue-200";
    case "child": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// ─── Profile Dialog ─────────────────────────────────────────────────────────

function ProfileDialog({ open, onClose, onSave, editingProfile, hasMainApplicant, mainApplicantPrefill, availableCrmDependents = [], isSaving = false, relationships }) {
  const [selectedCrmId, setSelectedCrmId] = useState(null);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: getProfileDefaults(hasMainApplicant, mainApplicantPrefill),
  });

  const getRelationshipLabel = (rel) => {
    return relationships.find(r => r.value === rel)?.label || rel;
  };

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
      form.reset(getProfileDefaults(hasMainApplicant, mainApplicantPrefill));
      setSelectedCrmId(null);
    }
  }, [editingProfile, open, hasMainApplicant, mainApplicantPrefill]);

  const handleSelectCrm = (dep) => {
    setSelectedCrmId(dep.zohoDependentId);
    form.reset({
      given_names: dep.given_names || "",
      family_name: dep.family_name || "",
      relationship: crmRelToProfileRel(dep.relationship),
      gender: dep.gender || "",
      birth_day: normalizeBirthDay(dep.birth_day),
      birth_month: normalizeBirthMonth(dep.birth_month),
      birth_year: dep.birth_year || "",
    });
  };

  const handleClearCrm = () => {
    setSelectedCrmId(null);
    form.reset(getProfileDefaults(hasMainApplicant, mainApplicantPrefill));
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
                          ? "border-[#4F726B] bg-[#4F726B]/5 ring-1 ring-[#4F726B]"
                          : "border-gray-200 hover:border-[#4F726B]/50 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? "bg-[#4F726B] text-white" : "bg-gray-100 text-gray-600"
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
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#4F726B] shrink-0" />}
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
                {relationships.map((r) => (
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
            className="bg-[#4F726B] hover:bg-[#4F726B] text-white min-w-[120px]"
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

// ─── Main Shared Component ──────────────────────────────────────────────────

/**
 * Shared "Included Applicants" profile management page used by all visa types.
 *
 * @param {Object} props
 * @param {Array<{value:string, label:string}>} props.relationships - Relationship options for the dialog
 * @param {string} props.detailsSectionKey - Draft section key for main applicant details (for prefill)
 * @param {string} props.continueHref - Internal href to navigate to on "Continue to Forms"
 * @param {Array<string>} props.infoItems - Items to show in the "Who should be added?" box
 * @param {React.ReactNode} [props.extraContent] - Additional content to render (e.g. 186 import section)
 */
export default function VisaProfilePage({
  relationships,
  detailsSectionKey = "temporary_work_details",
  continueHref = "/intake/temporary-work/main-applicant/details",
  infoItems = ["Main applicant", "Spouse or de facto partner", "Dependent children"],
  extraContent = null,
}) {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);
  const appsSnap = useSnapshot(applicationsStore);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);
  // CRM dependents state
  const [crmDependents, setCrmDependents] = useState([]);
  const [crmContact, setCrmContact] = useState(null);
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

  useEffect(() => {
    if (authSnap.user?.id && appsSnap.applications.length === 0) {
      applicationsStore.loadApplications(authSnap.user.id);
    }
  }, [authSnap.user?.id, appsSnap.applications.length]);

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
        setCrmContact(data.contact || null);
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
  const currentApp = appsSnap.applications.find((app) => String(app.id) === String(draftSnap.currentApplicationId));
  const isSubmitted = currentApp?.status === "submitted";

  const mainApplicantPrefill = useMemo(
    () => buildMainApplicantPrefill(draftSnap.draft, authSnap.userProfile, crmContact, detailsSectionKey),
    [draftSnap.draft?.[detailsSectionKey], authSnap.userProfile, crmContact, detailsSectionKey]
  );

  // Sort: main applicant first, then spouse, then children, then others
  const sortedProfiles = [...profiles].sort((a, b) => {
    const order = { main_applicant: 0, spouse: 1, child: 2, other: 3 };
    return (order[a.relationship] ?? 4) - (order[b.relationship] ?? 4);
  });

  const getRelationshipLabel = (rel) => {
    return relationships.find(r => r.value === rel)?.label || rel;
  };

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

  const handleSetPrimary = async (profile) => {
    const currentPrimary = profiles.find((person) => person.relationship === "main_applicant");
    const profileName = `${profile.given_names} ${profile.family_name}`.trim() || "this person";
    const currentPrimaryName = currentPrimary
      ? `${currentPrimary.given_names} ${currentPrimary.family_name}`.trim() || "the current primary applicant"
      : "the current primary applicant";

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Make ${profileName} the primary applicant? ${currentPrimaryName} will become the spouse/partner and both applicants' role-based sections will need review.`
      );
      if (!confirmed) return;
    }

    setSettingPrimaryId(profile.id);
    try {
      const result = await draftStore.setPrimaryApplicant(profile.id);
      if (result.success) {
        toast({
          title: "Primary applicant updated",
          description: `${profileName} is now the primary applicant. Please review the affected sections.`,
        });
      } else {
        toast({
          title: "Could not update primary applicant",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSettingPrimaryId(null);
    }
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
    if (!hasMainApplicant) {
      toast({
        title: "Add the main applicant",
        description: "You need one primary applicant before continuing.",
        variant: "destructive",
      });
      return;
    }
    setIsNavigating(true);

    await draftStore.markPageComplete(`${visaType}/profile`, null, false);

    const mainApplicant = profiles.find(p => p.relationship === "main_applicant") || profiles[0];
    draftStore.setActiveProfile(mainApplicant.id);

    const appId = draftSnap.currentApplicationId;

    // For temporary-work, include profileId in the continue URL
    // For partner/protection, navigate to the next route without profileId
    if (visaType === "temporary-work") {
      const next = buildIntakeHref({
        appId,
        internalHref: continueHref,
        profileId: mainApplicant.id,
        visaType,
        visaContext: draftSnap.visaContext,
      });
      startNavigation(next);
      router.push(next);
    } else {
      const next = getNextRoute(pathname, visaType, appId, draftSnap.visaContext);
      if (next) {
        startNavigation(next);
        router.push(next);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header card */}
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4F726B]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#4F726B]" />
            </div>
            Included Applicants
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Add everyone included in this application. Start with the main applicant, then add any family members included in the application.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Main Applicant</h3>
            <p className="text-sm text-gray-600 mt-1">Add the primary applicant first.</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mt-4">Family Members</h3>
            <p className="text-sm text-gray-600 mt-1">Next add any spouse or partner, followed by each dependent child included in the application.</p>
          </div>
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-bold mb-1" style={{ color: '#4F726B' }}>Who should be added?</p>
            <ul className="space-y-1 list-disc list-inside">
              {infoItems.map((item, index) => (
                <li key={index} style={{ color: '#4F726B' }} className="font-bold">{item}</li>
              ))}
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

                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:border-[#4F726B]/30 hover:shadow-sm transition-all"
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
                      {profile.relationship === "spouse" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(profile)}
                          disabled={settingPrimaryId === profile.id || isSubmitted}
                          className="h-8 px-2 text-xs border-[#4F726B]/30 text-[#4F726B] hover:bg-[#4F726B]/5"
                          data-testid={`button-set-primary-${profile.id}`}
                        >
                          {settingPrimaryId === profile.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
                              Set primary
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(profile)}
                        className="h-8 w-8 text-gray-400 hover:text-[#4F726B] hover:bg-[#4F726B]/10"
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
            className="w-full border-dashed border-2 border-[#4F726B]/30 text-[#4F726B] hover:bg-[#4F726B]/5 hover:border-[#4F726B]/60 h-11"
            data-testid="button-add-profile"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Person
          </Button>

          {/* Extra content slot (e.g. 186 import section) */}
          {extraContent}

          {/* Continue */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!hasMainApplicant || isNavigating}
              className="w-full bg-[#4F726B] hover:bg-[#4F726B] text-white h-12 text-base font-semibold flex items-center justify-between px-5"
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
        mainApplicantPrefill={mainApplicantPrefill}
        availableCrmDependents={availableCrmDependents}
        isSaving={isProfileSaving}
        relationships={relationships}
      />
    </div>
  );
}
