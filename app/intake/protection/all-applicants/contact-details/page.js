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
import { FormNavigation } from "@/components/FormNavigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNav } from "@/components/StickyNav";
import { Loader2 } from "lucide-react";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
// Country list for dropdowns
const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo",
  "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste",
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];
// Form schema
const formSchema = z.object({
  // Question 1: Shared Contact Phone Numbers
  share_same_contact_phones: z.enum(["yes", "no"]).optional(),
  after_hours_phone_country_code: z.string().optional(),
  after_hours_phone_area_code: z.string().optional(),
  after_hours_phone_number: z.string().optional(),
  office_hours_phone_country_code: z.string().optional(),
  office_hours_phone_area_code: z.string().optional(),
  office_hours_phone_number: z.string().optional(),
  mobile_phone_country_code: z.string().optional(),
  mobile_phone_number: z.string().optional(),

  // Question 2: Shared Email Address
  share_same_email: z.enum(["yes", "no"]).optional(),
  shared_email: z.string().email("Invalid email address").optional().or(z.literal("")),

  // Question 3: Shared Postal Address
  share_same_postal_address: z.enum(["yes", "no"]).optional(),
  postal_address: z.string().optional(),
  postal_country: z.string().optional(),
}).superRefine((data, ctx) => {
  // If shared phones is yes, at least one phone number should be provided
  if (data.share_same_contact_phones === "yes") {
    const hasAfterHours = data.after_hours_phone_country_code || data.after_hours_phone_area_code || data.after_hours_phone_number;
    const hasOfficeHours = data.office_hours_phone_country_code || data.office_hours_phone_area_code || data.office_hours_phone_number;
    const hasMobile = data.mobile_phone_country_code || data.mobile_phone_number;

    if (!hasAfterHours && !hasOfficeHours && !hasMobile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one phone number must be provided when sharing contact phones",
        path: ["after_hours_phone_country_code"],
      });
    }
  }
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
      share_same_contact_phones: "no",
      after_hours_phone_country_code: "",
      after_hours_phone_area_code: "",
      after_hours_phone_number: "",
      office_hours_phone_country_code: "",
      office_hours_phone_area_code: "",
      office_hours_phone_number: "",
      mobile_phone_country_code: "",
      mobile_phone_number: "",
      share_same_email: "no",
      shared_email: "",
      share_same_postal_address: "no",
      postal_address: "",
      postal_country: "",
    },
  });
  const shareSamePhones = form.watch("share_same_contact_phones");
  const shareSameEmail = form.watch("share_same_email");
  const shareSamePostal = form.watch("share_same_postal_address");
  useEffect(() => {
    const savedData = draftSnap.draft?.protection_contact_details || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        share_same_contact_phones: savedData.share_same_contact_phones || "no",
        after_hours_phone_country_code: savedData.after_hours_phone_country_code || "",
        after_hours_phone_area_code: savedData.after_hours_phone_area_code || "",
        after_hours_phone_number: savedData.after_hours_phone_number || "",
        office_hours_phone_country_code: savedData.office_hours_phone_country_code || "",
        office_hours_phone_area_code: savedData.office_hours_phone_area_code || "",
        office_hours_phone_number: savedData.office_hours_phone_number || "",
        mobile_phone_country_code: savedData.mobile_phone_country_code || "",
        mobile_phone_number: savedData.mobile_phone_number || "",
        share_same_email: savedData.share_same_email || "no",
        shared_email: savedData.shared_email || "",
        share_same_postal_address: savedData.share_same_postal_address || "no",
        postal_address: savedData.postal_address || "",
        postal_country: savedData.postal_country || "",
      });
    }
  }, [draftSnap.draft?.protection_contact_details]);
  // Clear phone fields when "No" is selected
  useEffect(() => {
    if (shareSamePhones === "no") {
      form.setValue("after_hours_phone_country_code", "");
      form.setValue("after_hours_phone_area_code", "");
      form.setValue("after_hours_phone_number", "");
      form.setValue("office_hours_phone_country_code", "");
      form.setValue("office_hours_phone_area_code", "");
      form.setValue("office_hours_phone_number", "");
      form.setValue("mobile_phone_country_code", "");
      form.setValue("mobile_phone_number", "");
    }
  }, [shareSamePhones]);
  // Clear email field when "No" is selected
  useEffect(() => {
    if (shareSameEmail === "no") {
      form.setValue("shared_email", "");
    }
  }, [shareSameEmail]);
  // Clear postal address fields when "No" is selected
  useEffect(() => {
    if (shareSamePostal === "no") {
      form.setValue("postal_address", "");
      form.setValue("postal_country", "");
    }
  }, [shareSamePostal]);
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_contact_details", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/contact-details`, undefined, "protection_contact_details");
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
      const formData = form.getValues();
      console.log("Saving protection_contact_details data:", formData);
      const result = await draftStore.saveSectionData("protection_contact_details", formData);

      if (result.success) {
        toast({
          title: "Draft saved",
          description: "Your changes have been saved successfully",
        });
      } else {
        console.error("Save failed:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to save changes",
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
  return (
    <div className="min-h-screen bg-[#E4E9FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <CardTitle className="text-2xl font-semibold">Contact Details</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              For everyone who is to be included in this application, provide the following details about their contact details:
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Question 1: Shared Contact Phone Numbers */}
              <div className="space-y-4">
                <Label className="text-base font-medium mb-3 block">
                  Does everyone included in this application share the same Contact Phone Numbers?
                </Label>
                <RadioGroup
                  value={shareSamePhones}
                  onValueChange={(value) => {
                    form.setValue("share_same_contact_phones", value);
                    if (value === "no") {
                      form.setValue("after_hours_phone_country_code", "");
                      form.setValue("after_hours_phone_area_code", "");
                      form.setValue("after_hours_phone_number", "");
                      form.setValue("office_hours_phone_country_code", "");
                      form.setValue("office_hours_phone_area_code", "");
                      form.setValue("office_hours_phone_number", "");
                      form.setValue("mobile_phone_country_code", "");
                      form.setValue("mobile_phone_number", "");
                    }
                  }}
                  className="flex gap-4"
                  data-testid="radio-share-phones"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="share-phones-yes" />
                    <Label htmlFor="share-phones-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="share-phones-no" />
                    <Label htmlFor="share-phones-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {/* Shared Phone Fields - Show when Yes */}
                {shareSamePhones === "yes" && (
                  <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-md">
                    <div>
                      <Label className="mb-2 block">After Hours Phone Number</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <CountryCodeSelect
                          value={form.watch("after_hours_phone_country_code")}
                          onChange={(val) => form.setValue("after_hours_phone_country_code", val)}
                          data-testid="input-after-hours-country"
                        />
                        <Input
                          placeholder="Area Code"
                          {...form.register("after_hours_phone_area_code")}
                          data-testid="input-after-hours-area"
                        />
                        <Input
                          placeholder="Number"
                          {...form.register("after_hours_phone_number")}
                          data-testid="input-after-hours-number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Office Hours Phone Number</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <CountryCodeSelect
                          value={form.watch("office_hours_phone_country_code")}
                          onChange={(val) => form.setValue("office_hours_phone_country_code", val)}
                          data-testid="input-office-hours-country"
                        />
                        <Input
                          placeholder="Area Code"
                          {...form.register("office_hours_phone_area_code")}
                          data-testid="input-office-hours-area"
                        />
                        <Input
                          placeholder="Number"
                          {...form.register("office_hours_phone_number")}
                          data-testid="input-office-hours-number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Mobile/Cell Phone Number</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <CountryCodeSelect
                          value={form.watch("mobile_phone_country_code")}
                          onChange={(val) => form.setValue("mobile_phone_country_code", val)}
                          data-testid="input-mobile-country"
                        />
                        <Input
                          placeholder="Number"
                          {...form.register("mobile_phone_number")}
                          data-testid="input-mobile-number"
                        />
                      </div>
                    </div>
                    {form.formState.errors.after_hours_phone_country_code && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.after_hours_phone_country_code.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Question 2: Shared Email Address */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <Label className="text-base font-medium mb-3 block">
                  Does everyone included in this application share the same email address?
                </Label>
                <RadioGroup
                  value={shareSameEmail}
                  onValueChange={(value) => {
                    form.setValue("share_same_email", value);
                    if (value === "no") {
                      form.setValue("shared_email", "");
                    }
                  }}
                  className="flex gap-4"
                  data-testid="radio-share-email"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="share-email-yes" />
                    <Label htmlFor="share-email-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="share-email-no" />
                    <Label htmlFor="share-email-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {/* Shared Email Field - Show when Yes */}
                {shareSameEmail === "yes" && (
                  <div className="mt-6">
                    <Label htmlFor="shared_email" className="mb-2 block">Email Address</Label>
                    <Input
                      id="shared_email"
                      type="email"
                      {...form.register("shared_email")}
                      data-testid="input-shared-email"
                    />
                    {form.formState.errors.shared_email && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.shared_email.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Question 3: Shared Postal Address */}
              <div className="space-y-4 pt-6 border-t border-gray-200 mb-4">
                <Label className="text-base font-medium mb-3 block">
                  Does everyone included in this application share the same postal address?
                </Label>
                <RadioGroup
                  value={shareSamePostal}
                  onValueChange={(value) => {
                    form.setValue("share_same_postal_address", value);
                    if (value === "no") {
                      form.setValue("postal_address", "");
                      form.setValue("postal_country", "");
                    }
                  }}
                  className="flex gap-4 mb-5"
                  data-testid="radio-share-postal"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="share-postal-yes" />
                    <Label htmlFor="share-postal-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="share-postal-no" />
                    <Label htmlFor="share-postal-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                <br />
                {/* Shared Postal Address Fields - Show when Yes */}
                {shareSamePostal === "yes" && (
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
                      <Label className="mb-2 block">Choose Country</Label>
                      <Select
                        value={form.watch("postal_country")}
                        onValueChange={(value) => form.setValue("postal_country", value)}
                      >
                        <SelectTrigger data-testid="select-postal-country">
                          <SelectValue placeholder="Choose Country" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                          {COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <FormNavigation
              onPrev={handlePrevious}
              disabledNext={!form.formState.isValid}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              loading={isSaving}
              submitting={isSubmitting}
            />
          </form>
        </div>
      </div>
    </div >
  );
}