"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { ChevronDown, ChevronUp } from "lucide-react";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);
  // const [showJsonData, setShowJsonData] = useState(false);
  const isSavingRef = useRef(false);
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
      intending_to_migrate: "No",
      country_of_birth: "",
      city_of_birth: "",
      country_of_residence: "",
    },
  });
  // Populate Form
  useEffect(() => {
    // 1. Safety Check: If saving, do not touch the form
    if (isSavingRef.current) return;
    // 2. Wait for loading
    if (draftSnap.isLoading && !draftSnap.draft?.temporary_work_spouse_details) {
      return;
    }
    const savedData = draftSnap.draft?.temporary_work_spouse_details;
    // 3. Populate: Only if we have actual data
    if (savedData && Object.keys(savedData).length > 0) {
      const monthsList = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const normalizeNumber = (val) => {
        if (!val) return "";
        const num = Number(val);
        return isNaN(num) ? val : String(num);
      };
      const normalizeMonth = (val) => {
        if (!val) return "";
        const monthIndex = monthsList.findIndex(m => m.toLowerCase() === String(val).toLowerCase());
        if (monthIndex !== -1) return monthsList[monthIndex];
        if (!isNaN(Number(val))) {
          const num = Number(val);
          if (num >= 1 && num <= 12) return monthsList[num - 1];
        }
        return String(val);
      };
      const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);
      // 4. Prepare the clean data object
      const formData = {
        family_name: safeStr(savedData.family_name),
        given_names: safeStr(savedData.given_names),
        preferred_names: safeStr(savedData.preferred_names),
        gender: safeStr(savedData.gender),
        birth_day: normalizeNumber(savedData.birth_day),
        birth_month: normalizeMonth(savedData.birth_month),
        birth_year: safeStr(savedData.birth_year),
        intending_to_migrate: safeStr(savedData.intending_to_migrate) || "No",
        country_of_birth: safeStr(savedData.country_of_birth),
        city_of_birth: safeStr(savedData.city_of_birth),
        country_of_residence: safeStr(savedData.country_of_residence),
      };
      // 5. Reset the form
      form.reset(formData);
      // 6. FORCE UPDATE (Safety Net)
      // FIX: Added Countries and Radio button here to force the UI to update
      setTimeout(() => {
        // Dates
        if (savedData.birth_day) form.setValue("birth_day", normalizeNumber(savedData.birth_day));
        if (savedData.birth_month) form.setValue("birth_month", normalizeMonth(savedData.birth_month));
        if (savedData.birth_year) form.setValue("birth_year", safeStr(savedData.birth_year));
        // Selects & Radios (Add these lines!)
        if (savedData.country_of_birth) form.setValue("country_of_birth", safeStr(savedData.country_of_birth));
        if (savedData.country_of_residence) form.setValue("country_of_residence", safeStr(savedData.country_of_residence));
        form.setValue("intending_to_migrate", safeStr(savedData.intending_to_migrate) || "No");
      }, 0);
    }
  }, [
    draftSnap.isLoading,
    JSON.stringify(draftSnap.draft?.temporary_work_spouse_details)
  ]);
  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_spouse_details", data);
    await draftStore.markPageComplete(`${visaType}/spouse-partner/details`, null, "temporary_work_spouse_details");
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };
  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };
  const handleSave = async () => {
    setIsSaving(true);
    isSavingRef.current = true;
    try {
      const values = form.getValues();
      const result = await draftStore.saveSectionData("temporary_work_spouse_details", values);
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
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
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
  // Helper references for cleaner logic
  const savedDetails = draftSnap.draft?.temporary_work_spouse_details;
  const currentFormValues = form.getValues();
  // // Prepare JSON data for display
  // const jsonData = {
  //   fullDraft: draftSnap.draft,
  //   temporaryWorkSpouseDetails: savedDetails,
  //   completionStatus: draftSnap.completionStatus,
  //   currentApplicationId: draftSnap.currentApplicationId,
  //   formValues: currentFormValues,
  //   // USE || HERE so that "" falls back to the saved data
  //   birth_day: currentFormValues.birth_day || savedDetails?.birth_day,
  //   birth_month: currentFormValues.birth_month || savedDetails?.birth_month,
  //   birth_year: currentFormValues.birth_year || savedDetails?.birth_year,
  // };
  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Spouse/Partner Personal Details</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide information about your spouse or partner.
        </p>
      </CardHeader>
      <CardContent>
        {/* JSON Data Viewer Card - Commented out
        <Card className="mb-6 border-blue-200">
          <CardHeader
            className="cursor-pointer hover:bg-blue-50 transition-colors"
            onClick={() => setShowJsonData(!showJsonData)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700">
                Database Data (JSON Viewer)
              </CardTitle>
              {showJsonData ? (
                <ChevronUp className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-600" />
              )}
            </div>
          </CardHeader>
          {showJsonData && (
            <CardContent>
              <pre className="text-xs bg-white p-4 rounded border border-blue-200 overflow-auto max-h-96">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </CardContent>
          )}
        </Card>
        */}
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
            {form.watch("intending_to_migrate") !== "Yes" && (
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
            )}
          </div>
          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            loading={isSaving}
          />
        </form>
      </CardContent>
    </Card>
  );
}