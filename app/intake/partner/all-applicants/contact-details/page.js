"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { contactDetailsSchema } from "@/lib/validation";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";

export default function ContactDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const draft = useSnapshot(draftStore.draft);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(contactDetailsSchema),
    defaultValues: {
      shared_phone: draft.shared_phone || undefined,
      phone_numbers: draft.phone_numbers || {
        after_hours: "",
        office_hours: "",
        mobile: "",
      },
      shared_email: draft.shared_email || undefined,
      email: draft.email || "",
      shared_postal: draft.shared_postal || undefined,
      postal_address: draft.postal_address || {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postcode: "",
        country: "",
      },
    },
  });

  const sharedPhone = watch("shared_phone");
  const sharedEmail = watch("shared_email");
  const sharedPostal = watch("shared_postal");
  const watchedValues = watch();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      draftStore.saveDraft(watchedValues);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveDraft(currentData);
    
    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/all-applicants/contact-details');
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully.",
      });
    } else {
      toast({
        title: "Error saving draft",
        description: result.error || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data) => {
    draftStore.saveDraft(data);
    draftStore.markPageComplete('partner/all-applicants/contact-details');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="border border-gray-200 shadow-sm rounded-lg">
          <CardHeader className="px-6 py-8 border-b border-gray-200">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {Object.keys(errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">
                    Please fix the following errors:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Field
                type="radio"
                name="shared_phone"
                control={control}
                label="Do all applicants share the same phone numbers?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && sharedPhone === "Yes" && (
                <div className="space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Phone Numbers</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field
                      type="tel"
                      name="phone_numbers.mobile"
                      control={control}
                      label="Mobile"
                    />
                    <Field
                      type="tel"
                      name="phone_numbers.office_hours"
                      control={control}
                      label="Office Hours"
                    />
                  </div>
                  <Field
                    type="tel"
                    name="phone_numbers.after_hours"
                    control={control}
                    label="After Hours"
                  />
                </div>
              )}

              <Field
                type="radio"
                name="shared_email"
                control={control}
                label="Do all applicants share the same email address?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && sharedEmail === "Yes" && (
                <Field
                  type="email"
                  name="email"
                  control={control}
                  label="Email Address"
                />
              )}

              <Field
                type="radio"
                name="shared_postal"
                control={control}
                label="Do all applicants share the same postal address?"
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
              />

              {mounted && sharedPostal === "Yes" && (
                <div className="space-y-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Postal Address</h3>
                  <Field
                    type="text"
                    name="postal_address.line1"
                    control={control}
                    label="Address Line 1"
                  />
                  <Field
                    type="text"
                    name="postal_address.line2"
                    control={control}
                    label="Address Line 2"
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field
                      type="text"
                      name="postal_address.city"
                      control={control}
                      label="City"
                    />
                    <Field
                      type="text"
                      name="postal_address.state"
                      control={control}
                      label="State/Province"
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field
                      type="text"
                      name="postal_address.postcode"
                      control={control}
                      label="Postcode"
                    />
                    <Field
                      type="text"
                      name="postal_address.country"
                      control={control}
                      label="Country"
                    />
                  </div>
                </div>
              )}

              <div className="hidden lg:flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  data-testid="button-previous"
                >
                  ← Previous
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    data-testid="button-save-draft"
                  >
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid}
                    className="bg-[#285646] text-white px-6 py-2 rounded-lg hover:bg-[#1f4236] disabled:opacity-50 transition-colors"
                    data-testid="button-continue"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
