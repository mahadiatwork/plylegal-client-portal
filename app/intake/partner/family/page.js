"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { draftStore } from "@/stores/draftStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { familyMembersSchema } from "@/lib/validation";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

function FamilyMemberDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      name: "",
      dob: "",
      relationship: "",
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
        data-testid="input-family-member-name"
      />
      <Field 
        type="date" 
        name="dob" 
        control={control} 
        label="Date of Birth"
        data-testid="input-family-member-dob"
      />
      <Field
        type="select"
        name="relationship"
        control={control}
        label="Relationship"
        required
        options={[
          { value: "Spouse/Partner", label: "Spouse/Partner" },
          { value: "Parent", label: "Parent" },
          { value: "Step-Parent", label: "Step-Parent" },
          { value: "Sibling", label: "Sibling" },
          { value: "Step-Sibling", label: "Step-Sibling" },
          { value: "Child", label: "Child" },
          { value: "Step-Child", label: "Step-Child" },
          { value: "Adopted Child", label: "Adopted Child" },
          { value: "Guardian", label: "Guardian" },
        ]}
        data-testid="select-family-member-relationship"
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

export default function FamilyMembersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const draft = draftStore.draft;
  const { toast } = useToast();

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(familyMembersSchema),
    mode: "onChange",
    defaultValues: {
      family_members: draft?.family_members || [],
    },
  });

  const familyMembers = watch("family_members") || [];

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
    draftStore.markPageComplete('partner/family');
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
      await draftStore.markPageComplete('partner/family');
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

  const handleAddMember = (member) => {
    const updatedMembers = [...familyMembers, member];
    setValue("family_members", updatedMembers, { shouldValidate: true });
    draftStore.saveDraft({ family_members: updatedMembers });
  };

  const handleEditMember = (index, member) => {
    const updatedMembers = [...familyMembers];
    updatedMembers[index] = member;
    setValue("family_members", updatedMembers, { shouldValidate: true });
    draftStore.saveDraft({ family_members: updatedMembers });
  };

  const handleDeleteMember = (index) => {
    const updatedMembers = familyMembers.filter((_, i) => i !== index);
    setValue("family_members", updatedMembers, { shouldValidate: true });
    draftStore.saveDraft({ family_members: updatedMembers });
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "dob", label: "Date of Birth" },
    { key: "relationship", label: "Relationship" },
  ];

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Family Members</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={handleSubmit(onSubmit)} 
            className="space-y-8"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please provide details of all immediate family members (parents, siblings, spouse, children).
              </p>
              <RepeaterTable
                rows={familyMembers}
                columns={columns}
                onAdd={handleAddMember}
                onEdit={handleEditMember}
                onDelete={handleDeleteMember}
                dialogForm={(row, onSubmit, onCancel) => (
                  <FamilyMemberDialog 
                    row={row} 
                    onSubmit={onSubmit} 
                    onCancel={onCancel} 
                  />
                )}
                emptyMessage="No family members added yet."
                data-testid="repeater-family-members"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                data-testid="button-previous-desktop"
              >
                Previous
              </Button>
              
              <Button
                type="button"
                variant="secondary"
                onClick={handleSave}
                data-testid="button-save-desktop"
              >
                Save Draft
              </Button>

              <Button
                type="submit"
                data-testid="button-continue-desktop"
              >
                Continue →
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Mobile Navigation */}
      <StickyNav
        onPrev={handlePrevious}
        onSave={handleSave}
        onNext={handleSubmit(onSubmit)}
      />
    </>
  );
}
