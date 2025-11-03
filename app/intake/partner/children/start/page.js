"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname } from "next/navigation";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { childrenSchema } from "@/lib/validation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

function ChildDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      name: "",
      dob: "",
      gender: "Male",
      intention: "Included in Application",
    },
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit(handleFormSubmit)(e);
      }} 
      className="space-y-4"
    >
      <Field 
        type="text" 
        name="name" 
        control={control} 
        label="Name" 
        required 
        data-testid="input-child-name"
      />
      <Field 
        type="date" 
        name="dob" 
        control={control} 
        label="Date of Birth"
        data-testid="input-child-dob"
      />
      <Field
        type="select"
        name="gender"
        control={control}
        label="Gender"
        options={[
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
          { value: "Other", label: "Other" },
        ]}
        data-testid="select-child-gender"
      />
      <Field
        type="select"
        name="intention"
        control={control}
        label="Intention"
        options={[
          { value: "Included in Application", label: "Included in Application" },
          { value: "Not Included", label: "Not Included" },
        ]}
        data-testid="select-child-intention"
      />
      <DialogFooter className="gap-2 sm:gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          data-testid="button-submit"
        >
          {row ? "Update" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ChildrenStartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const draft = draftStore.draft;
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(childrenSchema),
    mode: "onChange",
    defaultValues: {
      has_children_joint: draft?.has_children_joint || undefined,
      children: draft?.children || [],
    },
  });

  const hasChildrenJoint = watch("has_children_joint");
  const children = watch("children") || [];

  // Auto-save
  const watchedValues = watch();
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      draftStore.saveDraft(watchedValues);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  const onSubmit = (data) => {
    draftStore.saveDraft(data);
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveDraft(currentData);
    
    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/children/start');
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

  const handleAddChild = (child) => {
    const updatedChildren = [...children, child];
    setValue("children", updatedChildren, { shouldValidate: true });
    draftStore.saveDraft({ children: updatedChildren });
  };

  const handleEditChild = (index, child) => {
    const updatedChildren = [...children];
    updatedChildren[index] = child;
    setValue("children", updatedChildren, { shouldValidate: true });
    draftStore.saveDraft({ children: updatedChildren });
  };

  const handleDeleteChild = (index) => {
    const updatedChildren = children.filter((_, i) => i !== index);
    setValue("children", updatedChildren, { shouldValidate: true });
    draftStore.saveDraft({ children: updatedChildren });
  };

  const childColumns = [
    { key: "name", label: "Name" },
    { key: "dob", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "intention", label: "Intention" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Children Details</CardTitle>
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
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h3 className="font-semibold text-destructive mb-2">Please correct the following errors:</h3>
                <ul className="list-disc list-inside text-sm text-destructive/90 space-y-1">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <Field
              type="radio"
              name="has_children_joint"
              control={control}
              label="Do you have children with your current or former partner?"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              data-testid="radio-has-children"
            />

            {hasChildrenJoint === "Yes" && (
              <RepeaterTable
                rows={children}
                columns={childColumns}
                onAdd={handleAddChild}
                onEdit={handleEditChild}
                onDelete={handleDeleteChild}
                dialogForm={(row, onSubmit, onCancel) => (
                  <ChildDialog row={row} onSubmit={onSubmit} onCancel={onCancel} />
                )}
                addButtonText="Add Child"
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
