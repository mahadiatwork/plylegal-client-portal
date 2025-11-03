"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { RepeaterTable } from "@/components/RepeaterTable";
import { characterSchema } from "@/lib/validation";
import { CHARACTER_QUESTIONS, getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { draftStore } from "@/stores/draftStore";
import { useSnapshot } from "valtio";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

function CharacterDetailDialog({ row, onSubmit, onCancel }) {
  const { control, handleSubmit } = useForm({
    defaultValues: row || {
      name: "",
      dob: "",
      detail: "",
      country: "",
      date: "",
      offence: "",
      penalty: "",
    },
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit(handleFormSubmit)(e);
      }}
    >
      <div className="max-h-[60vh] overflow-y-auto space-y-4 px-1">
        <Field type="text" name="name" control={control} label="Name" />
        <Field type="date" name="dob" control={control} label="Date of Birth" />
        <Field type="textarea" name="detail" control={control} label="Details" rows={4} />
        <Field type="text" name="country" control={control} label="Country" />
        <Field type="date" name="date" control={control} label="Date" />
        <Field type="text" name="offence" control={control} label="Offence" />
        <Field type="text" name="penalty" control={control} label="Penalty" />
      </div>
      <DialogFooter className="gap-2 sm:gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{row ? "Update" : "Add"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function CharacterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const visaType = getVisaTypeFromPath(pathname);
  const draft = useSnapshot(draftStore.draft);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      character: draft.character || {},
    },
  });

  const character = watch("character") || {};

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const currentData = getValues();
    const result = await draftStore.saveDraft(currentData);
    
    if (result.success) {
      // Mark this page as complete
      await draftStore.markPageComplete('partner/all-applicants/character');
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

  const onSubmit = (data) => {
    draftStore.saveDraft(data);
    draftStore.markPageComplete('partner/all-applicants/character');
    const next = getNextRoute(pathname, visaType);
    if (next) router.push(next);
  };

  const characterColumns = [
    { key: "name", label: "Name" },
    { key: "detail", label: "Details" },
    { key: "country", label: "Country" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="border border-gray-200 shadow-sm rounded-lg">
          <CardHeader className="px-6 py-8 border-b border-gray-200">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Character Assessment
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Please answer the following questions truthfully and provide details where necessary
            </p>
          </CardHeader>
          <CardContent className="px-6 py-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                  e.preventDefault();
                }
              }}
              className="space-y-8"
            >
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

              {CHARACTER_QUESTIONS.map((q) => {
                const answer = character[q.slug]?.answer;
                const details = character[q.slug]?.details || [];

                return (
                  <div key={q.slug} className="space-y-4 pb-6 border-b last:border-0">
                    <div className="space-y-3">
                      <label className="text-base font-medium leading-relaxed block text-gray-900">
                        {q.question}
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            const updatedCharacter = {
                              ...draftStore.draft.character,
                              [q.slug]: { ...draftStore.draft.character?.[q.slug], answer: "Yes" }
                            };
                            setValue(`character`, updatedCharacter, { shouldValidate: true });
                            draftStore.saveDraft({ character: updatedCharacter });
                          }}
                          className={`px-6 py-2 rounded-lg border-2 transition-colors ${
                            answer === "Yes"
                              ? "bg-[#285646] text-white border-[#285646]"
                              : "border-gray-300 hover:border-[#285646]/50 text-gray-700"
                          }`}
                          data-testid={`radio-character-${q.slug}-Yes`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedCharacter = {
                              ...draftStore.draft.character,
                              [q.slug]: { answer: "No", details: [] }
                            };
                            setValue(`character`, updatedCharacter, { shouldValidate: true });
                            draftStore.saveDraft({ character: updatedCharacter });
                          }}
                          className={`px-6 py-2 rounded-lg border-2 transition-colors ${
                            answer === "No"
                              ? "bg-[#285646] text-white border-[#285646]"
                              : "border-gray-300 hover:border-[#285646]/50 text-gray-700"
                          }`}
                          data-testid={`radio-character-${q.slug}-No`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {mounted && answer === "Yes" && (
                      <div className="mt-4 pl-4 border-l-4 border-[#285646]">
                        <RepeaterTable
                          rows={details}
                          columns={characterColumns}
                          onAdd={(row) => {
                            const updatedDetails = [...details, row];
                            const updatedCharacter = {
                              ...draftStore.draft.character,
                              [q.slug]: { answer: "Yes", details: updatedDetails }
                            };
                            setValue(`character`, updatedCharacter, { shouldValidate: true });
                            draftStore.saveDraft({ character: updatedCharacter });
                          }}
                          onEdit={(index, row) => {
                            const updatedDetails = [...details];
                            updatedDetails[index] = row;
                            const updatedCharacter = {
                              ...draftStore.draft.character,
                              [q.slug]: { answer: "Yes", details: updatedDetails }
                            };
                            setValue(`character`, updatedCharacter, { shouldValidate: true });
                            draftStore.saveDraft({ character: updatedCharacter });
                          }}
                          onDelete={(index) => {
                            const updatedDetails = details.filter((_, i) => i !== index);
                            const updatedCharacter = {
                              ...draftStore.draft.character,
                              [q.slug]: { answer: "Yes", details: updatedDetails }
                            };
                            setValue(`character`, updatedCharacter, { shouldValidate: true });
                            draftStore.saveDraft({ character: updatedCharacter });
                          }}
                          dialogForm={(row, onSubmit, onCancel) => (
                            <CharacterDetailDialog
                              row={row}
                              onSubmit={onSubmit}
                              onCancel={onCancel}
                            />
                          )}
                          addButtonText="Add Details"
                          emptyMessage="Please add details"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

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
