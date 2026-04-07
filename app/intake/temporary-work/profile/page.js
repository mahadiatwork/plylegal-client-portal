"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useState, useEffect } from "react";
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
  ArrowRight,
  ChevronRight,
} from "lucide-react";

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

function ProfileDialog({ open, onClose, onSave, editingProfile, hasMainApplicant }) {
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

  // Pre-fill when editing
  useEffect(() => {
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
    }
  }, [editingProfile, open, hasMainApplicant]);

  const handleSubmit = (data) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }}>
        <DialogHeader>
          <DialogTitle>{editingProfile ? "Edit Person" : "Add Person"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            className="bg-[#285646] hover:bg-[#1f4236] text-white"
            data-testid="button-save-profile"
          >
            {editingProfile ? "Save Changes" : "Add Person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApplicationProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const profiles = draftSnap.draft?.profiles || [];
  const hasMainApplicant = profiles.some(p => p.relationship === "main_applicant");
  // Sort: main applicant first, then spouse, then children, then others
  const sortedProfiles = [...profiles].sort((a, b) => {
    const order = { main_applicant: 0, spouse: 1, child: 2, other: 3 };
    return (order[a.relationship] ?? 4) - (order[b.relationship] ?? 4);
  });

  const handleAddProfile = async (data) => {
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

  const handleContinue = async () => {
    if (profiles.length === 0) return;
    setIsNavigating(true);

    // Mark profile page as complete
    await draftStore.markPageComplete(`${visaType}/profile`, null, false);

    // Set active profile to main applicant (or first profile)
    const mainApplicant = profiles.find(p => p.relationship === "main_applicant") || profiles[0];
    draftStore.setActiveProfile(mainApplicant.id);

    const appId = draftSnap.currentApplicationId;
    const nextBase = "/intake/temporary-work/main-applicant/details";
    const next = appId
      ? `${nextBase}?applicationId=${appId}&profileId=${mainApplicant.id}`
      : `${nextBase}?profileId=${mainApplicant.id}`;

    router.push(next);
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
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-bold mb-1" style={{ color: '#1E4034' }}>Who should be included?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li style={{ color: '#1E4034' }} className="font-bold"><strong>Main Applicant</strong> — the person applying for the 482 visa (nominated worker)</li>
              <li style={{ color: '#1E4034' }} className="font-bold"><strong>Spouse / De Facto</strong> — add if migrating together</li>
              <li style={{ color: '#1E4034' }} className="font-bold"><strong>Dependent Children</strong> — add each child who will be included</li>
            </ul>
          </div>

          {/* Profile list */}
          {sortedProfiles.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">
                          {profile.given_names} {profile.family_name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
                          {getRelationshipLabel(profile.relationship)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        {profile.gender && <span>{profile.gender}</span>}
                        {dob && <span>DOB: {dob}</span>}
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
          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={handleContinue}
              disabled={profiles.length === 0 || isNavigating}
              className="bg-[#285646] hover:bg-[#1f4236] text-white min-w-[200px] h-11"
              data-testid="button-continue"
            >
              {isNavigating ? "Loading..." : (
                <>
                  Continue to Forms
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
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
      />
    </div>
  );
}
