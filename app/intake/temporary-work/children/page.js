"use client";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { buildTemporaryWorkChildHref } from "@/lib/routes";
const childSchema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
  gender: z.string().min(1, "Gender is required"),
  birth_day: z.string().min(1, "Day is required"),
  birth_month: z.string().min(1, "Month is required"),
  birth_year: z.string().min(1, "Year is required"),
  relationship: z.string().min(1, "Relationship is required"),
  included_in_application: z.string().min(1, "This field is required"),
  country_of_birth: z.string().min(1, "Country is required"),
  city_of_birth: z.string().optional(),
});
function ChildDialog({ editingRow, onSave, onCancel }) {
  const form = useForm({
    resolver: zodResolver(childSchema),
    defaultValues: {
      family_name: "",
      given_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      relationship: "",
      included_in_application: "",
      country_of_birth: "",
      city_of_birth: "",
    },
  });
  useEffect(() => {
    if (editingRow) {
      form.reset(editingRow);
    } else {
      form.reset({
        family_name: "",
        given_names: "",
        gender: "",
        birth_day: "",
        birth_month: "",
        birth_year: "",
        relationship: "",
        included_in_application: "",
        country_of_birth: "",
        city_of_birth: "",
      });
    }
  }, [editingRow]);
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const countries = [
    "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
    "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia",
    "Denmark", "Egypt", "Finland", "France", "Germany", "Greece", "India",
    "Indonesia", "Iran", "Iraq", "Ireland", "Italy", "Japan", "Kenya", "Malaysia",
    "Mexico", "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan",
    "Philippines", "Poland", "Portugal", "Russia", "Saudi Arabia", "Singapore",
    "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Thailand",
    "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
    "Vietnam"
  ];
  const handleSubmit = (data) => {
    onSave(data);
    form.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label htmlFor="family_name">Family Name *</Label>
        <Input
          id="family_name"
          {...form.register("family_name")}
          placeholder="Enter family name"
          data-testid="input-dialog-family-name"
        />
        {form.formState.errors.family_name && (
          <p className="text-sm text-destructive">{form.formState.errors.family_name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="given_names">Given Names *</Label>
        <Input
          id="given_names"
          {...form.register("given_names")}
          placeholder="Enter given names"
          data-testid="input-dialog-given-names"
        />
        {form.formState.errors.given_names && (
          <p className="text-sm text-destructive">{form.formState.errors.given_names.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Gender *</Label>
        <RadioGroup
          value={form.watch("gender")}
          onValueChange={(value) => form.setValue("gender", value)}
        >
          <div className="flex gap-4">
            {["Male", "Female"].map((gender) => (
              <div key={gender} className="flex items-center space-x-2">
                <RadioGroupItem value={gender} id={`dialog-gender-${gender}`} data-testid={`radio-dialog-gender-${gender.toLowerCase()}`} />
                <Label htmlFor={`dialog-gender-${gender}`}>{gender}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
        {form.formState.errors.gender && (
          <p className="text-sm text-destructive">{form.formState.errors.gender.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Date of Birth *</Label>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth_day">Day</Label>
            <Select value={form.watch("birth_day")} onValueChange={(value) => form.setValue("birth_day", value)}>
              <SelectTrigger id="birth_day" data-testid="select-dialog-birth-day">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_month">Month</Label>
            <Select value={form.watch("birth_month")} onValueChange={(value) => form.setValue("birth_month", value)}>
              <SelectTrigger id="birth_month" data-testid="select-dialog-birth-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth_year">Year</Label>
            <Select value={form.watch("birth_year")} onValueChange={(value) => form.setValue("birth_year", value)}>
              <SelectTrigger id="birth_year" data-testid="select-dialog-birth-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="relationship">This person is your: *</Label>
        <Select value={form.watch("relationship")} onValueChange={(value) => form.setValue("relationship", value)}>
          <SelectTrigger id="relationship" data-testid="select-dialog-relationship">
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Child">Child</SelectItem>
            <SelectItem value="Step Child">Step Child</SelectItem>
            <SelectItem value="Adopted Child">Adopted Child</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.relationship && (
          <p className="text-sm text-destructive">{form.formState.errors.relationship.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Will this child be included in the application? *</Label>
        <RadioGroup
          value={form.watch("included_in_application")}
          onValueChange={(value) => form.setValue("included_in_application", value)}
        >
          <div className="flex gap-4">
            {["Yes", "No"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`dialog-included-${option}`} data-testid={`radio-dialog-included-${option.toLowerCase()}`} />
                <Label htmlFor={`dialog-included-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        </RadioGroup>
        {form.formState.errors.included_in_application && (
          <p className="text-sm text-destructive">{form.formState.errors.included_in_application.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="country_of_birth">Country of Birth *</Label>
        <Select value={form.watch("country_of_birth")} onValueChange={(value) => form.setValue("country_of_birth", value)}>
          <SelectTrigger id="country_of_birth" data-testid="select-dialog-country-birth">
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.country_of_birth && (
          <p className="text-sm text-destructive">{form.formState.errors.country_of_birth.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="city_of_birth">City/Town of Birth</Label>
        <Input
          id="city_of_birth"
          {...form.register("city_of_birth")}
          placeholder="Enter city or town (optional)"
          data-testid="input-dialog-city-birth"
        />
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={form.handleSubmit(handleSubmit)}
          data-testid="button-ok"
        >
          Ok
        </Button>
      </div>
    </div>
  );
}
const formSchema = z.object({
  has_children: z.enum(["yes", "no"]).optional(),
  children: z.array(childSchema).optional(),
});
export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [hasChildren, setHasChildren] = useState("no");
  const [children, setChildren] = useState([]);
  const childProfiles = (draftSnap.draft?.profiles || []).filter((p) => p.relationship === "child");
  const appIdForLinks = draftSnap.currentApplicationId || searchParams.get("applicationId");
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      has_children: "no",
      children: [],
    },
  });
  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_children || {};
    if (Object.keys(savedData).length > 0) {
      if (savedData.has_children) {
        setHasChildren(savedData.has_children);
        form.setValue("has_children", savedData.has_children);
      }
      if (savedData.children) {
        setChildren(savedData.children);
        form.setValue("children", savedData.children);
      }
    }
  }, [draftSnap.draft?.temporary_work_children, form]);
  const onSubmit = async (data) => {
    const submitData = {
      ...data,
      children: children,
    };
    await draftStore.saveSectionData("temporary_work_children", submitData);
    await draftStore.markPageComplete(`${visaType}/children`, null, "temporary_work_children");
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };
  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };
  const handleSave = async () => {
    const values = form.getValues();
    const submitData = {
      ...values,
      children: children,
    };
    const result = await draftStore.saveSectionData("temporary_work_children", submitData);
    if (result.success) {
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };
  const handleAddChild = (data) => {
    const updated = [...children, data];
    setChildren(updated);
    form.setValue("children", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };
  const handleEditChild = (index, data) => {
    const updated = [...children];
    updated[index] = data;
    setChildren(updated);
    form.setValue("children", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };
  const handleDeleteChild = (index) => {
    const updated = children.filter((_, i) => i !== index);
    setChildren(updated);
    form.setValue("children", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
  };
  const columns = [
    { key: "given_names", label: "Name" },
    {
      key: "birth_day",
      label: "Date of Birth",
      render: (row) => `${row.birth_day} ${row.birth_month} ${row.birth_year}`
    },
    { key: "gender", label: "Gender" },
    { key: "included_in_application", label: "Included in Application" },
  ];
  return (
    <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Children</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Provide details about any children to be included in this application.
          </p>
        </CardHeader>
        <CardContent>
        {childProfiles.length > 0 && (
          <div className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="font-medium text-foreground mb-2">Children from Application Profile</p>
            <p className="text-muted-foreground mb-3">
              Dependent children added on Application Profile have their own Details, Identity, and Custody steps. Open a child below or use the sidebar.
            </p>
            <ul className="space-y-2">
              {childProfiles.map((c) => {
                const name = `${c.given_names || ""} ${c.family_name || ""}`.trim() || "Child";
                const q = new URLSearchParams();
                if (appIdForLinks) q.set("applicationId", appIdForLinks);
                q.set("profileId", c.id);
                const href = `${buildTemporaryWorkChildHref(c.id, "details")}?${q.toString()}`;
                return (
                  <li key={c.id}>
                    <Link href={href} className="text-primary font-medium underline-offset-4 hover:underline">
                      {name} — questionnaire
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Do you or your Spouse/Partner have any Children, Step-Children or Adopted Children to be included in this application?</Label>
              <RadioGroup
                value={hasChildren}
                onValueChange={(value) => {
                  setHasChildren(value);
                  form.setValue("has_children", value);
                }}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`has-children-${option}`} data-testid={`radio-has-children-${option}`} />
                      <Label htmlFor={`has-children-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            {hasChildren === "yes" && (
              <div className="mt-6">
                <RepeaterTable
                  data={children}
                  columns={columns}
                  onAdd={handleAddChild}
                  onEdit={handleEditChild}
                  onDelete={handleDeleteChild}
                  DialogComponent={ChildDialog}
                  addButtonText="Add"
                  emptyMessage="No children added"
                  testIdPrefix="child"
                />
              </div>
            )}
            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              loading={draftSnap.isSaving}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}