"use client";
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
// StickyNav import removed
import { Loader2 } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const formSchema = z.object({
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  intending_to_migrate: z.string().optional(),
  country_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  country_of_residence: z.string().optional(),
});
export default function Page() {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      family_name: "",
      given_names: "",
      preferred_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      intending_to_migrate: "",
      country_of_birth: "",
      city_of_birth: "",
      country_of_residence: "",
    },
  });
  useEffect(() => {
    const savedData = draftSnap.draft?.protection_spouse_details || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        family_name: savedData.family_name || "",
        given_names: savedData.given_names || "",
        preferred_names: savedData.preferred_names || "",
        gender: savedData.gender || "",
        birth_day: savedData.birth_day || "",
        birth_month: savedData.birth_month || "",
        birth_year: savedData.birth_year || "",
        intending_to_migrate: savedData.intending_to_migrate || "",
        country_of_birth: savedData.country_of_birth || "",
        city_of_birth: savedData.city_of_birth || "",
        country_of_residence: savedData.country_of_residence || "",
      });
    }
  }, [draftSnap.draft?.protection_spouse_details]);
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_spouse_details", data);
      await draftStore.markPageComplete(`${visaType}/spouse-partner/details`);
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      startNavigation(next);
      if (next) router.push(next);
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    startNavigation(prev);
    if (prev) router.push(prev);
  };
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form before saving",
          variant: "destructive",
        });
        return;
      }
      const values = form.getValues();
      console.log("Saving protection_spouse_details data:", values);
      const result = await draftStore.saveSectionData("protection_spouse_details", values);
      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        console.error("Save failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to save draft",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
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
  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Spouse/Partner Personal Details</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide information about your spouse or partner.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Personal Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="family_name">Family Name *</Label>
                <Input
                  id="family_name"
                  {...form.register("family_name")}
                  placeholder="Enter family name"
                  data-testid="input-family-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="given_names">Given Names *</Label>
                <Input
                  id="given_names"
                  {...form.register("given_names")}
                  placeholder="Enter given names"
                  data-testid="input-given-names"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_names">Preferred Names</Label>
              <Input
                id="preferred_names"
                {...form.register("preferred_names")}
                placeholder="Enter preferred names (optional)"
                data-testid="input-preferred-names"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <RadioGroup
                value={form.watch("gender")}
                onValueChange={(value) => form.setValue("gender", value)}
              >
                <div className="flex flex-wrap gap-4">
                  {["Male", "Female"].map((gender) => (
                    <div key={gender} className="flex items-center space-x-2">
                      <RadioGroupItem value={gender} id={`gender-${gender}`} data-testid={`radio-gender-${gender.toLowerCase()}`} />
                      <Label htmlFor={`gender-${gender}`}>{gender}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_day">Day</Label>
                  <Select value={form.watch("birth_day")} onValueChange={(value) => form.setValue("birth_day", value)}>
                    <SelectTrigger id="birth_day" data-testid="select-birth-day">
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
                    <SelectTrigger id="birth_month" data-testid="select-birth-month">
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
                    <SelectTrigger id="birth_year" data-testid="select-birth-year">
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
          </div>
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Residency & Migration Info</h2>
            <div className="space-y-2">
              <Label>Is your Spouse/Partner intending to migrate/travel to Australia as part of this application? *</Label>
              <RadioGroup
                value={form.watch("intending_to_migrate")}
                onValueChange={(value) => form.setValue("intending_to_migrate", value)}
              >
                <div className="flex gap-4">
                  {["Yes", "No"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`migrate-${option}`} data-testid={`radio-migrate-${option.toLowerCase()}`} />
                      <Label htmlFor={`migrate-${option}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Birth & Residence Details</h2>
            <div className="space-y-2">
              <Label htmlFor="country_of_birth">Country of Birth *</Label>
              <Select value={form.watch("country_of_birth")} onValueChange={(value) => form.setValue("country_of_birth", value)}>
                <SelectTrigger id="country_of_birth" data-testid="select-country-birth">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city_of_birth">City or Town of Birth *</Label>
              <Input
                id="city_of_birth"
                {...form.register("city_of_birth")}
                placeholder="Enter city or town"
                data-testid="input-city-birth"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country_of_residence">Country of Current Residence *</Label>
              <Select value={form.watch("country_of_residence")} onValueChange={(value) => form.setValue("country_of_residence", value)}>
                <SelectTrigger id="country_of_residence" data-testid="select-country-residence">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            loading={isSaving}
            submitting={isSubmitting}
            disabledNext={!form.formState.isValid}
          />
        </form>
      </CardContent>
      {/* Mobile Navigation */}
    </Card>
  );
}