"use client";

import { useRouter, usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { identitySchema } from "@/lib/validation";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

function CitizenshipDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit, watch, setValue } = useForm({
    defaultValues: row || {
      country: "",
      obtained_method: "",
      date_obtained: "",
      still_citizen: true,
    },
  });

  const stillCitizen = watch("still_citizen");

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }} 
      className="space-y-4"
    >
      <Field type="text" name="country" control={control} label="Country" required />
      <Field type="text" name="obtained_method" control={control} label="Method Obtained" required />
      <Field type="date" name="date_obtained" control={control} label="Date Obtained" />
      <div className="flex items-center space-x-2">
        <Checkbox
          id="still_citizen"
          checked={stillCitizen}
          onCheckedChange={(checked) => setValue("still_citizen", !!checked)}
        />
        <Label htmlFor="still_citizen" className="cursor-pointer">
          Still a citizen
        </Label>
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          {row ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PassportDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      doc_number: "",
      name: "",
      nationality: "",
      date_of_issue: "",
      status: "Valid",
    },
  });

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }} 
      className="space-y-4"
    >
      <Field type="text" name="doc_number" control={control} label="Document Number" required />
      <Field type="text" name="name" control={control} label="Name on Passport" required />
      <Field type="text" name="nationality" control={control} label="Nationality" required />
      <Field type="date" name="date_of_issue" control={control} label="Date of Issue" />
      <Field
        type="select"
        name="status"
        control={control}
        label="Status"
        options={[
          { value: "Valid", label: "Valid" },
          { value: "Expired", label: "Expired" },
          { value: "Cancelled", label: "Cancelled" },
        ]}
      />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          {row ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function IdentityDocDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      doc_type: "",
      id_number: "",
      name: "",
      country_of_issue: "",
      date_of_issue: "",
    },
  });

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }} 
      className="space-y-4"
    >
      <Field type="text" name="doc_type" control={control} label="Document Type" required />
      <Field type="text" name="id_number" control={control} label="ID Number" required />
      <Field type="text" name="name" control={control} label="Name on Document" required />
      <Field type="text" name="country_of_issue" control={control} label="Country of Issue" required />
      <Field type="date" name="date_of_issue" control={control} label="Date of Issue" />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          {row ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CountryDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || { country: "" },
  });

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(onSubmit)(e);
      }} 
      className="space-y-4"
    >
      <Field type="text" name="country" control={control} label="Country" required />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          {row ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function MainApplicantIdentityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const draftSnap = useSnapshot(draftStore);
  const saveTimeoutRef = useRef(null);
  const { toast } = useToast();
  
  // Get visa type from pathname
  const visaType = getVisaTypeFromPath(pathname);

  // Load section data
  const sectionData = draftStore.getSectionData('mainApplicant.identity');

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(identitySchema),
    mode: "onChange",
    defaultValues: {
      citizen_of_country: sectionData.citizen_of_country,
      citizenships: sectionData.citizenships || [],
      has_passport: sectionData.has_passport,
      passports: sectionData.passports || [],
      has_identity_doc: sectionData.has_identity_doc,
      identity_docs: sectionData.identity_docs || [],
      permanent_residency_rights: sectionData.permanent_residency_rights,
      pr_countries: sectionData.pr_countries || [],
    },
  });

  // Watch form values for conditional rendering
  const citizenOfCountry = watch("citizen_of_country");
  const hasPassport = watch("has_passport");
  const hasIdentityDoc = watch("has_identity_doc");
  const permanentResidencyRights = watch("permanent_residency_rights");
  const citizenships = watch("citizenships") || [];
  const passports = watch("passports") || [];
  const identityDocs = watch("identity_docs") || [];
  const prCountries = watch("pr_countries") || [];

  // Watch all form values for auto-save
  const watchedValues = useWatch({ control });

  // Auto-save form data with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (watchedValues && Object.keys(watchedValues).length > 0) {
        draftStore.saveSectionData('mainApplicant.identity', watchedValues);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [watchedValues]);

  const onSubmit = (data) => {
    draftStore.saveSectionData('mainApplicant.identity', data);
    draftStore.markPageComplete('partner/main-applicant/identity');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveSectionData('mainApplicant.identity', currentData);
    
    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/main-applicant/identity');
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

  const updateCitizenships = (newCitizenships) => {
    setValue("citizenships", newCitizenships, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.identity', { ...currentData, citizenships: newCitizenships });
  };

  const updatePassports = (newPassports) => {
    setValue("passports", newPassports, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.identity', { ...currentData, passports: newPassports });
  };

  const updateIdentityDocs = (newDocs) => {
    setValue("identity_docs", newDocs, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.identity', { ...currentData, identity_docs: newDocs });
  };

  const updatePrCountries = (newCountries) => {
    setValue("pr_countries", newCountries, { shouldValidate: true });
    const currentData = getValues();
    draftStore.saveSectionData('mainApplicant.identity', { ...currentData, pr_countries: newCountries });
  };

  const citizenshipColumns = [
    { key: "country", label: "Country" },
    { key: "obtained_method", label: "Method" },
    { key: "date_obtained", label: "Date" },
  ];

  const passportColumns = [
    { key: "doc_number", label: "Number" },
    { key: "nationality", label: "Nationality" },
    { key: "status", label: "Status" },
  ];

  const identityDocColumns = [
    { key: "doc_type", label: "Type" },
    { key: "id_number", label: "Number" },
    { key: "country_of_issue", label: "Country" },
  ];

  const countryColumns = [
    { key: "country", label: "Country" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Identity Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Please correct the following errors:
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
              name="citizen_of_country"
              control={control}
              label="Are you a citizen of any country?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {citizenOfCountry === "Yes" && (
              <RepeaterTable
                rows={citizenships}
                columns={citizenshipColumns}
                onAdd={(row) => updateCitizenships([...citizenships, row])}
                onEdit={(index, row) => {
                  const updated = [...citizenships];
                  updated[index] = row;
                  updateCitizenships(updated);
                }}
                onDelete={(index) => {
                  const updated = citizenships.filter((_, i) => i !== index);
                  updateCitizenships(updated);
                }}
                dialogForm={(row, onSubmit, onCancel) => (
                  <CitizenshipDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Citizenship"
                emptyMessage="No items added yet"
              />
            )}

            <Field
              type="radio"
              name="has_passport"
              control={control}
              label="Do you have a passport?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {hasPassport === "Yes" && (
              <RepeaterTable
                rows={passports}
                columns={passportColumns}
                onAdd={(row) => updatePassports([...passports, row])}
                onEdit={(index, row) => {
                  const updated = [...passports];
                  updated[index] = row;
                  updatePassports(updated);
                }}
                onDelete={(index) => {
                  const updated = passports.filter((_, i) => i !== index);
                  updatePassports(updated);
                }}
                dialogForm={(row, onSubmit, onCancel) => (
                  <PassportDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Passport"
                emptyMessage="No items added yet"
              />
            )}

            <Field
              type="radio"
              name="has_identity_doc"
              control={control}
              label="Do you have any other identity documents?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {hasIdentityDoc === "Yes" && (
              <RepeaterTable
                rows={identityDocs}
                columns={identityDocColumns}
                onAdd={(row) => updateIdentityDocs([...identityDocs, row])}
                onEdit={(index, row) => {
                  const updated = [...identityDocs];
                  updated[index] = row;
                  updateIdentityDocs(updated);
                }}
                onDelete={(index) => {
                  const updated = identityDocs.filter((_, i) => i !== index);
                  updateIdentityDocs(updated);
                }}
                dialogForm={(row, onSubmit, onCancel) => (
                  <IdentityDocDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Identity Document"
                emptyMessage="No items added yet"
              />
            )}

            <Field
              type="radio"
              name="permanent_residency_rights"
              control={control}
              label="Do you have permanent residency rights in any country?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />

            {permanentResidencyRights === "Yes" && (
              <RepeaterTable
                rows={prCountries}
                columns={countryColumns}
                onAdd={(row) => updatePrCountries([...prCountries, row])}
                onEdit={(index, row) => {
                  const updated = [...prCountries];
                  updated[index] = row;
                  updatePrCountries(updated);
                }}
                onDelete={(index) => {
                  const updated = prCountries.filter((_, i) => i !== index);
                  updatePrCountries(updated);
                }}
                dialogForm={(row, onSubmit, onCancel) => (
                  <CountryDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Country"
                emptyMessage="No items added yet"
              />
            )}

            <div className="hidden lg:flex justify-between items-center pt-6 border-t border-border">
              <button
                type="button"
                onClick={handlePrevious}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-previous"
              >
                ← Previous
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-save-draft"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={!isValid}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  data-testid="button-continue"
                >
                  Continue →
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <StickyNav
        onPrev={handlePrevious}
        onSave={handleSave}
        onNext={handleSubmit(onSubmit)}
        disabledNext={!isValid}
      />
    </>
  );
}
