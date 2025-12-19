"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { FormNavigation } from "@/components/FormNavigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { COUNTRIES } from "@/reuseable/countries";

const familySponsorContactDetailsSchema = z.object({
  after_hours_phone_country_code: z.string().optional(),
  after_hours_phone_area_code: z.string().optional(),
  after_hours_phone_number: z.string().optional(),
  office_hours_phone_country_code: z.string().optional(),
  office_hours_phone_area_code: z.string().optional(),
  office_hours_phone_number: z.string().optional(),
  mobile_phone_country_code: z.string().optional(),
  mobile_phone_number: z.string().optional(),
  email_address: z.string().email("Invalid email address").optional().or(z.literal("")),
  postal_address_line1: z.string().optional(),
  postal_address_line2: z.string().optional(),
  postal_suburb: z.string().optional(),
  postal_state: z.string().optional(),
  postal_postcode: z.string().optional(),
  postal_country: z.string().optional(),
});

export default function FamilySponsorContactDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);

  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Set application ID from URL params if available
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    } else if (!appIdFromUrl && draftSnap.currentApplicationId) {
      const newUrl = `${pathname}?applicationId=${draftSnap.currentApplicationId}`;
      router.replace(newUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId, pathname, router]);

  // Load section data from familySponsor.details
  const sectionData = draftStore.getSectionData('familySponsor.details');

  const form = useForm({
    resolver: zodResolver(familySponsorContactDetailsSchema),
    mode: "onChange",
    defaultValues: {
      after_hours_phone_country_code: sectionData?.after_hours_phone_country_code || "",
      after_hours_phone_area_code: sectionData?.after_hours_phone_area_code || "",
      after_hours_phone_number: sectionData?.after_hours_phone_number || "",
      office_hours_phone_country_code: sectionData?.office_hours_phone_country_code || "",
      office_hours_phone_area_code: sectionData?.office_hours_phone_area_code || "",
      office_hours_phone_number: sectionData?.office_hours_phone_number || "",
      mobile_phone_country_code: sectionData?.mobile_phone_country_code || "",
      mobile_phone_number: sectionData?.mobile_phone_number || "",
      email_address: sectionData?.email_address || "",
      postal_address_line1: sectionData?.postal_address_line1 || "",
      postal_address_line2: sectionData?.postal_address_line2 || "",
      postal_suburb: sectionData?.postal_suburb || "",
      postal_state: sectionData?.postal_state || "",
      postal_postcode: sectionData?.postal_postcode || "",
      postal_country: sectionData?.postal_country || "",
    },
  });
  const { reset, getValues } = form;
  const isDirty = form.formState.isDirty;

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control: form.control });

  // Sync form with store data once it's loaded from the database
  useEffect(() => {
    if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0 && !isDirty) {
      reset({
        after_hours_phone_country_code: sectionData.after_hours_phone_country_code || "",
        after_hours_phone_area_code: sectionData.after_hours_phone_area_code || "",
        after_hours_phone_number: sectionData.after_hours_phone_number || "",
        office_hours_phone_country_code: sectionData.office_hours_phone_country_code || "",
        office_hours_phone_area_code: sectionData.office_hours_phone_area_code || "",
        office_hours_phone_number: sectionData.office_hours_phone_number || "",
        mobile_phone_country_code: sectionData.mobile_phone_country_code || "",
        mobile_phone_number: sectionData.mobile_phone_number || "",
        email_address: sectionData.email_address || "",
        postal_address_line1: sectionData.postal_address_line1 || "",
        postal_address_line2: sectionData.postal_address_line2 || "",
        postal_suburb: sectionData.postal_suburb || "",
        postal_state: sectionData.postal_state || "",
        postal_postcode: sectionData.postal_postcode || "",
        postal_country: sectionData.postal_country || "",
      }, { keepDefaultValues: true });
    }
  }, [draftSnap.isLoading, sectionData, reset, isDirty]);

  // Auto-save form data with debounce
  useEffect(() => {
    if (!draftSnap.currentApplicationId) {
      console.warn('No application ID set for auto-save');
      return;
    }
    if (!watchedValues || Object.keys(watchedValues).length === 0) return;
    if (draftSnap.isLoading) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentFormValues = getValues();
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const mergedData = { ...existingData, ...currentFormValues };
      
      draftStore.saveSectionData('familySponsor.details', mergedData);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues, draftSnap.currentApplicationId, draftSnap.isLoading, getValues]);

  const onSubmit = async (data) => {
    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setIsSaving(true);
    try {
      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const finalData = {
        ...existingData,
        ...data,
      };
      
      const result = await draftStore.saveSectionData('familySponsor.details', finalData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/contact', null, 'familySponsor.details');
        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
        if (next) router.push(next);
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
        setIsSaving(false);
      }
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    // Clear auto-save timeout to prevent race condition
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (!draftSnap.currentApplicationId) {
      toast({
        title: "Error",
        description: "Application ID required. Please return to the applications page and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const isValid = await form.trigger();
      
      if (!isValid) {
        console.log("Validation Errors:", form.formState.errors);
        toast({
          title: "Validation error",
          description: "Please check the console for specific field errors.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const existingData = draftStore.getSectionData('familySponsor.details') || {};
      const currentData = getValues();
      const mergedData = { ...existingData, ...currentData };
      
      const result = await draftStore.saveSectionData('familySponsor.details', mergedData);

      if (result.success) {
        await draftStore.markPageComplete('partner/family-sponsor/contact', null, 'familySponsor.details');
        toast({
          title: "Draft saved",
          description: "Progress saved successfully.",
        });
      } else {
        toast({
          title: "Error saving draft",
          description: result.error || "Failed to save draft. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Contact Details</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Enter the current contact phone numbers, email address and postal address for your Sponsor.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {/* After Hours Phone Number */}
            <div>
              <Label className="mb-2 block">After Hours Phone Number</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Country Code"
                  {...form.register("after_hours_phone_country_code")}
                  data-testid="input-after-hours-country-code"
                />
                <Input
                  placeholder="Area Code"
                  {...form.register("after_hours_phone_area_code")}
                  data-testid="input-after-hours-area-code"
                />
                <Input
                  placeholder="Number"
                  {...form.register("after_hours_phone_number")}
                  data-testid="input-after-hours-number"
                />
              </div>
            </div>

            {/* Office Hours Phone Number */}
            <div>
              <Label className="mb-2 block">Office Hours Phone Number</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Country Code"
                  {...form.register("office_hours_phone_country_code")}
                  data-testid="input-office-hours-country-code"
                />
                <Input
                  placeholder="Area Code"
                  {...form.register("office_hours_phone_area_code")}
                  data-testid="input-office-hours-area-code"
                />
                <Input
                  placeholder="Number"
                  {...form.register("office_hours_phone_number")}
                  data-testid="input-office-hours-number"
                />
              </div>
            </div>

            {/* Mobile/Cell Phone Number */}
            <div>
              <Label className="mb-2 block">Mobile/Cell Phone Number</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Country Code"
                  {...form.register("mobile_phone_country_code")}
                  data-testid="input-mobile-country-code"
                />
                <Input
                  placeholder="Number"
                  {...form.register("mobile_phone_number")}
                  data-testid="input-mobile-number"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <Field
                type="email"
                name="email_address"
                control={form.control}
                label="Email Address"
                data-testid="input-email-address"
              />
            </div>

            {/* Postal Address */}
            <div className="space-y-4">
              <h3 className="text-base font-medium text-gray-900">Postal Address</h3>
              
              <div>
                <Label htmlFor="postal_address_line1" className="mb-2 block">
                  Address (including Street Number and Name or Post Office Box)
                </Label>
                <Input
                  id="postal_address_line1"
                  {...form.register("postal_address_line1")}
                  data-testid="input-postal-address-line1"
                />
              </div>

              <div>
                <Label htmlFor="postal_address_line2" className="mb-2 block">
                  Address Line 2
                </Label>
                <Input
                  id="postal_address_line2"
                  {...form.register("postal_address_line2")}
                  data-testid="input-postal-address-line2"
                />
              </div>

              <div>
                <Label htmlFor="postal_suburb" className="mb-2 block">
                  Suburb/Town/City
                </Label>
                <Input
                  id="postal_suburb"
                  {...form.register("postal_suburb")}
                  data-testid="input-postal-suburb"
                />
              </div>

              <div>
                <Label htmlFor="postal_state" className="mb-2 block">
                  State
                </Label>
                <Input
                  id="postal_state"
                  {...form.register("postal_state")}
                  data-testid="input-postal-state"
                />
              </div>

              <div>
                <Label htmlFor="postal_postcode" className="mb-2 block">
                  Postcode
                </Label>
                <Input
                  id="postal_postcode"
                  {...form.register("postal_postcode")}
                  data-testid="input-postal-postcode"
                />
              </div>

              <div>
                <Label className="mb-2 block">Choose Country</Label>
                <Select
                  value={form.watch("postal_country") || ""}
                  onValueChange={(value) => form.setValue("postal_country", value)}
                >
                  <SelectTrigger data-testid="select-postal-country">
                    <SelectValue placeholder="Choose Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={form.handleSubmit(onSubmit)}
              disabledNext={!form.formState.isValid}
              loading={isSaving}
            />
          </form>
        </CardContent>
      </Card>
    </>
  );
}

