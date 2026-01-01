"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { contactsSchema } from "@/lib/validation";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RepeaterTable } from "@/components/RepeaterTable";
import { COUNTRIES } from "@/reuseable/countries";
import { DateSelector } from "@/components/DateSelecters";

function FamilyContactDialog({ editingRow, onSave, onCancel, mainApplicantName }) {
  const dialogSchema = z.object({
    family_name: z.string().min(1, "Family name is required"),
    given_names: z.string().min(1, "Given names are required"),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    relationship: z.string().min(1, "Relationship is required"),
    nationality: z.string().min(1, "Nationality is required"),

    birth_day: z.string().min(1, "Day is required"),
    birth_month: z.string().min(1, "Month is required"),
    birth_year: z.string().min(1, "Year is required"),

    country_of_birth: z.string().min(1, "Country of birth is required"),
    suburb_of_birth: z.string().optional(),
    city_of_birth: z.string().optional(),
    state_of_birth: z.string().optional(),

    phone_country_code_hours: z.string().optional(),
    phone_area_code_hours: z.string().optional(),
    phone_number_hours: z.string().optional(),

    phone_country_code_office: z.string().optional(),
    phone_area_code_office: z.string().optional(),
    phone_number_office: z.string().optional(),

    phone_country_code_mobile: z.string().optional(),
    phone_number_mobile: z.string().optional(),

    email: z.string().email("Invalid email").optional().or(z.literal("")),

    residential_address: z.string().min(1, "Address is required"),
    residential_address_line2: z.string().optional(),
    residential_suburb: z.string().min(1, "Suburb is required"),
    residential_state: z.string().min(1, "State is required"),
    residential_postcode: z.string().min(1, "Postcode is required"),
    residential_country: z.string().min(1, "Country is required"),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogSchema),
    defaultValues: editingRow || {
      family_name: "",
      given_names: "",
      gender: undefined,
      relationship: "",
      nationality: "",

      birth_day: "",
      birth_month: "",
      birth_year: "",

      country_of_birth: "",
      suburb_of_birth: "",
      city_of_birth: "",
      state_of_birth: "",

      phone_country_code_hours: "",
      phone_area_code_hours: "",
      phone_number_hours: "",

      phone_country_code_office: "",
      phone_area_code_office: "",
      phone_number_office: "",

      phone_country_code_mobile: "",
      phone_number_mobile: "",

      email: "",

      residential_address: "",
      residential_address_line2: "",
      residential_suburb: "",
      residential_state: "",
      residential_postcode: "",
      residential_country: "",
    },
  });

  const handleSubmit = (data) => {
    onSave(data);
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
      <div>
        <h3 className="text-base font-bold text-gray-900">Personal Contact</h3>
        <p className="text-sm text-gray-500">
          Enter as much information about this Contact Person as possible
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-4">This Person's Personal Details</h4>

        <div className="space-y-4">
          <Field
            control={dialogForm.control}
            name="family_name"
            label="This Person's Family Name"
          />

          <Field
            control={dialogForm.control}
            name="given_names"
            label="This Person's Given Names"
          />

          <div className="space-y-2">
            <Label>This Person's Gender</Label>
            <RadioGroup
              value={dialogForm.watch("gender")}
              onValueChange={(val) => dialogForm.setValue("gender", val)}
              className="flex gap-4"
            >
              {["Male", "Female", "Other"].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`gender-${option}`} />
                  <Label htmlFor={`gender-${option}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Field
            control={dialogForm.control}
            name="relationship"
            label={`This person is the Main Applicant (${mainApplicantName})'s:`}
            type="select"
            placeholder="Choose Relationship"
            options={[
              "Parent",
              "Child",
              "Sibling",
              "Aunt/Uncle",
              "Niece/Nephew",
              "Grandparent",
              "Cousin",
              "Friend",
              "Other",
            ]}
          />

          <div className="space-y-2">
            <Label>This Person's Nationality</Label>
            <Select
              value={dialogForm.watch("nationality")}
              onValueChange={(val) => dialogForm.setValue("nationality", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose Nationality" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateSelector
            label="This Person's Date of Birth"
            values={{
              day: dialogForm.watch("birth_day"),
              month: dialogForm.watch("birth_month"),
              year: dialogForm.watch("birth_year"),
            }}
            onValueChange={(field, val) => dialogForm.setValue(field === "day" ? "birth_day" : field === "month" ? "birth_month" : "birth_year", val)}
          />

          <div className="space-y-2">
            <Label>This Person's Country of Birth</Label>
            <Select
              value={dialogForm.watch("country_of_birth")}
              onValueChange={(val) => dialogForm.setValue("country_of_birth", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose Country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Field
            control={dialogForm.control}
            name="suburb_of_birth"
            label="This Person's Suburb of Birth"
          />

          <Field
            control={dialogForm.control}
            name="city_of_birth"
            label="This Person's City or Town of Birth"
          />

          <Field
            control={dialogForm.control}
            name="state_of_birth"
            label="This Person's State or Province of Birth"
          />
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-4">This Person's Telephone and Email Contact</h4>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>This Person's After Hours Phone Number</Label>
            <div className="flex gap-2">
              <Input placeholder="Country Code" {...dialogForm.register("phone_country_code_hours")} className="w-1/3" />
              <Input placeholder="Area Code" {...dialogForm.register("phone_area_code_hours")} className="w-1/3" />
              <Input placeholder="Number" {...dialogForm.register("phone_number_hours")} className="w-1/3" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>This Person's Office Hours Phone Number</Label>
            <div className="flex gap-2">
              <Input placeholder="Country Code" {...dialogForm.register("phone_country_code_office")} className="w-1/3" />
              <Input placeholder="Area Code" {...dialogForm.register("phone_area_code_office")} className="w-1/3" />
              <Input placeholder="Number" {...dialogForm.register("phone_number_office")} className="w-1/3" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>This Person's Mobile Phone Number</Label>
            <div className="flex gap-2">
              <Input placeholder="Country Code" {...dialogForm.register("phone_country_code_mobile")} className="w-1/2" />
              <Input placeholder="Number" {...dialogForm.register("phone_number_mobile")} className="w-1/2" />
            </div>
          </div>

          <Field
            control={dialogForm.control}
            name="email"
            label="This Person's Email Address"
          />
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-4">This Person's Residential Address</h4>
        <p className="text-sm text-gray-500 mb-4">This must be a physical address, not a PO Box Number</p>

        <div className="space-y-4">
          <Field
            control={dialogForm.control}
            name="residential_address"
            placeholder="Address (including Street Number and Name)"
          />
          <Field
            control={dialogForm.control}
            name="residential_address_line2"
            placeholder="Address Line 2"
          />
          <Field
            control={dialogForm.control}
            name="residential_suburb"
            placeholder="Suburb/Town/City"
          />
          <Field
            control={dialogForm.control}
            name="residential_state"
            placeholder="State"
          />
          <Field
            control={dialogForm.control}
            name="residential_postcode"
            placeholder="Postcode"
          />
          <Select
            value={dialogForm.watch("residential_country")}
            onValueChange={(val) => dialogForm.setValue("residential_country", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose Country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={dialogForm.handleSubmit(handleSubmit)} className="bg-[#285646] text-white">Ok</Button>
      </DialogFooter>
    </div>
  );
}

export default function ContactsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const draft = useSnapshot(draftStore.draft);
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();

  // Get Main Applicant Name
  const mainApplicantName = (() => {
    const main = draftStore.getSectionData('mainApplicant.details');
    if (main && main.given_names && main.family_name) {
      return `${main.given_names} ${main.family_name}`;
    }
    return "Main Applicant";
  })();

  // Sync applicationId in URL
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

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(contactsSchema),
    defaultValues: {
      contacts_note: draft.contacts_note || "",
      has_family_in_australia: draft.has_family_in_australia || "Yes",
      family_in_australia: draft.family_in_australia || [],
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    // Should probably update draft store on change, but with delay
    const timeoutId = setTimeout(() => {
      // Only save simpler fields automatically or carefully sync arrays
      // For array fields handled by RepeaterTable we might rely on the store update there?
      // But RepeaterTable updates local form state, which triggers this watchlist.
      // So this saves everything including arrays.
      draftStore.saveDraft(watchedValues);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveDraft(currentData);

    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/all-applicants/contacts', null, 'contacts');
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

  const onSubmit = async (data) => {
    await draftStore.saveDraft(data);
    await draftStore.markPageComplete('partner/all-applicants/contacts', null, 'contacts');
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="border border-gray-200 shadow-sm rounded-lg">
          <CardHeader className="px-6 py-8 border-b border-gray-200">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Additional Contact Information
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Please provide any additional contact information or special instructions
            </p>
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

              {/* Family in Australia Question */}
              <div className="space-y-4">
                <Label className="text-base">
                  Does the Main Applicant (<span suppressHydrationWarning>{mainApplicantName}</span>) have any family (parents, siblings, children) in Australia
                  who have not already been listed previously in this questionnaire?
                </Label>
                <RadioGroup
                  value={watch("has_family_in_australia")}
                  onValueChange={(val) => setValue("has_family_in_australia", val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="fam-yes" />
                    <Label htmlFor="fam-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="fam-no" />
                    <Label htmlFor="fam-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {watch("has_family_in_australia") === "Yes" && (
                <RepeaterTable
                  data={watch("family_in_australia") || []}
                  columns={[
                    { key: "family_name", label: "Family Name" },
                    { key: "given_names", label: "Given Names" },
                    { key: "relationship", label: "Relationship" },
                  ]}
                  onAdd={(row) => {
                    const current = watch("family_in_australia") || [];
                    setValue("family_in_australia", [...current, row]);
                  }}
                  onEdit={(index, updatedRow) => {
                    const current = [...(watch("family_in_australia") || [])];
                    current[index] = updatedRow;
                    setValue("family_in_australia", current);
                  }}
                  onDelete={(index) => {
                    const current = watch("family_in_australia") || [];
                    setValue("family_in_australia", current.filter((_, i) => i !== index));
                  }}
                  DialogComponent={(props) => (
                    <FamilyContactDialog {...props} mainApplicantName={mainApplicantName} />
                  )}
                  addButtonText="Add Contact"
                  emptyMessage="No contacts added yet"
                  dialogTitle="Personal Contact"
                  dialogSubtitle="Enter as much information about this Contact Person as possible"
                />
              )}

              <Field
                type="textarea"
                name="contacts_note"
                control={control}
                label="Additional Notes"
                placeholder="Enter any additional contact information or special instructions..."
                rows={6}
              />

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
