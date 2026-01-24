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
import { FormNavigation } from "@/components/FormNavigation";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";

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

const RELATIONSHIP_OPTIONS = [
  "Adopted Child",
  "Adopted Parent",
  "Child",
  "Child-in-Law",
  "Cousin",
  "Grand-Child",
  "Grand-Parent",
  "Guardian",
  "Half-Sibling",
  "Niece or Nephew",
  "Parent",
  "Parent-in-Law",
  "Sibling",
  "Sister/Brother-in-Law",
  "Spouse/Partner",
  "Step-Child",
  "Step-Grandchild",
  "Step-Grandparent",
  "Step-Niece or Step-Nephew",
  "Step-Parent",
  "Step-Sibling",
  "Step-Uncle or Step-Aunt",
  "Uncle or Aunt",
  "Ward"
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

// Personal Contact Dialog Schema
const personalContactDialogSchema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names is required"),
  gender: z.enum(["Male", "Female", "Other"], { required_error: "Gender is required" }),
  relationship: z.string().min(1, "Relationship is required"),
  nationality: z.string().min(1, "Nationality is required"),
  birth_day: z.string().min(1, "Day is required"),
  birth_month: z.string().min(1, "Month is required"),
  birth_year: z.string().min(1, "Year is required"),
  country_of_birth: z.string().min(1, "Country of birth is required"),
  suburb_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
  // Phone numbers
  after_hours_phone_country_code: z.string().optional(),
  after_hours_phone_area_code: z.string().optional(),
  after_hours_phone_number: z.string().optional(),
  office_hours_phone_country_code: z.string().optional(),
  office_hours_phone_area_code: z.string().optional(),
  office_hours_phone_number: z.string().optional(),
  mobile_phone_country_code: z.string().optional(),
  mobile_phone_number: z.string().optional(),
  email_address: z.string().email("Invalid email address").optional().or(z.literal("")),
  // Address
  address_line1: z.string().min(1, "Address is required"),
  address_line2: z.string().optional(),
  suburb: z.string().min(1, "Suburb/Town/City is required"),
  state: z.string().optional(),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().min(1, "Country is required"),
});

function PersonalContactDialog({ editingRow, onSave, onCancel }) {
  const row = editingRow;
  const draftSnap = useSnapshot(draftStore);

  // Get main applicant name from draft store
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";

  const dialogForm = useForm({
    resolver: zodResolver(personalContactDialogSchema),
    defaultValues: row || {
      family_name: "",
      given_names: "",
      gender: "",
      relationship: "",
      nationality: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      country_of_birth: "",
      suburb_of_birth: "",
      city_of_birth: "",
      state_of_birth: "",
      after_hours_phone_country_code: "",
      after_hours_phone_area_code: "",
      after_hours_phone_number: "",
      office_hours_phone_country_code: "",
      office_hours_phone_area_code: "",
      office_hours_phone_number: "",
      mobile_phone_country_code: "",
      mobile_phone_number: "",
      email_address: "",
      address_line1: "",
      address_line2: "",
      suburb: "",
      state: "",
      postcode: "",
      country: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSave(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dialogForm.handleSubmit(handleFormSubmit)(e);
      }}
      className="space-y-4 pr-2"
    >
      <p className="text-sm text-gray-600 mb-4">
        Enter as much information about this Contact Person as possible
      </p>

      {/* Personal Details Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">This Person's Personal Details</h3>

        <div>
          <Label htmlFor="family_name" className="mb-2 block">
            This Person's Family Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="family_name"
            {...dialogForm.register("family_name")}
            data-testid="input-family-name"
          />
          {dialogForm.formState.errors.family_name && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.family_name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="given_names" className="mb-2 block">
            This Person's Given Names <span className="text-red-500">*</span>
          </Label>
          <Input
            id="given_names"
            {...dialogForm.register("given_names")}
            data-testid="input-given-names"
          />
          {dialogForm.formState.errors.given_names && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.given_names.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">
            This Person's Gender <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={dialogForm.watch("gender")}
            onValueChange={(value) => dialogForm.setValue("gender", value, { shouldValidate: true })}
            className="flex gap-4"
          >
            {["Male", "Female"].map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`gender-${option.toLowerCase()}`} />
                <Label htmlFor={`gender-${option.toLowerCase()}`} className="cursor-pointer font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {dialogForm.formState.errors.gender && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.gender.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">
            This person is {mainApplicantName}'s: <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("relationship")}
            onValueChange={(value) => dialogForm.setValue("relationship", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-relationship">
              <SelectValue placeholder="Choose Relationship" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {RELATIONSHIP_OPTIONS.map((rel) => (
                <SelectItem key={rel} value={rel}>{rel}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.relationship && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">
            This Person's Nationality <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("nationality")}
            onValueChange={(value) => dialogForm.setValue("nationality", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-nationality">
              <SelectValue placeholder="Choose Nationality" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {COUNTRY_OPTIONS.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.nationality && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.nationality.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">
            This Person's Date of Birth <span className="text-red-500">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("birth_day")}
              onValueChange={(value) => dialogForm.setValue("birth_day", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-birth-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("birth_month")}
              onValueChange={(value) => dialogForm.setValue("birth_month", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-birth-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {months.map((month, idx) => (
                  <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("birth_year")}
              onValueChange={(value) => dialogForm.setValue("birth_year", value, { shouldValidate: true })}
            >
              <SelectTrigger data-testid="select-birth-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.birth_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.birth_day.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">
            This Person's Country of Birth <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("country_of_birth")}
            onValueChange={(value) => dialogForm.setValue("country_of_birth", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-country-of-birth">
              <SelectValue placeholder="Choose Country" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {COUNTRY_OPTIONS.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.country_of_birth && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country_of_birth.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="suburb_of_birth" className="mb-2 block">
            This Person's Suburb of Birth
          </Label>
          <Input
            id="suburb_of_birth"
            {...dialogForm.register("suburb_of_birth")}
            data-testid="input-suburb-of-birth"
          />
        </div>

        <div>
          <Label htmlFor="city_of_birth" className="mb-2 block">
            This Person's City or Town of Birth
          </Label>
          <Input
            id="city_of_birth"
            {...dialogForm.register("city_of_birth")}
            data-testid="input-city-of-birth"
          />
        </div>

        <div>
          <Label htmlFor="state_of_birth" className="mb-2 block">
            This Person's State or Province of Birth
          </Label>
          <Input
            id="state_of_birth"
            {...dialogForm.register("state_of_birth")}
            data-testid="input-state-of-birth"
          />
        </div>
      </div>

      {/* Telephone and Email Contact Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">This Person's Telephone and Email Contact</h3>

        <div>
          <Label className="mb-2 block">This Person's After Hours Phone Number</Label>
          <div className="grid grid-cols-3 gap-2">
            <CountryCodeSelect
              value={dialogForm.watch("after_hours_phone_country_code")}
              onChange={(val) => dialogForm.setValue("after_hours_phone_country_code", val)}
              data-testid="input-after-hours-country-code"
            />
            <Input
              placeholder="Area Code"
              {...dialogForm.register("after_hours_phone_area_code")}
              data-testid="input-after-hours-area-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("after_hours_phone_number")}
              data-testid="input-after-hours-number"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">This Person's Office Hours Phone Number</Label>
          <div className="grid grid-cols-3 gap-2">
            <CountryCodeSelect
              value={dialogForm.watch("office_hours_phone_country_code")}
              onChange={(val) => dialogForm.setValue("office_hours_phone_country_code", val)}
              data-testid="input-office-hours-country-code"
            />
            <Input
              placeholder="Area Code"
              {...dialogForm.register("office_hours_phone_area_code")}
              data-testid="input-office-hours-area-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("office_hours_phone_number")}
              data-testid="input-office-hours-number"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">This Person's Mobile Phone Number</Label>
          <div className="grid grid-cols-2 gap-2">
            <CountryCodeSelect
              value={dialogForm.watch("mobile_phone_country_code")}
              onChange={(val) => dialogForm.setValue("mobile_phone_country_code", val)}
              data-testid="input-mobile-country-code"
            />
            <Input
              placeholder="Number"
              {...dialogForm.register("mobile_phone_number")}
              data-testid="input-mobile-number"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email_address" className="mb-2 block">
            This Person's Email Address
          </Label>
          <Input
            id="email_address"
            type="email"
            {...dialogForm.register("email_address")}
            data-testid="input-email-address"
          />
          {dialogForm.formState.errors.email_address && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.email_address.message}</p>
          )}
        </div>
      </div>

      {/* Residential Address Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-base font-semibold text-gray-900">This Person's Residential Address</h3>
        <p className="text-sm text-gray-600">
          This must be a physical address, not a PO Box Number
        </p>

        <div>
          <Label htmlFor="address_line1" className="mb-2 block">
            Address (including Street Number and Name) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="address_line1"
            {...dialogForm.register("address_line1")}
            data-testid="input-address-line1"
          />
          {dialogForm.formState.errors.address_line1 && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.address_line1.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address_line2" className="mb-2 block">
            Address Line 2
          </Label>
          <Input
            id="address_line2"
            {...dialogForm.register("address_line2")}
            data-testid="input-address-line2"
          />
        </div>

        <div>
          <Label htmlFor="suburb" className="mb-2 block">
            Suburb/Town/City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="suburb"
            {...dialogForm.register("suburb")}
            data-testid="input-suburb"
          />
          {dialogForm.formState.errors.suburb && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.suburb.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state" className="mb-2 block">
            State
          </Label>
          <Input
            id="state"
            {...dialogForm.register("state")}
            data-testid="input-state"
          />
        </div>

        <div>
          <Label htmlFor="postcode" className="mb-2 block">
            Postcode <span className="text-red-500">*</span>
          </Label>
          <Input
            id="postcode"
            {...dialogForm.register("postcode")}
            data-testid="input-postcode"
          />
          {dialogForm.formState.errors.postcode && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.postcode.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-2 block">
            Choose Country <span className="text-red-500">*</span>
          </Label>
          <Select
            value={dialogForm.watch("country")}
            onValueChange={(value) => dialogForm.setValue("country", value, { shouldValidate: true })}
          >
            <SelectTrigger data-testid="select-country">
              <SelectValue placeholder="Choose Country" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
              {COUNTRY_OPTIONS.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dialogForm.formState.errors.country && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-[#285646] hover:bg-[#1e4336] text-white"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </form>
  );
}

// Form schema
const formSchema = z.object({
  has_family_in_australia: z.enum(["yes", "no"]).optional(),
  main_applicant_contacts: z.array(z.object({
    family_name: z.string(),
    given_names: z.string(),
    gender: z.string(),
    relationship: z.string(),
    nationality: z.string(),
    birth_day: z.string(),
    birth_month: z.string(),
    birth_year: z.string(),
    country_of_birth: z.string(),
    suburb_of_birth: z.string().optional(),
    city_of_birth: z.string().optional(),
    state_of_birth: z.string().optional(),
    after_hours_phone_country_code: z.string().optional(),
    after_hours_phone_area_code: z.string().optional(),
    after_hours_phone_number: z.string().optional(),
    office_hours_phone_country_code: z.string().optional(),
    office_hours_phone_area_code: z.string().optional(),
    office_hours_phone_number: z.string().optional(),
    mobile_phone_country_code: z.string().optional(),
    mobile_phone_number: z.string().optional(),
    email_address: z.string().optional(),
    address_line1: z.string(),
    address_line2: z.string().optional(),
    suburb: z.string(),
    state: z.string().optional(),
    postcode: z.string(),
    country: z.string(),
  })).optional(),
});

export default function Page() {
  const router = useRouter();
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
      has_family_in_australia: "no",
      main_applicant_contacts: [],
    },
  });

  const hasFamilyInAustralia = form.watch("has_family_in_australia");
  const mainApplicantContacts = form.watch("main_applicant_contacts") || [];

  // Get main applicant name from draft store
  const mainApplicantDetails = draftSnap.draft?.protection_details || {};
  const mainApplicantName = mainApplicantDetails.family_name && mainApplicantDetails.given_names
    ? `${mainApplicantDetails.given_names} ${mainApplicantDetails.family_name}`
    : "the Main Applicant";

  useEffect(() => {
    const savedData = draftSnap.draft?.protection_contacts || {};
    if (Object.keys(savedData).length > 0) {
      form.reset({
        has_family_in_australia: savedData.has_family_in_australia || "",
        main_applicant_contacts: savedData.main_applicant_contacts || [],
      });
    }
  }, [draftSnap.draft?.protection_contacts]);

  // Clear contacts data when "No" is selected
  useEffect(() => {
    if (hasFamilyInAustralia === "no") {
      form.setValue("main_applicant_contacts", []);
    }
  }, [hasFamilyInAustralia]);

  const updateMainApplicantContacts = (newContacts) => {
    form.setValue("main_applicant_contacts", newContacts);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await draftStore.saveSectionData("protection_contacts", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/contacts`, null, "protection_contacts");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
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
      console.log("Saving protection_contacts data:", formData);
      const result = await draftStore.saveSectionData("protection_contacts", formData);

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

  // Table column definitions
  const contactColumns = [
    {
      key: "name",
      label: "Name",
      format: (row) => {
        if (!row.family_name || !row.given_names) return "-";
        return `${row.given_names} ${row.family_name}`;
      }
    },
    {
      key: "date_of_birth",
      label: "Date of Birth",
      format: (row) => {
        if (!row.birth_day || !row.birth_month || !row.birth_year) return "-";
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${row.birth_day} ${months[parseInt(row.birth_month) - 1]} ${row.birth_year}`;
      }
    },
    { key: "relationship", label: "Relationship" },
  ];

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground mt-2">
              For everyone who is to be included in this application, provide the following details about their Australian contacts:
            </p>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Personal Contacts Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-5">
                  Personal Contacts for {mainApplicantName}
                </h2>

                <div>
                  <Label className="text-base font-medium mb-3 block">
                    Does {mainApplicantName} have any family (parents, siblings, children) in Australia who have not already been listed previously in this questionnaire?
                  </Label>
                  <RadioGroup
                    value={hasFamilyInAustralia}
                    onValueChange={(value) => form.setValue("has_family_in_australia", value)}
                    className="flex gap-4"
                    data-testid="radio-has-family-in-australia"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="yes" id="has-family-yes" />
                      <Label htmlFor="has-family-yes" className="ml-2 cursor-pointer font-normal">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="no" id="has-family-no" />
                      <Label htmlFor="has-family-no" className="ml-2 cursor-pointer font-normal">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <br />
                {/* Contacts Table - Only show when Yes */}
                {hasFamilyInAustralia === "yes" && (
                  <div className="space-y-4">
                    <RepeaterTable
                      data={mainApplicantContacts}
                      columns={contactColumns}
                      onAdd={(newRow) => updateMainApplicantContacts([...mainApplicantContacts, newRow])}
                      onEdit={(index, updatedRow) => {
                        const updated = [...mainApplicantContacts];
                        updated[index] = updatedRow;
                        updateMainApplicantContacts(updated);
                      }}
                      onDelete={(index) => {
                        const updated = mainApplicantContacts.filter((_, i) => i !== index);
                        updateMainApplicantContacts(updated);
                      }}
                      DialogComponent={PersonalContactDialog}
                      addButtonText="Add"
                      emptyMessage="No contacts added"
                      dialogTitle="Personal Contact"
                      testIdPrefix="contact"
                    />
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
            />
          </form>
        </div>
      </div>
    </div>
  );
}

