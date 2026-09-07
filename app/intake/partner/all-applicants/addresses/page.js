"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { APPLICANT_COUNTRIES as COUNTRIES } from "@/lib/allApplicantsParity";
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
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i));

const LEGAL_STATUSES = [
  "Citizen",
  "Permanent Resident",
  "Temporary Resident",
  "Student",
  "Visitor/Tourist",
  "Work Visa",
  "Refugee",
  "Illegal Resident",
  "Asylum Applicant",
  "No Legal Status",
  "Other",
];
function AddressDialog({ editingRow, onSave, onCancel, applicants = [] }) {
  const dialogFormSchema = z.object({
    applicant_ids: z.array(z.string()).optional(),
    address1: z.string().min(1, "Address is required"),
    address2: z.string().optional(),
    suburb: z.string().min(1, "Suburb / Town is required"),
    state: z.string().min(1, "State is required"),
    postcode: z.string().min(1, "Postcode is required"),
    country: z.string().min(1, "Country is required"),
    date_from_day: z.string().min(1, "Day is required"),
    date_from_month: z.string().min(1, "Month is required"),
    date_from_year: z.string().min(1, "Year is required"),
    date_to_day: z.string().optional(),
    date_to_month: z.string().optional(),
    date_to_year: z.string().optional(),
    legal_status: z.string().min(1, "Legal Status is required"),
  });
  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      applicant_ids: [],
      address1: "",
      address2: "",
      suburb: "",
      state: "",
      postcode: "",
      country: "",
      date_from_day: "",
      date_from_month: "",
      date_from_year: "",
      date_to_day: "",
      date_to_month: "",
      date_to_year: "",
      legal_status: "",
    }
  });
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <h3 className="text-base font-bold text-gray-900 mb-2">Address</h3>
      <div className="space-y-2">
        <Label>Which applicant(s) does this address apply to?</Label>
        {applicants.map((applicant) => (
          <label key={applicant.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={(dialogForm.watch("applicant_ids") || []).includes(applicant.id)}
              onCheckedChange={(checked) => {
                const selected = dialogForm.getValues("applicant_ids") || [];
                dialogForm.setValue("applicant_ids", checked ? [...new Set([...selected, applicant.id])] : selected.filter((id) => id !== applicant.id));
              }}
            />
            {applicant.label}
          </label>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-4">Enter details of the address where the applicant lived.</p>

      <div>
        <Label htmlFor="address1" className="mb-2 block">Address (including street number and name)</Label>
        <Input
          id="address1"
          {...dialogForm.register("address1")}
          data-testid="input-address1"
        />
        {dialogForm.formState.errors.address1 && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.address1.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="address2" className="mb-2 block">Address Line 2</Label>
        <Input
          id="address2"
          {...dialogForm.register("address2")}
          data-testid="input-address2"
        />
      </div>
      <div>
        <Label htmlFor="suburb" className="mb-2 block">Suburb / Town</Label>
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
        <Label htmlFor="state" className="mb-2 block">State / Territory</Label>
        <Input
          id="state"
          {...dialogForm.register("state")}
          data-testid="input-state"
        />
        {dialogForm.formState.errors.state && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.state.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="postcode" className="mb-2 block">Postcode</Label>
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
        <Label className="mb-2 block">Country</Label>
        <Select
          value={dialogForm.watch("country")}
          onValueChange={(value) => dialogForm.setValue("country", value)}
        >
          <SelectTrigger data-testid="select-country">
            <SelectValue placeholder="Choose Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.country && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
        )}
      </div>
      <div className="pt-4 pb-2">
        <h3 className="text-base font-bold text-gray-900 mb-2">When</h3>
        <p className="text-sm text-gray-500 mb-4">Enter when you lived at this address</p>
        <div className="mb-4">
          <Label className="mb-2 block">Date from</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_from_day")}
              onValueChange={(value) => dialogForm.setValue("date_from_day", value)}
            >
              <SelectTrigger data-testid="select-date-from-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{String(day).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_from_month")}
              onValueChange={(value) => dialogForm.setValue("date_from_month", value)}
            >
              <SelectTrigger data-testid="select-date-from-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_from_year")}
              onValueChange={(value) => dialogForm.setValue("date_from_year", value)}
            >
              <SelectTrigger data-testid="select-date-from-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dialogForm.formState.errors.date_from_day && (
            <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
          )}
        </div>
        <div className="mb-4">
          <Label className="mb-2 block">Date to ('Date to' may be left blank if this address is current)</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={dialogForm.watch("date_to_day")}
              onValueChange={(value) => dialogForm.setValue("date_to_day", value)}
            >
              <SelectTrigger data-testid="select-date-to-day">
                <SelectValue placeholder="Choose Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day} value={day}>{String(day).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_to_month")}
              onValueChange={(value) => dialogForm.setValue("date_to_month", value)}
            >
              <SelectTrigger data-testid="select-date-to-month">
                <SelectValue placeholder="Choose Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dialogForm.watch("date_to_year")}
              onValueChange={(value) => dialogForm.setValue("date_to_year", value)}
            >
              <SelectTrigger data-testid="select-date-to-year">
                <SelectValue placeholder="Choose Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="pt-4 pb-2">
        <h3 className="text-base font-bold text-gray-900 mb-2">Legal Status</h3>
        <p className="text-sm text-gray-500 mb-4">Enter your legal status while living in this country.</p>
        <Label className="mb-2 block">Legal Status in this Country</Label>
        <Select
          value={dialogForm.watch("legal_status")}
          onValueChange={(value) => dialogForm.setValue("legal_status", value)}
        >
          <SelectTrigger data-testid="select-legal-status">
            <SelectValue placeholder="Choose Legal Status" />
          </SelectTrigger>
          <SelectContent>
            {LEGAL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.legal_status && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.legal_status.message}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={dialogForm.handleSubmit(handleSubmit)}
          className="bg-[#4F726B] hover:bg-[#4F726B] text-white"
          data-testid="button-ok"
        >
          Ok
        </Button>
      </DialogFooter>
    </div>
  );
}
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
    defaultValues: {
      all_same_address: "no",
      address_history: [],
    },
  });
  const addressHistory = form.watch("address_history") || [];
  const profiles = draftSnap.draft?.profiles || [];
  const legacyMain = draftSnap.draft?.partner_details || {};
  const applicants = profiles.length ? profiles.map((profile) => ({
    id: String(profile.id),
    label: [profile.given_names, profile.family_name].filter(Boolean).join(" ") || "Applicant",
  })) : [{ id: "legacy_main", label: [legacyMain.given_names, legacyMain.family_name].filter(Boolean).join(" ") || "Main Applicant" }];
  const applicantLabels = (ids) => (ids || []).map((id) => applicants.find((applicant) => applicant.id === id)?.label || id).join(", ") || "Not specified";

  useEffect(() => {
    const savedData = draftSnap.draft?.partner_addresses || {};
    if (Object.keys(savedData).length > 0 && !form.formState.isDirty) {
      const formData = {
        all_same_address: savedData.all_same_address || "no",
        address_history: savedData.address_history || [],
      };
      form.reset(formData);
      // Force update pattern (though less critical for arrays, good for radio)
      setTimeout(() => {
        form.setValue("all_same_address", savedData.all_same_address || "no");
      }, 0);
    }
  }, [draftSnap.draft?.partner_addresses, form]);
  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      await draftStore.saveSectionData("partner_addresses", data);
      await draftStore.markPageComplete(`${visaType}/all-applicants/addresses`, null, "partner_addresses");
      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
      startNavigation(next);
      if (next) router.push(next);
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
      const values = form.getValues();
      const result = await draftStore.saveSectionData("partner_addresses", values);
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
    }
  };
  return (
    <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Addresses</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Provide the residential history of all applicants included in this application.
          </p>
        </CardHeader>
        <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Does every applicant who is to be included in this application currently live at the same residential address?</Label>
              <RadioGroup
                value={form.watch("all_same_address")}
                onValueChange={(value) => form.setValue("all_same_address", value)}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`address-${option}`} data-testid={`radio-same-address-${option}`} />
                      <Label htmlFor={`address-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Address History</h3>
              <RepeaterTable
                data={addressHistory}
                columns={[
                  { key: "applicant_ids", label: "Applicant(s)", format: (row) => applicantLabels(row.applicant_ids) },
                  { key: "address1", label: "Address" },
                  { key: "suburb", label: "Suburb" },
                  { key: "country", label: "Country" },
                  { key: "date_from_year", label: "From" },
                  { key: "date_to_year", label: "To" },
                ]}
                onAdd={(newRow) => {
                  const updated = [...addressHistory, newRow];
                  form.setValue("address_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                }}
                onEdit={(index, updatedRow) => {
                  const updated = [...addressHistory];
                  updated[index] = updatedRow;
                  form.setValue("address_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                }}
                onDelete={(index) => {
                  const updated = addressHistory.filter((_, i) => i !== index);
                  form.setValue("address_history", updated, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                }}
                DialogComponent={(props) => <AddressDialog {...props} applicants={applicants} />}
                addButtonText="Add"
                testIdPrefix="address"
              />
            </div>
            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
              loading={isSaving}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
