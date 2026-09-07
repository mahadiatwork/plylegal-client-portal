"use client";
import { IdentityDocumentFields } from "@/components/intake/target-visas/IdentityDocumentFields";
import { TargetCitizenshipDialog } from "@/components/intake/target-visas/TargetCitizenshipDialog";
import { normalizeTargetIdentityDocuments } from "@/lib/targetVisaIdentity";
import { validateIdentityForVisa } from "@/lib/mainApplicantIdentity";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { COUNTRIES } from "@/reuseable/countries";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { FormNavigation } from "@/components/FormNavigation";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

// Dialog for Citizenships
function CitizenshipDialog(props) {
    return <TargetCitizenshipDialog {...props} additionalMethods={["Grant", "Adoption", "Other"]} reasonField="ceased_reason" />;
}

function ResidencyDialog({ editingRow, onSave, onCancel }) {
    const dialogFormSchema = z.object({
        country: z.string().min(1, "Country is required"),
    });

    const dialogForm = useForm({
        resolver: zodResolver(dialogFormSchema),
        defaultValues: editingRow || {
            country: "",
        }
    });

    const handleSubmit = (data) => {
        onSave({ ...editingRow, ...data });
        dialogForm.reset();
    };

    return (
        <form
            onSubmit={(e) => {
                e.stopPropagation();
                dialogForm.handleSubmit(handleSubmit)(e);
            }}
            className="space-y-6"
        >
            <div className="space-y-4">
                <div>
                    <Label className="mb-2 block font-semibold text-gray-700">Country</Label>
                    <Select
                        value={dialogForm.watch("country")}
                        onValueChange={(value) => dialogForm.setValue("country", value)}
                    >
                        <SelectTrigger data-testid="select-residency-country">
                            <SelectValue placeholder="Choose Country" />
                        </SelectTrigger>
                        <SelectContent>
                            {[...new Set([...COUNTRIES, ...(editingRow?.country ? [editingRow.country] : [])])].map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {dialogForm.formState.errors.country && (
                        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
                    )}
                </div>
            </div>

            <DialogFooter>
                <div className="flex justify-end gap-2 w-full">
                    <Button type="submit" className="bg-[#4F726B] hover:bg-[#4F726B] text-white">Add</Button>
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                </div>
            </DialogFooter>
        </form>
    );
}

export default function IdentityPage() {
    const router = useRouter();
    const { startNavigation } = useNavigationLoading();
    const pathname = usePathname();
    const searchParams = useSearchParams();
  const profileId = getProfileIdFromSearchParams(searchParams);
    const { toast } = useToast();
    const draftSnap = useSnapshot(draftStore);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Profile awareness
    const activeProfile = profileId ? draftSnap.draft?.profiles?.find((p) => p.id === profileId) : null;

    useEffect(() => {
        const appIdFromUrl = searchParams.get('applicationId');
        if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
            draftStore.setApplicationId(appIdFromUrl);
            draftStore.loadDraft(appIdFromUrl);
        }
    }, [searchParams, draftSnap.currentApplicationId]);

    const form = useForm({
        defaultValues: {
            ...normalizeTargetIdentityDocuments(),
            is_current_citizen: "yes",
            stateless_reason: "",
            citizenships: [],
            has_ever_been_citizen: "no",
            previous_citizenships: [],
            has_permanent_residency_rights: "no",
            permanent_residencies: [],
        }
    });

    const isCurrentCitizen = form.watch("is_current_citizen");
    const citizenships = form.watch("citizenships") || [];
    const hasPR = form.watch("has_permanent_residency_rights");
    const permanentResidencies = form.watch("permanent_residencies") || [];
    const hasEverBeenCitizen = form.watch("has_ever_been_citizen");
    const previousCitizenships = form.watch("previous_citizenships") || [];

    // Get Spouse Name
    const spouseName = activeProfile
        ? `${activeProfile.given_names || ""} ${activeProfile.family_name || ""}`.trim()
        : (draftSnap.draft?.protection_spouse_details?.given_names
            ? `${draftSnap.draft?.protection_spouse_details?.given_names} ${draftSnap.draft?.protection_spouse_details?.family_name || ''}`.trim()
            : "Spouse/Partner");

    useEffect(() => {
        if (draftSnap.isLoading) return;
        const savedData = profileId
            ? draftSnap.draft?.profiles_data?.[profileId]?.identity || {}
            : draftSnap.draft?.protection_spouse_identity || {};

        form.reset({
                ...normalizeTargetIdentityDocuments(savedData, activeProfile),
                is_current_citizen: savedData.is_current_citizen || "yes",
                stateless_reason: savedData.stateless_reason || "",
                citizenships: savedData.citizenships || [],
                has_ever_been_citizen: savedData.has_ever_been_citizen || "no",
                previous_citizenships: savedData.previous_citizenships || [],
                has_permanent_residency_rights: savedData.has_permanent_residency_rights || "no",
                permanent_residencies: savedData.permanent_residencies || [],
        });
    }, [draftSnap.isLoading, draftSnap.draft?.protection_spouse_identity, draftSnap.draft?.profiles_data, activeProfile, profileId, form]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const existing = profileId ? draftStore.draft?.profiles_data?.[profileId]?.identity : draftStore.draft?.protection_spouse_identity;
            const formData = { ...existing, ...form.getValues() };
            const result = profileId
                ? await draftStore.saveProfileSectionData(profileId, "identity", formData)
                : await draftStore.saveSectionData("protection_spouse_identity", formData);

            if (result.success) {
                const pageKey = `${getVisaTypeFromPath(pathname)}/spouse-partner/identity`;
                if (validateIdentityForVisa(formData, "temporary-work").length === 0) {
                    if (profileId) await draftStore.markProfilePageComplete(profileId, pageKey);
                    else await draftStore.markPageComplete(pageKey);
                } else {
                    await draftStore.markPageIncomplete(profileId ? `${pageKey}__${profileId}` : pageKey);
                }
                toast({
                    title: "Draft saved",
                    description: "Your changes have been saved successfully",
                });
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to save changes",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error saving:", error);
            toast({ title: "Error", description: "Failed to save", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const onSubmit = async (values) => {
        const existing = profileId ? draftStore.draft?.profiles_data?.[profileId]?.identity : draftStore.draft?.protection_spouse_identity;
        const data = { ...existing, ...values };
        const identityIssues = validateIdentityForVisa(data, "temporary-work");
        if (identityIssues.length) {
            toast({ title: "Complete identity details", description: identityIssues.join("; "), variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const visaType = getVisaTypeFromPath(pathname);
            const result = profileId
                ? await draftStore.saveProfileSectionData(profileId, "identity", data)
                : await draftStore.saveSectionData("protection_spouse_identity", data);

            if (result.success) {
                let completionResult;
                if (profileId) {
                    completionResult = await draftStore.markProfilePageComplete(profileId, `${visaType}/spouse-partner/identity`);
                } else {
                    completionResult = await draftStore.markPageComplete(`${visaType}/spouse-partner/identity`);
                }

                if (!completionResult.success) {
                    toast({ title: "Error", description: completionResult.error || "Failed to mark complete", variant: "destructive" });
                    return;
                }

                const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
                startNavigation(next);
                if (next) router.push(next);
            } else {
                toast({ title: "Error", description: result.error || "Failed to save", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error submitting:", error);
            toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrevious = () => {
        const visaType = getVisaTypeFromPath(pathname);
        const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
        startNavigation(prev);
        if (prev) router.push(prev);
    };

    return (
        <Card className="rounded-2xl shadow-md bg-white">
            <CardHeader>
                <CardTitle className="text-2xl font-semibold">Spouse / Partner — Identity</CardTitle>
                <p className="text-sm text-gray-600 mt-2">Provide identity documents for the spouse or partner included in this application.</p>
            </CardHeader>
            <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="space-y-8">
                            <IdentityDocumentFields form={form} />
                            <h2 className="text-xl font-bold text-gray-900 pb-2 border-b">Additional Citizenship and Residence Information</h2>

                            {/* Q1: Is Spouse Citizen? */}
                            <div>
                                <Label className="text-base font-bold mb-3 block text-gray-900">
                                    Are you currently a Citizen of any Country?
                                </Label>
                                <RadioGroup
                                    value={isCurrentCitizen}
                                    onValueChange={(value) => form.setValue("is_current_citizen", value)}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="citizen-yes" />
                                        <Label htmlFor="citizen-yes" className="font-normal cursor-pointer">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="citizen-no" />
                                        <Label htmlFor="citizen-no" className="font-normal cursor-pointer">No</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* If YES: Citizenship Table */}
                            {isCurrentCitizen === "yes" && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Citizenships for {spouseName}</h3>
                                    <p className="text-sm text-gray-600 mb-4">Enter details of all citizenships you hold or have previously held.</p>
                                    <RepeaterTable
                                        data={citizenships}
                                        columns={[
                                            { key: "country", label: "Country" },
                                            { key: "how_obtained", label: "How was this Citizenship obtained?" },
                                            { key: "date_obtained", label: "Date Obtained", format: (row) => `${row.date_obtained_day || ""} ${row.date_obtained_month || ""} ${row.date_obtained_year || ""}` },
                                            { key: "still_citizen", label: "Are you still a citizen of this country?", format: (res) => res?.still_citizen === 'yes' ? 'Yes' : 'No' }, // Note: checking key might be tricky if not consistent
                                        ]}
                                        onAdd={(newRow) => {
                                            const updated = [...citizenships, newRow];
                                            form.setValue("citizenships", updated);
                                        }}
                                        onEdit={(index, updatedRow) => {
                                            const updated = [...citizenships];
                                            updated[index] = { ...updated[index], ...updatedRow };
                                            form.setValue("citizenships", updated);
                                        }}
                                        onDelete={(index) => {
                                            const updated = citizenships.filter((_, i) => i !== index);
                                            form.setValue("citizenships", updated);
                                        }}
                                        DialogComponent={CitizenshipDialog}
                                        addButtonText="Add"
                                        testIdPrefix="citizenship"
                                    />
                                </div>
                            )}

                            {/* If NO: Stateless Details */}
                            {isCurrentCitizen === "no" && (
                                <>
                                    <div>
                                        <Label className="text-base font-bold mb-3 block text-gray-900">
                                            You have answered that you are not a Citizen of any Country. You must provide details of how, when and why you are stateless
                                        </Label>
                                        <Textarea
                                            {...form.register("stateless_reason")}
                                            rows={5}
                                            className="w-full"
                                        />
                                        {form.formState.errors.stateless_reason && (
                                            <p className="text-sm text-red-600 mt-1">{form.formState.errors.stateless_reason.message}</p>
                                        )}
                                    </div>

                                    {/* Q2: Has ever been a citizen? - MOVED INSIDE */}
                                    <div>
                                        <Label className="text-base font-bold mb-3 block text-gray-900">
                                            Have you ever been a Citizen of any Country?
                                        </Label>
                                        <RadioGroup
                                            value={hasEverBeenCitizen}
                                            onValueChange={(value) => form.setValue("has_ever_been_citizen", value)}
                                            className="flex gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="yes" id="ever-yes" />
                                                <Label htmlFor="ever-yes" className="font-normal cursor-pointer">Yes</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no" id="ever-no" />
                                                <Label htmlFor="ever-no" className="font-normal cursor-pointer">No</Label>
                                            </div>
                                        </RadioGroup>
                                        {form.formState.errors.has_ever_been_citizen && (
                                            <p className="text-sm text-red-600 mt-1">{form.formState.errors.has_ever_been_citizen.message}</p>
                                        )}
                                    </div>

                                    {/* Previous Citizenships Table - If Q2 is YES */}
                                    {hasEverBeenCitizen === "yes" && (
                                        <div>
                                            <p className="text-sm text-gray-600 mb-4">Enter details of all citizenships you previously held.</p>
                                            <RepeaterTable
                                                data={previousCitizenships}
                                                columns={[
                                                    { key: "country", label: "Country" },
                                                    { key: "how_obtained", label: "How was this Citizenship obtained?" },
                                                    { key: "date_obtained", label: "Date Obtained", format: (row) => `${row.date_obtained_day || ""} ${row.date_obtained_month || ""} ${row.date_obtained_year || ""}` },
                                                    { key: "still_citizen", label: "Are you still a citizen of this country?", format: (res) => res?.still_citizen === 'yes' ? 'Yes' : 'No' },
                                                ]}
                                                onAdd={(newRow) => {
                                                    const updated = [...previousCitizenships, newRow];
                                                    form.setValue("previous_citizenships", updated);
                                                }}
                                                onEdit={(index, updatedRow) => {
                                                    const updated = [...previousCitizenships];
                                                    updated[index] = { ...updated[index], ...updatedRow };
                                                    form.setValue("previous_citizenships", updated);
                                                }}
                                                onDelete={(index) => {
                                                    const updated = previousCitizenships.filter((_, i) => i !== index);
                                                    form.setValue("previous_citizenships", updated);
                                                }}
                                                DialogComponent={CitizenshipDialog}
                                                addButtonText="Add"
                                                testIdPrefix="prev-citizenship"
                                            />
                                            {form.formState.errors.previous_citizenships && (
                                                <p className="text-sm text-red-600 mt-1">{form.formState.errors.previous_citizenships.message}</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}


                            {/* Q3: Permanent Residency Rights */}
                            <div>
                                <Label className="text-base font-bold mb-3 block text-gray-900">
                                    Do you have the right to permanently reside in any country of which you are not a citizen?
                                </Label>
                                <RadioGroup
                                    value={hasPR}
                                    onValueChange={(value) => form.setValue("has_permanent_residency_rights", value)}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="pr-yes" />
                                        <Label htmlFor="pr-yes" className="font-normal cursor-pointer">Yes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="pr-no" />
                                        <Label htmlFor="pr-no" className="font-normal cursor-pointer">No</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* If YES: PR Table */}
                            {hasPR === "yes" && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-4">Enter details of all countries where you hold permanent residency.</p>
                                    <RepeaterTable
                                        data={permanentResidencies}
                                        columns={[
                                            { key: "country", label: "Country" },
                                        ]}
                                        onAdd={(newRow) => {
                                            const updated = [...permanentResidencies, newRow];
                                            form.setValue("permanent_residencies", updated);
                                        }}
                                        onEdit={(index, updatedRow) => {
                                            const updated = [...permanentResidencies];
                                            updated[index] = { ...updated[index], ...updatedRow };
                                            form.setValue("permanent_residencies", updated);
                                        }}
                                        onDelete={(index) => {
                                            const updated = permanentResidencies.filter((_, i) => i !== index);
                                            form.setValue("permanent_residencies", updated);
                                        }}
                                        DialogComponent={ResidencyDialog}
                                        addButtonText="Add"
                                        testIdPrefix="pr"
                                    />
                                </div>
                            )}

                        </div>

                        <div className="mt-8 pt-6 border-t">
                            <FormNavigation
                                nextLabel="Continue"
                                onPrev={handlePrevious}
                                onNext={form.handleSubmit(onSubmit)}
                                onSave={handleSave}
                                loading={isSaving}
                                submitting={isSubmitting}
                                disabledNext={!form.formState.isValid}
                            />
                        </div>
                    </form>
            </CardContent>
        </Card>
    );
}
