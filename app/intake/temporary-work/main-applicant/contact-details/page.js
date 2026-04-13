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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin",
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay",
  "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const residentialSchema = z.object({
  country: z.string().optional(),
  address_line: z.string().optional(),
  suburb: z.string().optional(),
  state_territory: z.string().optional(),
  postcode: z.string().optional(),
});

const contactFormSchema = z.object({
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  residential_address: residentialSchema.optional(),
});

function migrateResidentialFromLegacy(contactDetails, addressesSection) {
  const existing = contactDetails?.residential_address;
  if (existing?.address_line?.trim() || existing?.country?.trim()) {
    return contactDetails;
  }
  const hist = addressesSection?.address_history;
  const first = Array.isArray(hist) && hist[0] ? hist[0] : null;
  if (!first) return contactDetails;
  const line = [first.address1, first.address2].filter(Boolean).join(", ");
  return {
    ...contactDetails,
    residential_address: {
      country: first.country || "",
      address_line: line || "",
      suburb: first.suburb || "",
      state_territory: first.state || "",
      postcode: first.postcode || "",
    },
  };
}

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);

  const profileId = searchParams.get('profileId');

  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      phone: "",
      mobile: "",
      email: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      residential_address: {
        country: "",
        address_line: "",
        suburb: "",
        state_territory: "",
        postcode: "",
      },
    },
  });

  useEffect(() => {
    const rawContact = profileId
      ? draftSnap.draft?.profiles_data?.[profileId]?.contact_details || {}
      : draftSnap.draft?.temporary_work_contact_details || {};
    
    // Check old style addresses or profile style
    const addressesSection = draftSnap.draft?.temporary_work_addresses || {};
    
    const merged = migrateResidentialFromLegacy(
      Object.keys(rawContact).length ? rawContact : {},
      addressesSection
    );
    if (Object.keys(merged).length > 0) {
      if (merged.phone !== undefined) form.setValue("phone", merged.phone ?? "");
      if (merged.mobile !== undefined) form.setValue("mobile", merged.mobile ?? "");
      if (merged.email !== undefined) form.setValue("email", merged.email ?? "");
      if (merged.emergency_contact_name !== undefined) {
        form.setValue("emergency_contact_name", merged.emergency_contact_name ?? "");
      }
      if (merged.emergency_contact_phone !== undefined) {
        form.setValue("emergency_contact_phone", merged.emergency_contact_phone ?? "");
      }
      const ra = merged.residential_address || {};
      form.setValue("residential_address", {
        country: ra.country ?? "",
        address_line: ra.address_line ?? "",
        suburb: ra.suburb ?? "",
        state_territory: ra.state_territory ?? "",
        postcode: ra.postcode ?? "",
      });
    }
  }, [draftSnap.draft?.temporary_work_contact_details, draftSnap.draft?.profiles_data, draftSnap.draft?.temporary_work_addresses, profileId, form]);

  const buildPayload = () => {
    const v = form.getValues();
    return {
      phone: v.phone,
      mobile: v.mobile,
      email: v.email,
      emergency_contact_name: v.emergency_contact_name,
      emergency_contact_phone: v.emergency_contact_phone,
      residential_address: v.residential_address || {},
    };
  };

  const onSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = buildPayload();
      
      const result = profileId
        ? await draftStore.saveProfileSectionData(profileId, "contact_details", payload)
        : await draftStore.saveSectionData("temporary_work_contact_details", payload);

      if (result.success) {
        if (profileId) {
          await draftStore.markProfilePageComplete(profileId, `${visaType}/main-applicant/contact-details`);
        } else {
          await draftStore.markPageComplete(`${visaType}/main-applicant/contact-details`, null, "temporary_work_contact_details");
        }

        const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
        if (next) router.push(next);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save draft",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const result = profileId
        ? await draftStore.saveProfileSectionData(profileId, "contact_details", payload)
        : await draftStore.saveSectionData("temporary_work_contact_details", payload);

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
    } finally {
      setIsSaving(false);
    }
  };

  const ra = form.watch("residential_address") || {};

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Main Applicant&apos;s Contact Details</CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          Provide contact information and your current residential address for the main applicant.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="Enter phone number"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  {...form.register("mobile")}
                  placeholder="Enter mobile number"
                  data-testid="input-mobile"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="Enter email address"
                data-testid="input-email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="border-t border-border pt-6 mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Name</Label>
                  <Input
                    id="emergency_contact_name"
                    {...form.register("emergency_contact_name")}
                    placeholder="Enter emergency contact name"
                    data-testid="input-emergency-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Phone Number</Label>
                  <Input
                    id="emergency_contact_phone"
                    {...form.register("emergency_contact_phone")}
                    placeholder="Enter emergency contact phone"
                    data-testid="input-emergency-phone"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Residential Address</h2>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={ra.country || ""}
                onValueChange={(value) => form.setValue("residential_address.country", value)}
              >
                <SelectTrigger data-testid="select-residential-country">
                  <SelectValue placeholder="Choose country" />
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
            <div className="space-y-2">
              <Label htmlFor="res_address_line">Address (including street number and name)</Label>
              <Input
                id="res_address_line"
                value={ra.address_line || ""}
                onChange={(e) => form.setValue("residential_address.address_line", e.target.value)}
                data-testid="input-residential-address-line"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res_suburb">Suburb / Town</Label>
              <Input
                id="res_suburb"
                value={ra.suburb || ""}
                onChange={(e) => form.setValue("residential_address.suburb", e.target.value)}
                data-testid="input-residential-suburb"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res_state">State / Territory</Label>
              <Input
                id="res_state"
                value={ra.state_territory || ""}
                onChange={(e) => form.setValue("residential_address.state_territory", e.target.value)}
                data-testid="input-residential-state"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res_postcode">Postcode</Label>
              <Input
                id="res_postcode"
                value={ra.postcode || ""}
                onChange={(e) => form.setValue("residential_address.postcode", e.target.value)}
                data-testid="input-residential-postcode"
              />
            </div>
          </div>

          <FormNavigation
            onPrev={handlePrevious}
            onNext={form.handleSubmit(onSubmit)}
            onSave={handleSave}
            nextLabel="Continue"
            loading={isSaving}
          />
        </form>
      </CardContent>
    </Card>
  );
}
