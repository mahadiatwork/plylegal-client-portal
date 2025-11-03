"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";

const nameSchema = z.object({
  family_name: z.string().min(1, "Family name is required"),
  given_names: z.string().min(1, "Given names are required"),
  reason: z.string().min(1, "Reason is required"),
});

function NameDialog({ editingRow, onSave, onCancel }) {
  const form = useForm({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      family_name: "",
      given_names: "",
      reason: "",
    },
  });

  useEffect(() => {
    if (editingRow) {
      form.reset(editingRow);
    } else {
      form.reset({
        family_name: "",
        given_names: "",
        reason: "",
      });
    }
  }, [editingRow]);

  const handleSubmit = (data) => {
    onSave(data);
    form.reset();
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="family_name">Family Name *</Label>
        <Input
          id="family_name"
          {...form.register("family_name")}
          placeholder="Enter family name"
          data-testid="input-dialog-family-name"
        />
        {form.formState.errors.family_name && (
          <p className="text-sm text-destructive">{form.formState.errors.family_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="given_names">Given Names *</Label>
        <Input
          id="given_names"
          {...form.register("given_names")}
          placeholder="Enter given names"
          data-testid="input-dialog-given-names"
        />
        {form.formState.errors.given_names && (
          <p className="text-sm text-destructive">{form.formState.errors.given_names.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Change *</Label>
        <Input
          id="reason"
          {...form.register("reason")}
          placeholder="Enter reason for change"
          data-testid="input-dialog-reason"
        />
        {form.formState.errors.reason && (
          <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-ok">
          Ok
        </Button>
      </div>
    </form>
  );
}

const formSchema = z.object({
  has_other_names: z.enum(["yes", "no"]).optional(),
  other_names: z.array(nameSchema).optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const [hasOtherNames, setHasOtherNames] = useState("no");
  const [otherNames, setOtherNames] = useState([]);

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
      has_other_names: "no",
      other_names: [],
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_spouse_other || {};
    if (Object.keys(savedData).length > 0) {
      if (savedData.has_other_names) {
        setHasOtherNames(savedData.has_other_names);
        form.setValue("has_other_names", savedData.has_other_names);
      }
      if (savedData.other_names) {
        setOtherNames(savedData.other_names);
        form.setValue("other_names", savedData.other_names);
      }
    }
  }, []);

  const onSubmit = async (data) => {
    const submitData = {
      ...data,
      other_names: otherNames,
    };
    await draftStore.saveSectionData("temporary_work_spouse_other", submitData);
    await draftStore.markPageComplete(`${visaType}/spouse-partner/other-details`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const submitData = {
      ...values,
      other_names: otherNames,
    };
    const result = await draftStore.saveSectionData("temporary_work_spouse_other", submitData);
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
  };

  const handleAddName = (data) => {
    setOtherNames([...otherNames, data]);
  };

  const handleEditName = (index, data) => {
    const updated = [...otherNames];
    updated[index] = data;
    setOtherNames(updated);
  };

  const handleDeleteName = (index) => {
    setOtherNames(otherNames.filter((_, i) => i !== index));
  };

  const columns = [
    { key: "family_name", label: "Family Name" },
    { key: "given_names", label: "Given Names" },
    { key: "reason", label: "Reason for Change" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <StickyNav
        onPrevious={handlePrevious}
        onSave={handleSave}
        onContinue={form.handleSubmit(onSubmit)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Other Personal Details</h1>
          <p className="text-muted-foreground mt-2">
            Provide any other names your spouse/partner has been known by.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>Has your Spouse/Partner ever had or been known by any other name, alias, or different spelling?</Label>
              <RadioGroup
                value={hasOtherNames}
                onValueChange={(value) => {
                  setHasOtherNames(value);
                  form.setValue("has_other_names", value);
                }}
              >
                <div className="flex gap-4">
                  {["yes", "no"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`other-names-${option}`} data-testid={`radio-other-names-${option}`} />
                      <Label htmlFor={`other-names-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {hasOtherNames === "yes" && (
              <div className="mt-6">
                <RepeaterTable
                  data={otherNames}
                  columns={columns}
                  onAdd={handleAddName}
                  onEdit={handleEditName}
                  onDelete={handleDeleteName}
                  DialogComponent={NameDialog}
                  addButtonText="Add"
                  emptyMessage="No other names added"
                  testIdPrefix="other-name"
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
