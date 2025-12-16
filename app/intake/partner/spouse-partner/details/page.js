"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { applicationsStore } from "@/stores/applicationsStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormNavigation } from "@/components/FormNavigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

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
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

const spousePartnerSchema = z.object({
  family_name: z.string().min(1, "Family Name is required"),
  given_names: z.string().min(1, "Given Names is required"),
  gender: z.string().min(1, "Gender is required"),
  birth_day: z.string().min(1, "Day is required"),
  birth_month: z.string().min(1, "Month is required"),
  birth_year: z.string().min(1, "Year is required"),
});

function SpousePartnerDialog({ isOpen, onClose, onSave, existingData }) {
  const dialogForm = useForm({
    resolver: zodResolver(spousePartnerSchema),
    defaultValues: existingData || {
      family_name: "",
      given_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
    },
  });

  // Reset form when dialog opens/closes or existingData changes
  useEffect(() => {
    if (isOpen) {
      dialogForm.reset(existingData || {
        family_name: "",
        given_names: "",
        gender: "",
        birth_day: "",
        birth_month: "",
        birth_year: "",
      });
    }
  }, [isOpen, existingData]);

  const handleFormSubmit = (data) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[98vh] bg-white overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Spouse/Partner</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            You have indicated the Main Applicant has a Spouse/Partner based on their marital status. Enter details of the Spouse/Partner.
          </p>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dialogForm.handleSubmit(handleFormSubmit)(e);
          }}
          className="space-y-4"
        >
          <div>
            <Label className="mb-2 block font-semibold">Personal Details</Label>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="family_name">Family Name <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="given_names">Given Names <span className="text-red-500">*</span></Label>
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
                <Label>Gender <span className="text-red-500">*</span></Label>
                <RadioGroup
                  value={dialogForm.watch("gender")}
                  onValueChange={(value) => dialogForm.setValue("gender", value, { shouldValidate: true })}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Male" id="gender-male" />
                    <Label htmlFor="gender-male" className="cursor-pointer">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Female" id="gender-female" />
                    <Label htmlFor="gender-female" className="cursor-pointer">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Other" id="gender-other" />
                    <Label htmlFor="gender-other" className="cursor-pointer">Other</Label>
                  </div>
                </RadioGroup>
                {dialogForm.formState.errors.gender && (
                  <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.gender.message}</p>
                )}
              </div>

              <div>
                <Label>Date of Birth <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Select
                    value={dialogForm.watch("birth_day")}
                    onValueChange={(value) => dialogForm.setValue("birth_day", value, { shouldValidate: true })}
                  >
                    <SelectTrigger data-testid="select-birth-day">
                      <SelectValue placeholder="Choose Day" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <SelectContent>
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
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(dialogForm.formState.errors.birth_day || dialogForm.formState.errors.birth_month || dialogForm.formState.errors.birth_year) && (
                  <p className="text-sm text-red-600 mt-1">Date of Birth is required</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground" data-testid="button-continue">
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SpousePartnerDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const appsSnap = useSnapshot(applicationsStore);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [spousePartnerData, setSpousePartnerData] = useState(null);
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

  // Load section data
  useEffect(() => {
    const sectionData = draftStore.getSectionData('spousePartner.details');
    if (sectionData && Object.keys(sectionData).length > 0) {
      setSpousePartnerData(sectionData);
    }
  }, []);

  // Get main applicant's marital status
  const mainApplicantDetails = draftStore.getSectionData('mainApplicant.details');
  const maritalStatus = mainApplicantDetails?.marital_status || "";
  const mainApplicantName = mainApplicantDetails?.given_names || "Main Applicant";

  const handleSaveSpousePartner = (data) => {
    setSpousePartnerData(data);
    draftStore.saveSectionData('spousePartner.details', data);
    toast({
      title: "Spouse/Partner details saved",
      description: "The spouse/partner information has been saved successfully.",
    });
    // Navigate to personal details page
    if (draftSnap.currentApplicationId) {
      router.push(`/intake/partner/spouse-partner/personal-details?applicationId=${draftSnap.currentApplicationId}`);
    } else {
      router.push('/intake/partner/spouse-partner/personal-details');
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
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
      if (spousePartnerData) {
        const result = await draftStore.saveSectionData('spousePartner.details', spousePartnerData);
        if (result.success) {
          await draftStore.markPageComplete('partner/spouse-partner/details');
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
      }
    } catch (error) {
      toast({
        title: "Error saving draft",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!spousePartnerData) {
      toast({
        title: "Required",
        description: "Please add spouse/partner details before continuing.",
        variant: "destructive",
      });
      return;
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
      const result = await draftStore.saveSectionData('spousePartner.details', spousePartnerData);

      if (result.success) {
        await draftStore.markPageComplete('partner/spouse-partner/details');
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

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Personal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-700 mb-4">
                In the Spouse/Partner section you are to provide details about the main applicant's spouse/partner. You are to provide information even if this person is not going to be included in the application.
              </p>
              {maritalStatus && (maritalStatus === "Married" || maritalStatus === "De Facto") && (
                <p className="text-sm text-gray-700 mb-4">
                  You have previously answered that the Main Applicant ({mainApplicantName}) is {maritalStatus === "Married" ? "Married" : "in a De Facto Relationship"}. Please click the 'Add Spouse/Partner' button to enter the Spouse/Partner details.
                </p>
              )}
            </div>

            {spousePartnerData ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {spousePartnerData.given_names} {spousePartnerData.family_name}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Gender: {spousePartnerData.gender}
                    </p>
                    {spousePartnerData.birth_day && spousePartnerData.birth_month && spousePartnerData.birth_year && (
                      <p className="text-sm text-gray-600">
                        Date of Birth: {spousePartnerData.birth_day}/{spousePartnerData.birth_month}/{spousePartnerData.birth_year}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(true)}
                      data-testid="button-edit-spouse"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (draftSnap.currentApplicationId) {
                          router.push(`/intake/partner/spouse-partner/personal-details?applicationId=${draftSnap.currentApplicationId}`);
                        } else {
                          router.push('/intake/partner/spouse-partner/personal-details');
                        }
                      }}
                      className="bg-primary text-primary-foreground"
                      data-testid="button-view-details"
                    >
                      View/Edit Details
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary text-primary-foreground"
                data-testid="button-add-spouse"
              >
                Add Spouse/Partner
              </Button>
            )}

            <FormNavigation
              onPrev={handlePrevious}
              onSave={handleSave}
              onNext={handleContinue}
              disabledNext={!spousePartnerData}
              loading={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      <SpousePartnerDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveSpousePartner}
        existingData={spousePartnerData}
      />
    </>
  );
}

