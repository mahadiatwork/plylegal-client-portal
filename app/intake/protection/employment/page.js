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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StickyNav } from "@/components/StickyNav";
import { Loader2 } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
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
const PREFIX_OPTIONS = ["Mr", "Mrs", "Ms", "Dr", "Other"];
const INDUSTRY_SECTOR_OPTIONS = [
  "Agriculture, Forestry and Fishing",
  "Mining",
  "Manufacturing",
  "Electricity, Gas, Water and Waste Services",
  "Construction",
  "Wholesale Trade",
  "Retail Trade",
  "Accommodation and Food Services",
  "Transport, Postal and Warehousing",
  "Information Media and Telecommunications",
  "Financial and Insurance Services",
  "Rental, Hiring and Real Estate Services",
  "Professional, Scientific and Technical Services",
  "Administrative and Support Services",
  "Public Administration and Safety",
  "Education and Training",
  "Health Care and Social Assistance",
  "Arts and Recreation Services",
  "Other Services",
  "Other"
];
const ADDRESS_TYPE_OPTIONS = [
  "Business",
  "Residential",
  "Postal",
  "Other"
];
const AUSTRALIAN_STATES = [
  "Australian Capital Territory",
  "New South Wales",
  "Northern Territory",
  "Queensland",
  "South Australia",
  "Tasmania",
  "Victoria",
  "Western Australia"
];
// Form schema
const formSchema = z.object({
  is_sponsored: z.enum(["yes", "no"]),

  // Business/Organisation Details
  business_name: z.string().optional(),
  trading_name: z.string().optional(),
  abn: z.string().optional(),
  industry_sector: z.string().optional(),
  business_description: z.string().optional(),

  // Contact Person
  contact_prefix: z.string().optional(),
  contact_first_name: z.string().optional(),
  contact_family_name: z.string().optional(),
  contact_position: z.string().optional(),
  contact_phone_country_code: z.string().optional(),
  contact_phone_area_code: z.string().optional(),
  contact_phone_number: z.string().optional(),
  contact_mobile_country_code: z.string().optional(),
  contact_mobile_number: z.string().optional(),
  contact_email: z.string().email("Invalid email address").optional().or(z.literal("")),

  // Business/Organisation Telephone and Email Contact
  after_hours_phone_country_code: z.string().optional(),
  after_hours_phone_area_code: z.string().optional(),
  after_hours_phone_number: z.string().optional(),
  office_hours_phone_country_code: z.string().optional(),
  office_hours_phone_area_code: z.string().optional(),
  office_hours_phone_number: z.string().optional(),
  business_email: z.string().email("Invalid email address").optional().or(z.literal("")),

  // Commercial Address
  commercial_address_line1: z.string().optional(),
  commercial_address_line2: z.string().optional(),
  commercial_suburb: z.string().optional(),
  commercial_state: z.string().optional(),
  commercial_postcode: z.string().optional(),
  commercial_country: z.string().optional(),
  commercial_address_type: z.string().optional(),

  // Postal Address (if different)
  postal_address_line1: z.string().optional(),
  postal_address_line2: z.string().optional(),
  postal_suburb: z.string().optional(),
  postal_state: z.string().optional(),
  postal_postcode: z.string().optional(),
  postal_country: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.is_sponsored === "yes") {
    if (!data.business_name || data.business_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Business Name is required",
        path: ["business_name"],
      });
    }
    if (!data.contact_first_name || data.contact_first_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact Person First Name is required",
        path: ["contact_first_name"],
      });
    }
    if (!data.contact_family_name || data.contact_family_name.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contact Person Family Name is required",
        path: ["contact_family_name"],
      });
    }
  }
});
export default function EmploymentPage() {
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
      is_sponsored: "no",
      business_name: "",
      trading_name: "",
      abn: "",
      industry_sector: "",
      business_description: "",
      contact_prefix: "",
      contact_first_name: "",
      contact_family_name: "",
      contact_position: "",
      contact_phone_country_code: "",
      contact_phone_area_code: "",
      contact_phone_number: "",
      contact_mobile_country_code: "",
      contact_mobile_number: "",
      contact_email: "",
      after_hours_phone_country_code: "",
      after_hours_phone_area_code: "",
      after_hours_phone_number: "",
      office_hours_phone_country_code: "",
      office_hours_phone_area_code: "",
      office_hours_phone_number: "",
      business_email: "",
      commercial_address_line1: "",
      commercial_address_line2: "",
      commercial_suburb: "",
      commercial_state: "",
      commercial_postcode: "",
      commercial_country: "",
      commercial_address_type: "",
      postal_address_line1: "",
      postal_address_line2: "",
      postal_suburb: "",
      postal_state: "",
      postal_postcode: "",
      postal_country: "",
    },
  });
  const isSponsored = form.watch("is_sponsored");
  useEffect(() => {
    const savedData = draftSnap.draft?.protection_employment_offer ? JSON.parse(JSON.stringify(draftSnap.draft.protection_employment_offer)) : {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        is_sponsored: savedData.is_sponsored || "no",
        business_name: savedData.business_name || "",
        trading_name: savedData.trading_name || "",
        abn: savedData.abn || "",
        industry_sector: savedData.industry_sector || "",
        business_description: savedData.business_description || "",
        contact_prefix: savedData.contact_prefix || "",
        contact_first_name: savedData.contact_first_name || "",
        contact_family_name: savedData.contact_family_name || "",
        contact_position: savedData.contact_position || "",
        contact_phone_country_code: savedData.contact_phone_country_code || "",
        contact_phone_area_code: savedData.contact_phone_area_code || "",
        contact_phone_number: savedData.contact_phone_number || "",
        contact_mobile_country_code: savedData.contact_mobile_country_code || "",
        contact_mobile_number: savedData.contact_mobile_number || "",
        contact_email: savedData.contact_email || "",
        after_hours_phone_country_code: savedData.after_hours_phone_country_code || "",
        after_hours_phone_area_code: savedData.after_hours_phone_area_code || "",
        after_hours_phone_number: savedData.after_hours_phone_number || "",
        office_hours_phone_country_code: savedData.office_hours_phone_country_code || "",
        office_hours_phone_area_code: savedData.office_hours_phone_area_code || "",
        office_hours_phone_number: savedData.office_hours_phone_number || "",
        business_email: savedData.business_email || "",
        commercial_address_line1: savedData.commercial_address_line1 || "",
        commercial_address_line2: savedData.commercial_address_line2 || "",
        commercial_suburb: savedData.commercial_suburb || "",
        commercial_state: savedData.commercial_state || "",
        commercial_postcode: savedData.commercial_postcode || "",
        commercial_country: savedData.commercial_country || "",
        commercial_address_type: savedData.commercial_address_type || "",
        postal_address_line1: savedData.postal_address_line1 || "",
        postal_address_line2: savedData.postal_address_line2 || "",
        postal_suburb: savedData.postal_suburb || "",
        postal_state: savedData.postal_state || "",
        postal_postcode: savedData.postal_postcode || "",
        postal_country: savedData.postal_country || "",
      });
    }
  }, [draftSnap.draft?.protection_employment_offer]);
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
      console.log("Saving protection_employment_offer data:", formData);
      const result = await draftStore.saveSectionData("protection_employment_offer", formData);

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
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_employment_offer", data);
      await draftStore.markPageComplete(`${visaType}/employment`);
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
    const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
    if (previousRoute) {
      startNavigation(previousRoute);
      router.push(previousRoute);
    }
  };
  // Clear form fields when "No" is selected
  useEffect(() => {
    if (isSponsored === "no") {
      form.setValue("business_name", "");
      form.setValue("trading_name", "");
      form.setValue("abn", "");
      form.setValue("industry_sector", "");
      form.setValue("business_description", "");
      form.setValue("contact_prefix", "");
      form.setValue("contact_first_name", "");
      form.setValue("contact_family_name", "");
      form.setValue("contact_position", "");
      form.setValue("contact_phone_country_code", "");
      form.setValue("contact_phone_area_code", "");
      form.setValue("contact_phone_number", "");
      form.setValue("contact_mobile_country_code", "");
      form.setValue("contact_mobile_number", "");
      form.setValue("contact_email", "");
      form.setValue("after_hours_phone_country_code", "");
      form.setValue("after_hours_phone_area_code", "");
      form.setValue("after_hours_phone_number", "");
      form.setValue("office_hours_phone_country_code", "");
      form.setValue("office_hours_phone_area_code", "");
      form.setValue("office_hours_phone_number", "");
      form.setValue("business_email", "");
      form.setValue("commercial_address_line1", "");
      form.setValue("commercial_address_line2", "");
      form.setValue("commercial_suburb", "");
      form.setValue("commercial_state", "");
      form.setValue("commercial_postcode", "");
      form.setValue("commercial_country", "");
      form.setValue("commercial_address_type", "");
      form.setValue("postal_address_line1", "");
      form.setValue("postal_address_line2", "");
      form.setValue("postal_suburb", "");
      form.setValue("postal_state", "");
      form.setValue("postal_postcode", "");
      form.setValue("postal_country", "");
    }
  }, [isSponsored]);
  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <CardTitle className="text-2xl font-semibold">Employment</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              For the main applicant, provide the following details about any offer of employment by a business/organisation in Australia.
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Main Question */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Are you being sponsored by or will you be working for an Australian Business or Organisation?
                </Label>
                <RadioGroup
                  value={isSponsored}
                  onValueChange={(value) => {
                    form.setValue("is_sponsored", value);
                    if (value === "no") {
                      form.setValue("business_name", "");
                      form.setValue("trading_name", "");
                      form.setValue("abn", "");
                      form.setValue("industry_sector", "");
                      form.setValue("business_description", "");
                      form.setValue("contact_prefix", "");
                      form.setValue("contact_first_name", "");
                      form.setValue("contact_family_name", "");
                      form.setValue("contact_position", "");
                      form.setValue("contact_phone_country_code", "");
                      form.setValue("contact_phone_area_code", "");
                      form.setValue("contact_phone_number", "");
                      form.setValue("contact_mobile_country_code", "");
                      form.setValue("contact_mobile_number", "");
                      form.setValue("contact_email", "");
                      form.setValue("after_hours_phone_country_code", "");
                      form.setValue("after_hours_phone_area_code", "");
                      form.setValue("after_hours_phone_number", "");
                      form.setValue("office_hours_phone_country_code", "");
                      form.setValue("office_hours_phone_area_code", "");
                      form.setValue("office_hours_phone_number", "");
                      form.setValue("business_email", "");
                      form.setValue("commercial_address_line1", "");
                      form.setValue("commercial_address_line2", "");
                      form.setValue("commercial_suburb", "");
                      form.setValue("commercial_state", "");
                      form.setValue("commercial_postcode", "");
                      form.setValue("commercial_country", "");
                      form.setValue("commercial_address_type", "");
                      form.setValue("postal_address_line1", "");
                      form.setValue("postal_address_line2", "");
                      form.setValue("postal_suburb", "");
                      form.setValue("postal_state", "");
                      form.setValue("postal_postcode", "");
                      form.setValue("postal_country", "");
                    }
                  }}
                  className="flex gap-4 mb-5"
                  data-testid="radio-is-sponsored"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="yes" id="sponsored-yes" />
                    <Label htmlFor="sponsored-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="no" id="sponsored-no" />
                    <Label htmlFor="sponsored-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
                {form.formState.errors.is_sponsored?.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.is_sponsored.message}</p>
                )}
              </div>
              {/* Conditional Sections - Only show if Yes */}
              {isSponsored === "yes" && (
                <>
                  {/* Business/Organisation Details */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Business/Organisation Details</h2>

                    <div>
                      <Label htmlFor="business_name" className="mb-2 block">
                        Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="business_name"
                        {...form.register("business_name")}
                        data-testid="input-business-name"
                      />
                      {form.formState.errors.business_name && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.business_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="trading_name" className="mb-2 block">Trading Name</Label>
                      <Input
                        id="trading_name"
                        {...form.register("trading_name")}
                        data-testid="input-trading-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="abn" className="mb-2 block">Australian Business Number</Label>
                      <Input
                        id="abn"
                        {...form.register("abn")}
                        placeholder="e.g. 12 345 678 901"
                        data-testid="input-abn"
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Industry Sector</Label>
                      <Select
                        value={form.watch("industry_sector")}
                        onValueChange={(value) => form.setValue("industry_sector", value)}
                      >
                        <SelectTrigger data-testid="select-industry-sector">
                          <SelectValue placeholder="Choose Industry Sector" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                          {INDUSTRY_SECTOR_OPTIONS.map((sector) => (
                            <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="business_description" className="mb-2 block">Business/Organisation Description</Label>
                      <Textarea
                        id="business_description"
                        {...form.register("business_description")}
                        rows={4}
                        data-testid="textarea-business-description"
                      />
                    </div>
                  </div>
                  {/* Contact Person */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Contact Person</h2>
                    {/*                     
                    <div>
                      <Label className="mb-2 block">Prefix/Title</Label>
                      <RadioGroup
                        value={form.watch("contact_prefix")}
                        onValueChange={(value) => form.setValue("contact_prefix", value)}
                        className="flex gap-4"
                      >
                        {PREFIX_OPTIONS.map((prefix) => (
                          <div key={prefix} className="flex items-center">
                            <RadioGroupItem value={prefix} id={`prefix-${prefix}`} />
                            <Label htmlFor={`prefix-${prefix}`} className="ml-2 cursor-pointer font-normal">
                              {prefix}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div> */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_first_name" className="mb-2 block">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="contact_first_name"
                          {...form.register("contact_first_name")}
                          data-testid="input-contact-first-name"
                        />
                        {form.formState.errors.contact_first_name && (
                          <p className="text-sm text-red-600 mt-1">{form.formState.errors.contact_first_name.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="contact_family_name" className="mb-2 block">
                          Family Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="contact_family_name"
                          {...form.register("contact_family_name")}
                          data-testid="input-contact-family-name"
                        />
                        {form.formState.errors.contact_family_name && (
                          <p className="text-sm text-red-600 mt-1">{form.formState.errors.contact_family_name.message}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contact_position" className="mb-2 block">Position</Label>
                      <Input
                        id="contact_position"
                        {...form.register("contact_position")}
                        data-testid="input-contact-position"
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Telephone Number</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <CountryCodeSelect
                          value={form.watch("contact_phone_country_code")}
                          onChange={(val) => form.setValue("contact_phone_country_code", val)}
                          data-testid="input-contact-phone-country"
                        />
                        <Input
                          placeholder="Area Code"
                          {...form.register("contact_phone_area_code")}
                          data-testid="input-contact-phone-area"
                        />
                        <Input
                          placeholder="Number"
                          {...form.register("contact_phone_number")}
                          data-testid="input-contact-phone-number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Mobile/Cell Phone Number</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <CountryCodeSelect
                          value={form.watch("contact_mobile_country_code")}
                          onChange={(val) => form.setValue("contact_mobile_country_code", val)}
                          data-testid="input-contact-mobile-country"
                        />
                        <Input
                          placeholder="Number"
                          {...form.register("contact_mobile_number")}
                          data-testid="input-contact-mobile-number"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contact_email" className="mb-2 block">Email Address</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        {...form.register("contact_email")}
                        data-testid="input-contact-email"
                      />
                      {form.formState.errors.contact_email && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.contact_email.message}</p>
                      )}
                    </div>
                  </div>
                  {/* Business/Organisation Telephone and Email Contact */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Business/Organisation Telephone and Email Contact</h2>

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
                      <Label htmlFor="business_email" className="mb-2 block">Email Address</Label>
                      <Input
                        id="business_email"
                        type="email"
                        {...form.register("business_email")}
                        data-testid="input-business-email"
                      />
                      {form.formState.errors.business_email && (
                        <p className="text-sm text-red-600 mt-1">{form.formState.errors.business_email.message}</p>
                      )}
                    </div>
                  </div>
                  {/* Business/Organisation Commercial Address */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Business/Organisation Commercial Address</h2>
                    <p className="text-sm text-gray-600">
                      This must be a physical address, not a PO Box number.
                    </p>

                    <div>
                      <Label htmlFor="commercial_address_line1" className="mb-2 block">
                        Address Line 1 (including Street Number and Name)
                      </Label>
                      <Input
                        id="commercial_address_line1"
                        {...form.register("commercial_address_line1")}
                        data-testid="input-commercial-address-line1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="commercial_address_line2" className="mb-2 block">Address Line 2</Label>
                      <Input
                        id="commercial_address_line2"
                        {...form.register("commercial_address_line2")}
                        data-testid="input-commercial-address-line2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="commercial_suburb" className="mb-2 block">Suburb/Town/City</Label>
                      <Input
                        id="commercial_suburb"
                        {...form.register("commercial_suburb")}
                        data-testid="input-commercial-suburb"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="commercial_state" className="mb-2 block">State</Label>
                        <Input
                          id="commercial_state"
                          {...form.register("commercial_state")}
                          data-testid="input-commercial-state"
                        />
                      </div>
                      <div>
                        <Label htmlFor="commercial_postcode" className="mb-2 block">Postcode</Label>
                        <Input
                          id="commercial_postcode"
                          {...form.register("commercial_postcode")}
                          data-testid="input-commercial-postcode"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block">Country</Label>
                        <Select
                          value={form.watch("commercial_country")}
                          onValueChange={(value) => form.setValue("commercial_country", value)}
                        >
                          <SelectTrigger data-testid="select-commercial-country">
                            <SelectValue placeholder="Choose Country" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                            {COUNTRY_OPTIONS.map((country) => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-2 block">Choose Type of Address</Label>
                        <Select
                          value={form.watch("commercial_address_type")}
                          onValueChange={(value) => form.setValue("commercial_address_type", value)}
                        >
                          <SelectTrigger data-testid="select-commercial-address-type">
                            <SelectValue placeholder="Choose Type of Address" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                            {ADDRESS_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {/* Business/Organisation Postal Address (if different) */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Business/Organisation Postal Address (if different)</h2>

                    <div>
                      <Label htmlFor="postal_address_line1" className="mb-2 block">
                        Address Line 1 (including Street Number and Name)
                      </Label>
                      <Input
                        id="postal_address_line1"
                        {...form.register("postal_address_line1")}
                        data-testid="input-postal-address-line1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_address_line2" className="mb-2 block">Address Line 2</Label>
                      <Input
                        id="postal_address_line2"
                        {...form.register("postal_address_line2")}
                        data-testid="input-postal-address-line2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_suburb" className="mb-2 block">Suburb/Town/City</Label>
                      <Input
                        id="postal_suburb"
                        {...form.register("postal_suburb")}
                        data-testid="input-postal-suburb"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postal_state" className="mb-2 block">State</Label>
                        <Input
                          id="postal_state"
                          {...form.register("postal_state")}
                          data-testid="input-postal-state"
                        />
                      </div>
                      <div>
                        <Label htmlFor="postal_postcode" className="mb-2 block">Postcode</Label>
                        <Input
                          id="postal_postcode"
                          {...form.register("postal_postcode")}
                          data-testid="input-postal-postcode"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Country</Label>
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
                </>
              )}
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
        </div>
      </div>
    </div>
  );
}