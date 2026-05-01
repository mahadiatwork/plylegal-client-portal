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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormNavigation } from "@/components/FormNavigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { COUNTRIES } from "@/reuseable/countries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const formSchema = z.object({
  share_contact_phone_numbers: z.enum(["Yes", "No"]),

  // Conditional fields for phone numbers
  after_hours_country_code: z.string().optional(),
  after_hours_area_code: z.string().optional(),
  after_hours_number: z.string().optional(),

  office_hours_country_code: z.string().optional(),
  office_hours_area_code: z.string().optional(),
  office_hours_number: z.string().optional(),

  mobile_country_code: z.string().optional(),
  mobile_number: z.string().optional(),

  share_email_address: z.enum(["Yes", "No"]),
  shared_email: z.string().optional(),
  share_postal_address: z.enum(["Yes", "No"]),
  // Postal address fields
  postal_address: z.string().optional(),
  postal_address_line2: z.string().optional(),
  postal_suburb: z.string().optional(),
  postal_state: z.string().optional(),
  postal_postcode: z.string().optional(),
  postal_country: z.string().optional(),
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
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      // If we have applicationId in store but not in URL, update URL to include it
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      share_contact_phone_numbers: "No",
      after_hours_country_code: "",
      after_hours_area_code: "",
      after_hours_number: "",
      office_hours_country_code: "",
      office_hours_area_code: "",
      office_hours_number: "",
      mobile_country_code: "",
      mobile_number: "",
      share_email_address: "No",
      shared_email: "",
      share_postal_address: "No",
      postal_address: "",
      postal_address_line2: "",
      postal_suburb: "",
      postal_state: "",
      postal_postcode: "",
      postal_country: "",
    },
  });
  useEffect(() => {
    const savedData = draftSnap.draft?.partner_contact_details || {};
    if (Object.keys(savedData).length > 0 && !form.formState.isDirty) {
      // Only set values if they exist in savedData, otherwise keep defaults (which are "No")
      if (savedData.share_contact_phone_numbers) form.setValue("share_contact_phone_numbers", savedData.share_contact_phone_numbers);

      if (savedData.after_hours_country_code) form.setValue("after_hours_country_code", savedData.after_hours_country_code);
      if (savedData.after_hours_area_code) form.setValue("after_hours_area_code", savedData.after_hours_area_code);
      if (savedData.after_hours_number) form.setValue("after_hours_number", savedData.after_hours_number);

      if (savedData.office_hours_country_code) form.setValue("office_hours_country_code", savedData.office_hours_country_code);
      if (savedData.office_hours_area_code) form.setValue("office_hours_area_code", savedData.office_hours_area_code);
      if (savedData.office_hours_number) form.setValue("office_hours_number", savedData.office_hours_number);

      if (savedData.mobile_country_code) form.setValue("mobile_country_code", savedData.mobile_country_code);
      if (savedData.mobile_number) form.setValue("mobile_number", savedData.mobile_number);

      if (savedData.share_email_address) form.setValue("share_email_address", savedData.share_email_address);
      if (savedData.shared_email) form.setValue("shared_email", savedData.shared_email);
      if (savedData.share_postal_address) form.setValue("share_postal_address", savedData.share_postal_address);
      if (savedData.postal_address) form.setValue("postal_address", savedData.postal_address);
      if (savedData.postal_address_line2) form.setValue("postal_address_line2", savedData.postal_address_line2);
      if (savedData.postal_suburb) form.setValue("postal_suburb", savedData.postal_suburb);
      if (savedData.postal_state) form.setValue("postal_state", savedData.postal_state);
      if (savedData.postal_postcode) form.setValue("postal_postcode", savedData.postal_postcode);
      if (savedData.postal_country) form.setValue("postal_country", savedData.postal_country);
    }
  }, [draftSnap.draft?.partner_contact_details, form]);
  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      // Ensure applicationId is in URL if it exists in store
      if (!searchParams.get('applicationId') && draftSnap.currentApplicationId) {
        const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
        router.replace(newUrl);
      }

      if (!draftSnap.currentApplicationId) {
        toast({
          title: "Error",
          description: "Application ID is required. Please start from the beginning of the questionnaire.",
          variant: "destructive",
        });
        return;
      }
      const result = await draftStore.saveSectionData("partner_contact_details", data);
      if (result.success) {
        await draftStore.markPageComplete(`${visaType}/all-applicants/contact-details`, null, "partner_contact_details");
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        startNavigation(next);
        if (next) router.push(next);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save draft",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving contact details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
      // Ensure applicationId is in URL if it exists in store
      if (!searchParams.get('applicationId') && draftSnap.currentApplicationId) {
        const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
        router.replace(newUrl);
      }

      if (!draftSnap.currentApplicationId) {
        toast({
          title: "Error",
          description: "Application ID is required. Please start from the beginning of the questionnaire.",
          variant: "destructive",
        });
        return;
      }
      const values = form.getValues();
      const result = await draftStore.saveSectionData("partner_contact_details", values);
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
    } catch (error) {
      console.error("Error saving contact details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Contact Details</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide contact information for all applicants.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          <div className="bg-card border border-border rounded-lg p-6 space-y-8">

            <div className="space-y-4">
              <Label className="text-base font-medium">Does everyone included in this application share the same Contact Phone Numbers?</Label>
              <RadioGroup
                value={form.watch("share_contact_phone_numbers")}
                onValueChange={(val) => form.setValue("share_contact_phone_numbers", val)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="phone-yes" />
                  <Label htmlFor="phone-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="phone-no" />
                  <Label htmlFor="phone-no">No</Label>
                </div>
              </RadioGroup>

              {form.watch("share_contact_phone_numbers") === "Yes" && (
                <div className="space-y-6 pt-4 pl-1">
                  {/* After Hours Phone Number */}
                  <div className="space-y-2">
                    <Label className="font-semibold">After Hours Phone Number</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <CountryCodeSelect
                        value={form.watch("after_hours_country_code")}
                        onChange={(val) => form.setValue("after_hours_country_code", val)}
                        placeholder="Country Code"
                      />
                      <Input
                        placeholder="Area Code"
                        {...form.register("after_hours_area_code")}
                      />
                      <Input
                        placeholder="Number"
                        {...form.register("after_hours_number")}
                      />
                    </div>
                  </div>

                  {/* Office Hours Phone Number */}
                  <div className="space-y-2">
                    <Label className="font-semibold">Office Hours Phone Number</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <CountryCodeSelect
                        value={form.watch("office_hours_country_code")}
                        onChange={(val) => form.setValue("office_hours_country_code", val)}
                        placeholder="Country Code"
                      />
                      <Input
                        placeholder="Area Code"
                        {...form.register("office_hours_area_code")}
                      />
                      <Input
                        placeholder="Number"
                        {...form.register("office_hours_number")}
                      />
                    </div>
                  </div>

                  {/* Mobile/Cell Phone Number */}
                  <div className="space-y-2">
                    <Label className="font-semibold">Mobile/Cell Phone Number</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CountryCodeSelect
                        value={form.watch("mobile_country_code")}
                        onChange={(val) => form.setValue("mobile_country_code", val)}
                        placeholder="Country Code"
                      />
                      <Input
                        placeholder="Number"
                        {...form.register("mobile_number")}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-base font-medium">Does everyone included in this application share the same email address?</Label>
              <RadioGroup
                value={form.watch("share_email_address")}
                onValueChange={(val) => form.setValue("share_email_address", val)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="email-yes" />
                  <Label htmlFor="email-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="email-no" />
                  <Label htmlFor="email-no">No</Label>
                </div>
              </RadioGroup>

              {form.watch("share_email_address") === "Yes" && (
                <div className="mt-4">
                  <Label htmlFor="shared_email" className="mb-2 block">
                    Email Address
                  </Label>

                  <Input
                    id="shared_email"
                    type="email"
                    {...form.register("shared_email")}
                    data-testid="input-shared-email"
                  />
                </div>

              )
              }
            </div >

            <div className="space-y-4">
              <Label className="text-base font-medium">Does everyone included in this application share the same postal address?</Label>
              <RadioGroup
                value={form.watch("share_postal_address")}
                onValueChange={(val) => form.setValue("share_postal_address", val)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id="postal-yes" />
                  <Label htmlFor="postal-yes">Yes</Label>

                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id="postal-no" />
                  <Label htmlFor="postal-no">No</Label>
                </div>
              </RadioGroup>

              {form.watch("share_postal_address") === "Yes" && (
                <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    Enter the current Postal Address for the Main Applicant
                  </p>

                  <div>
                    <Label htmlFor="postal_address" className="mb-2 block">
                      Postal Address
                    </Label>
                    <Input
                      id="postal_address"
                      placeholder="Address (including Street Number and Name or Post Office Box)"
                      {...form.register("postal_address")}
                      data-testid="input-postal-address"
                    />
                  </div>

                  <div>
                    <Input
                      placeholder="Address Line 2"
                      {...form.register("postal_address_line2")}
                      data-testid="input-postal-address-line2"
                    />
                  </div>

                  <div>
                    <Input
                      placeholder="Suburb/Town/City"
                      {...form.register("postal_suburb")}
                      data-testid="input-postal-suburb"
                    />
                  </div>

                  <div>
                    <Input
                      placeholder="State"
                      {...form.register("postal_state")}
                      data-testid="input-postal-state"
                    />
                  </div>

                  <div>
                    <Input
                      placeholder="Postcode"
                      {...form.register("postal_postcode")}
                      data-testid="input-postal-postcode"
                    />
                  </div>

                  <div>
                    <Select
                      value={form.watch("postal_country")}
                      onValueChange={(val) => form.setValue("postal_country", val)}
                    >
                      <SelectTrigger data-testid="select-postal-country">
                        <SelectValue placeholder="Choose Country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={isSaving}
            />
          </div >
        </form >

      </CardContent >
    </Card >
  );
}