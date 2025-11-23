"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
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

const formSchema = z.object({
  // Refugee status questions
  applied_refugee_status_other_country: z.enum(["yes", "no"]).optional(),
  registered_unhcr: z.enum(["yes", "no"]).optional(),
  lived_refugee_camp: z.enum(["yes", "no"]).optional(),
  applied_enter_other_country: z.enum(["yes", "no"]).optional(),
  refused_entry_deported: z.enum(["yes", "no"]).optional(),
  registered_embassy_consulate: z.enum(["yes", "no"]).optional(),
  
  // Departure and arrival dates
  left_home_country_day: z.string().optional(),
  left_home_country_month: z.string().optional(),
  left_home_country_year: z.string().optional(),
  place_of_departure: z.string().optional(),
  
  // Arrival in Australia
  arrived_australia_day: z.string().optional(),
  arrived_australia_month: z.string().optional(),
  arrived_australia_year: z.string().optional(),
  place_of_arrival: z.string().optional(),
  
  // Driver's licence (conditional)
  has_driver_licence: z.enum(["yes", "no"]).optional(),
  driver_licence_number: z.string().optional(),
  driver_licence_state: z.string().optional(),
  
  // Firearms licence
  has_firearms_licence: z.enum(["yes", "no"]).optional(),
  
  // Overseas contact (conditional)
  contact_family_overseas: z.enum(["yes", "no"]).optional(),
  family_overseas_details: z.string().optional(),
  
  // Languages
  languages_spoken: z.string().optional(),
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

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

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
      left_home_country_day: "",
      left_home_country_month: "",
      left_home_country_year: "",
      place_of_departure: "",
      arrived_australia_day: "",
      arrived_australia_month: "",
      arrived_australia_year: "",
      place_of_arrival: "",
      has_driver_licence: "",
      driver_licence_number: "",
      driver_licence_state: "",
      has_firearms_licence: "",
      contact_family_overseas: "",
      family_overseas_details: "",
      languages_spoken: "",
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_other_information || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
    }
  }, []);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("protection_other_information", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/other-information`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("protection_other_information", values);
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

  const hasDriverLicence = form.watch("has_driver_licence");
  const contactFamilyOverseas = form.watch("contact_family_overseas");

  return (
    <div className="min-h-screen bg-background">
      <StickyNav
        onPrevious={handlePrevious}
        onSave={handleSave}
        onContinue={form.handleSubmit(onSubmit)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Other Information</h1>
          <p className="text-muted-foreground mt-2">
            Please provide the following additional information for all applicants.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
          </div>

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
          </div>

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
              <div className="space-y-2 pl-4 border-l-2 border-border">
                <Label htmlFor="family_overseas_details">
                  If yes, who and how often, and in which country do they reside?
                </Label>
                <Textarea
                  id="family_overseas_details"
                  {...form.register("family_overseas_details")}
                  placeholder="Provide details about family members overseas, frequency of contact, and their country of residence"
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="languages_spoken">
                What languages do you speak, read and write (in order of preference)?
              </Label>
              <Textarea
                id="languages_spoken"
                {...form.register("languages_spoken")}
                placeholder="List languages in order of preference, indicating whether you can speak, read, and/or write each language"
                rows={4}
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


