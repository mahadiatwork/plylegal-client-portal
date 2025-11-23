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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";

// Schema for overseas family contact entries
const familyContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  country: z.string().min(1, "Country is required"),
  frequency: z.string().min(1, "Frequency is required"),
});

// Schema for language entries
const languageSchema = z.object({
  language: z.string().min(1, "Language is required"),
  speak: z.enum(["yes", "no"]).optional(),
  read: z.enum(["yes", "no"]).optional(),
  write: z.enum(["yes", "no"]).optional(),
});

const formSchema = z.object({
  // Refugee status questions
  applied_refugee_status_other_country: z.enum(["yes", "no"]).optional(),
  refugee_status_country: z.string().optional(),
  refugee_status_date: z.string().optional(),
  refugee_status_outcome: z.string().optional(),
  
  registered_unhcr: z.enum(["yes", "no"]).optional(),
  unhcr_registration_number: z.string().optional(),
  unhcr_country: z.string().optional(),
  
  lived_refugee_camp: z.enum(["yes", "no"]).optional(),
  refugee_camp_name: z.string().optional(),
  refugee_camp_country: z.string().optional(),
  refugee_camp_dates: z.string().optional(),
  
  applied_enter_other_country: z.enum(["yes", "no"]).optional(),
  other_country_name: z.string().optional(),
  other_country_date: z.string().optional(),
  other_country_outcome: z.string().optional(),
  
  refused_entry_deported: z.enum(["yes", "no"]).optional(),
  refused_country: z.string().optional(),
  refused_date: z.string().optional(),
  refused_reason: z.string().optional(),
  
  registered_embassy_consulate: z.enum(["yes", "no"]).optional(),
  embassy_name: z.string().optional(),
  embassy_country: z.string().optional(),
  embassy_purpose: z.string().optional(),
  
  // Departure and arrival dates
  left_home_country_day: z.string().optional(),
  left_home_country_month: z.string().optional(),
  left_home_country_year: z.string().optional(),
  place_of_departure: z.string().optional(),
  
  arrived_australia_day: z.string().optional(),
  arrived_australia_month: z.string().optional(),
  arrived_australia_year: z.string().optional(),
  place_of_arrival: z.string().optional(),
  
  // Driver's licence (conditional)
  has_driver_licence: z.enum(["yes", "no"]).optional(),
  driver_licence_number: z.string().optional(),
  driver_licence_state: z.string().optional(),
  driver_licence_expiry_day: z.string().optional(),
  driver_licence_expiry_month: z.string().optional(),
  driver_licence_expiry_year: z.string().optional(),
  
  // Firearms licence
  has_firearms_licence: z.enum(["yes", "no"]).optional(),
  firearms_licence_number: z.string().optional(),
  firearms_licence_state: z.string().optional(),
  firearms_licence_expiry_day: z.string().optional(),
  firearms_licence_expiry_month: z.string().optional(),
  firearms_licence_expiry_year: z.string().optional(),
  
  // Overseas contact (repeatable)
  contact_family_overseas: z.enum(["yes", "no"]).optional(),
  family_contacts: z.array(familyContactSchema).optional(),
  
  // Languages (repeatable)
  languages: z.array(languageSchema).optional(),
});

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

const AUSTRALIAN_STATES = [
  "Australian Capital Territory",
  "New South Wales",
  "Northern Territory",
  "Queensland",
  "South Australia",
  "Tasmania",
  "Victoria",
  "Western Australia",
];

const FREQUENCY_OPTIONS = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
  "Rarely",
  "Never",
];

// Dialog component for overseas family contacts
function FamilyContactDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(familyContactSchema),
    defaultValues: editingRow || {
      name: "",
      relationship: "",
      country: "",
      frequency: "",
    },
  });

  const handleSubmit = (data) => {
    onSave(data);
  };

  return (
    <form onSubmit={dialogForm.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name" className="mb-2 block">Name *</Label>
        <Input
          id="name"
          {...dialogForm.register("name")}
          placeholder="Enter name"
        />
        {dialogForm.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="relationship" className="mb-2 block">Relationship *</Label>
        <Input
          id="relationship"
          {...dialogForm.register("relationship")}
          placeholder="e.g., Mother, Father, Sibling"
        />
        {dialogForm.formState.errors.relationship && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="country" className="mb-2 block">Country *</Label>
        <Input
          id="country"
          {...dialogForm.register("country")}
          placeholder="Enter country"
        />
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="frequency" className="mb-2 block">Frequency of Contact *</Label>
        <Select
          value={dialogForm.watch("frequency")}
          onValueChange={(value) => dialogForm.setValue("frequency", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((freq) => (
              <SelectItem key={freq} value={freq}>{freq}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.frequency && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.frequency.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

// Dialog component for languages
function LanguageDialog({ editingRow, onSave, onCancel }) {
  const dialogForm = useForm({
    resolver: zodResolver(languageSchema),
    defaultValues: editingRow || {
      language: "",
      speak: "no",
      read: "no",
      write: "no",
    },
  });

  const handleSubmit = (data) => {
    onSave(data);
  };

  return (
    <form onSubmit={dialogForm.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="language" className="mb-2 block">Language *</Label>
        <Input
          id="language"
          {...dialogForm.register("language")}
          placeholder="Enter language name"
        />
        {dialogForm.formState.errors.language && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.language.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label className="mb-2 block">Proficiency</Label>
        
        <div className="space-y-2">
          <Label className="text-sm font-normal">Can you speak this language?</Label>
          <RadioGroup
            value={dialogForm.watch("speak")}
            onValueChange={(value) => dialogForm.setValue("speak", value)}
          >
            <div className="flex gap-4">
              {["yes", "no"].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`speak-${option}`} />
                  <Label htmlFor={`speak-${option}`} className="font-normal">
                    {option === "yes" ? "Yes" : "No"}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-normal">Can you read this language?</Label>
          <RadioGroup
            value={dialogForm.watch("read")}
            onValueChange={(value) => dialogForm.setValue("read", value)}
          >
            <div className="flex gap-4">
              {["yes", "no"].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`read-${option}`} />
                  <Label htmlFor={`read-${option}`} className="font-normal">
                    {option === "yes" ? "Yes" : "No"}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-normal">Can you write this language?</Label>
          <RadioGroup
            value={dialogForm.watch("write")}
            onValueChange={(value) => dialogForm.setValue("write", value)}
          >
            <div className="flex gap-4">
              {["yes", "no"].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`write-${option}`} />
                  <Label htmlFor={`write-${option}`} className="font-normal">
                    {option === "yes" ? "Yes" : "No"}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const [familyContacts, setFamilyContacts] = useState([]);
  const [languages, setLanguages] = useState([]);

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
      applied_refugee_status_other_country: "",
      registered_unhcr: "",
      lived_refugee_camp: "",
      applied_enter_other_country: "",
      refused_entry_deported: "",
      registered_embassy_consulate: "",
      has_driver_licence: "",
      has_firearms_licence: "",
      contact_family_overseas: "",
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_other || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          if (key === "family_contacts" && Array.isArray(savedData[key])) {
            setFamilyContacts(savedData[key]);
          } else if (key === "languages" && Array.isArray(savedData[key])) {
            setLanguages(savedData[key]);
          } else {
            form.setValue(key, savedData[key]);
          }
        }
      });
    }
  }, []);

  const onSubmit = async (data) => {
    const submitData = {
      ...data,
      family_contacts: familyContacts,
      languages: languages,
    };
    await draftStore.saveSectionData("protection_other", submitData);
    await draftStore.markPageComplete(`${visaType}/all-applicants/other`);
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
      family_contacts: familyContacts,
      languages: languages,
    };
    const result = await draftStore.saveSectionData("protection_other", submitData);
    if (result.success) {
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  // Watch form values for conditional rendering
  const appliedRefugeeStatus = form.watch("applied_refugee_status_other_country");
  const registeredUNHCR = form.watch("registered_unhcr");
  const livedRefugeeCamp = form.watch("lived_refugee_camp");
  const appliedOtherCountry = form.watch("applied_enter_other_country");
  const refusedEntry = form.watch("refused_entry_deported");
  const registeredEmbassy = form.watch("registered_embassy_consulate");
  const hasDriverLicence = form.watch("has_driver_licence");
  const hasFirearmsLicence = form.watch("has_firearms_licence");
  const contactFamilyOverseas = form.watch("contact_family_overseas");

  // RepeaterTable columns
  const familyContactColumns = [
    { key: "name", label: "Name" },
    { key: "relationship", label: "Relationship" },
    { key: "country", label: "Country" },
    { key: "frequency", label: "Frequency" },
  ];

  const languageColumns = [
    { key: "language", label: "Language" },
    { 
      key: "speak", 
      label: "Speak",
      format: (row) => row.speak === "yes" ? "Yes" : "No"
    },
    { 
      key: "read", 
      label: "Read",
      format: (row) => row.read === "yes" ? "Yes" : "No"
    },
    { 
      key: "write", 
      label: "Write",
      format: (row) => row.write === "yes" ? "Yes" : "No"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <StickyNav
        onPrevious={handlePrevious}
        onSave={handleSave}
        onContinue={form.handleSubmit(onSubmit)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Other</h1>
          <p className="text-muted-foreground mt-2">
            Please provide the following additional information for all applicants.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Refugee Status and International Applications */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Refugee Status and International Applications</h2>
            
            <div className="space-y-2">
              <Label>Have you applied for refugee status in any other country?</Label>
              <RadioGroup
                value={form.watch("applied_refugee_status_other_country")}
                onValueChange={(value) => form.setValue("applied_refugee_status_other_country", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`refugee-status-${option}`} />
                      <Label htmlFor={`refugee-status-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {appliedRefugeeStatus === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="refugee_status_country">Country</Label>
                  <Input
                    id="refugee_status_country"
                    {...form.register("refugee_status_country")}
                    placeholder="Enter country name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refugee_status_date">Date of application</Label>
                  <Input
                    id="refugee_status_date"
                    {...form.register("refugee_status_date")}
                    placeholder="Enter date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refugee_status_outcome">Outcome</Label>
                  <Textarea
                    id="refugee_status_outcome"
                    {...form.register("refugee_status_outcome")}
                    placeholder="Enter outcome"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Have you registered with the UNHCR or any international agency?</Label>
              <RadioGroup
                value={form.watch("registered_unhcr")}
                onValueChange={(value) => form.setValue("registered_unhcr", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`unhcr-${option}`} />
                      <Label htmlFor={`unhcr-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {registeredUNHCR === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="unhcr_registration_number">Registration number</Label>
                  <Input
                    id="unhcr_registration_number"
                    {...form.register("unhcr_registration_number")}
                    placeholder="Enter registration number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unhcr_country">Country of registration</Label>
                  <Input
                    id="unhcr_country"
                    {...form.register("unhcr_country")}
                    placeholder="Enter country"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Have you ever lived in a refugee camp or detention centre outside of Australia?</Label>
              <RadioGroup
                value={form.watch("lived_refugee_camp")}
                onValueChange={(value) => form.setValue("lived_refugee_camp", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`camp-${option}`} />
                      <Label htmlFor={`camp-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {livedRefugeeCamp === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="refugee_camp_name">Name of camp/detention centre</Label>
                  <Input
                    id="refugee_camp_name"
                    {...form.register("refugee_camp_name")}
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refugee_camp_country">Country</Label>
                  <Input
                    id="refugee_camp_country"
                    {...form.register("refugee_camp_country")}
                    placeholder="Enter country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refugee_camp_dates">Dates (from - to)</Label>
                  <Input
                    id="refugee_camp_dates"
                    {...form.register("refugee_camp_dates")}
                    placeholder="Enter dates"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Have you applied to enter any other country besides Australia?</Label>
              <RadioGroup
                value={form.watch("applied_enter_other_country")}
                onValueChange={(value) => form.setValue("applied_enter_other_country", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`applied-other-${option}`} />
                      <Label htmlFor={`applied-other-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {appliedOtherCountry === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="other_country_name">Country</Label>
                  <Input
                    id="other_country_name"
                    {...form.register("other_country_name")}
                    placeholder="Enter country name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_country_date">Date of application</Label>
                  <Input
                    id="other_country_date"
                    {...form.register("other_country_date")}
                    placeholder="Enter date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_country_outcome">Outcome</Label>
                  <Textarea
                    id="other_country_outcome"
                    {...form.register("other_country_outcome")}
                    placeholder="Enter outcome"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Have you ever been refused entry, deported, or asked to leave another country?</Label>
              <RadioGroup
                value={form.watch("refused_entry_deported")}
                onValueChange={(value) => form.setValue("refused_entry_deported", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`refused-${option}`} />
                      <Label htmlFor={`refused-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {refusedEntry === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="refused_country">Country</Label>
                  <Input
                    id="refused_country"
                    {...form.register("refused_country")}
                    placeholder="Enter country name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refused_date">Date</Label>
                  <Input
                    id="refused_date"
                    {...form.register("refused_date")}
                    placeholder="Enter date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refused_reason">Reason</Label>
                  <Textarea
                    id="refused_reason"
                    {...form.register("refused_reason")}
                    placeholder="Enter reason"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Are you registered with or in contact with any embassy or consulate?</Label>
              <RadioGroup
                value={form.watch("registered_embassy_consulate")}
                onValueChange={(value) => form.setValue("registered_embassy_consulate", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`embassy-${option}`} />
                      <Label htmlFor={`embassy-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {registeredEmbassy === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="embassy_name">Embassy/Consulate name</Label>
                  <Input
                    id="embassy_name"
                    {...form.register("embassy_name")}
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="embassy_country">Country</Label>
                  <Input
                    id="embassy_country"
                    {...form.register("embassy_country")}
                    placeholder="Enter country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="embassy_purpose">Purpose of contact</Label>
                  <Textarea
                    id="embassy_purpose"
                    {...form.register("embassy_purpose")}
                    placeholder="Enter purpose"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Departure and Arrival Information */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Departure and Arrival Information</h2>
            
            <div>
              <Label className="mb-2 block">Date you left your home country</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={form.watch("left_home_country_day")}
                  onValueChange={(value) => form.setValue("left_home_country_day", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={form.watch("left_home_country_month")}
                  onValueChange={(value) => form.setValue("left_home_country_month", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={form.watch("left_home_country_year")}
                  onValueChange={(value) => form.setValue("left_home_country_year", value)}
                >
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="place_of_departure">Place of departure (airport or port)</Label>
              <Input
                id="place_of_departure"
                {...form.register("place_of_departure")}
                placeholder="Enter airport or port name"
              />
            </div>

            <div>
              <Label className="mb-2 block">Date you last arrived in Australia</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={form.watch("arrived_australia_day")}
                  onValueChange={(value) => form.setValue("arrived_australia_day", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={form.watch("arrived_australia_month")}
                  onValueChange={(value) => form.setValue("arrived_australia_month", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={form.watch("arrived_australia_year")}
                  onValueChange={(value) => form.setValue("arrived_australia_year", value)}
                >
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="place_of_arrival">Place of last arrival</Label>
              <Input
                id="place_of_arrival"
                {...form.register("place_of_arrival")}
                placeholder="Enter airport or port name"
              />
            </div>
          </div>

          {/* Licences */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Licences</h2>
            
            <div className="space-y-2">
              <Label>Do you have an Australian driver's licence?</Label>
              <RadioGroup
                value={form.watch("has_driver_licence")}
                onValueChange={(value) => form.setValue("has_driver_licence", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`driver-licence-${option}`} />
                      <Label htmlFor={`driver-licence-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {hasDriverLicence === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="driver_licence_number">Provide the licence number</Label>
                  <Input
                    id="driver_licence_number"
                    {...form.register("driver_licence_number")}
                    placeholder="Enter licence number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driver_licence_state">State of issue</Label>
                  <Select
                    value={form.watch("driver_licence_state")}
                    onValueChange={(value) => form.setValue("driver_licence_state", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUSTRALIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Expiry date</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      value={form.watch("driver_licence_expiry_day")}
                      onValueChange={(value) => form.setValue("driver_licence_expiry_day", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={form.watch("driver_licence_expiry_month")}
                      onValueChange={(value) => form.setValue("driver_licence_expiry_month", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, idx) => (
                          <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={form.watch("driver_licence_expiry_year")}
                      onValueChange={(value) => form.setValue("driver_licence_expiry_year", value)}
                    >
                      <SelectTrigger>
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
            )}

            <div className="space-y-2">
              <Label>Do you have an Australian firearms licence?</Label>
              <RadioGroup
                value={form.watch("has_firearms_licence")}
                onValueChange={(value) => form.setValue("has_firearms_licence", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`firearms-${option}`} />
                      <Label htmlFor={`firearms-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {hasFirearmsLicence === "yes" && (
              <div className="space-y-4 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="firearms_licence_number">Provide the licence number</Label>
                  <Input
                    id="firearms_licence_number"
                    {...form.register("firearms_licence_number")}
                    placeholder="Enter licence number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firearms_licence_state">State of issue</Label>
                  <Select
                    value={form.watch("firearms_licence_state")}
                    onValueChange={(value) => form.setValue("firearms_licence_state", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUSTRALIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block">Expiry date</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      value={form.watch("firearms_licence_expiry_day")}
                      onValueChange={(value) => form.setValue("firearms_licence_expiry_day", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={form.watch("firearms_licence_expiry_month")}
                      onValueChange={(value) => form.setValue("firearms_licence_expiry_month", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, idx) => (
                          <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={form.watch("firearms_licence_expiry_year")}
                      onValueChange={(value) => form.setValue("firearms_licence_expiry_year", value)}
                    >
                      <SelectTrigger>
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
            )}
          </div>

          {/* Family and Language Information */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Family and Language Information</h2>
            
            <div className="space-y-2">
              <Label>Do you contact any family overseas?</Label>
              <RadioGroup
                value={form.watch("contact_family_overseas")}
                onValueChange={(value) => form.setValue("contact_family_overseas", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`contact-family-${option}`} />
                      <Label htmlFor={`contact-family-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {contactFamilyOverseas === "yes" && (
              <div className="pl-4 border-l-2 border-border">
                <RepeaterTable
                  data={familyContacts}
                  columns={familyContactColumns}
                  onAdd={(data) => {
                    setFamilyContacts([...familyContacts, data]);
                  }}
                  onEdit={(index, data) => {
                    const updated = [...familyContacts];
                    updated[index] = data;
                    setFamilyContacts(updated);
                  }}
                  onDelete={(index) => {
                    setFamilyContacts(familyContacts.filter((_, i) => i !== index));
                  }}
                  DialogComponent={FamilyContactDialog}
                  addButtonText="Add Family Contact"
                  emptyMessage="No family contacts added"
                  testIdPrefix="family-contact"
                  dialogTitle="Add Family Contact"
                  dialogSubtitle="Enter details about a family member you contact overseas"
                />
              </div>
            )}

            <div>
              <Label className="mb-4 block">What languages do you speak, read and write (in order of preference)?</Label>
              <RepeaterTable
                data={languages}
                columns={languageColumns}
                onAdd={(data) => {
                  setLanguages([...languages, data]);
                }}
                onEdit={(index, data) => {
                  const updated = [...languages];
                  updated[index] = data;
                  setLanguages(updated);
                }}
                onDelete={(index) => {
                  setLanguages(languages.filter((_, i) => i !== index));
                }}
                DialogComponent={LanguageDialog}
                addButtonText="Add Language"
                emptyMessage="No languages added"
                testIdPrefix="language"
                dialogTitle="Add Language"
                dialogSubtitle="Enter language details and proficiency"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center justify-between pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="min-h-9"
            >
              ← Previous
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                className="min-h-9"
              >
                Save
              </Button>
              <Button
                type="submit"
                className="min-h-9 bg-[#285646] hover:bg-[#1e4336] text-white"
              >
                Continue →
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

