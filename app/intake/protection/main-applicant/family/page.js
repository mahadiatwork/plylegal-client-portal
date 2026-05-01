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
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FormNavigation } from "@/components/FormNavigation";
import { Loader2 } from "lucide-react";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 110 }, (_, i) => String(new Date().getFullYear() - i));

const RELATIONSHIPS = [
    "Spouse/Partner",
    "Parent",
    "Step-Parent",
    "Sibling",
    "Step-Sister/Step-Brother",
    "Child",
    "Step-Child",
    "Adopted Child",
    "Guardian",
    "Other"
];

function FamilyMemberDialog({ editingRow, onSave, onCancel, mainApplicantName }) {
    const dialogFormSchema = z.object({
        family_name: z.string().min(1, "Family Name is required"),
        given_names: z.string().min(1, "Given Names is required"),
        gender: z.enum(["Male", "Female", "Other"], {
            required_error: "Gender is required",
        }),
        birth_day: z.string().min(1, "Day is required"),
        birth_month: z.string().min(1, "Month is required"),
        birth_year: z.string().min(1, "Year is required"),
        relationship: z.string().min(1, "Relationship is required"),
    });

    const dialogForm = useForm({
        resolver: zodResolver(dialogFormSchema),
        defaultValues: editingRow || {
            family_name: "",
            given_names: "",
            gender: "",
            birth_day: "",
            birth_month: "",
            birth_year: "",
            relationship: "",
        }
    });

    const gender = dialogForm.watch("gender");

    const handleSubmit = (data) => {
        onSave(data);
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
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Details</h3>

                <div>
                    <Label htmlFor="family_name" className="mb-2 block font-semibold text-gray-700">Family Name</Label>
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
                    <Label htmlFor="given_names" className="mb-2 block font-semibold text-gray-700">Given Names</Label>
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
                    <Label className="mb-2 block font-semibold text-gray-700">Gender</Label>
                    <RadioGroup
                        value={gender}
                        onValueChange={(value) => dialogForm.setValue("gender", value)}
                        className="flex gap-4"
                        data-testid="radio-gender"
                    >
                        {["Male", "Female", "Other"].map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`gender-${option.toLowerCase()}`} />
                                <Label htmlFor={`gender-${option.toLowerCase()}`} className="font-normal cursor-pointer">
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
                    <Label className="mb-2 block font-semibold text-gray-700">Date of Birth</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <Select
                            value={dialogForm.watch("birth_day")}
                            onValueChange={(value) => dialogForm.setValue("birth_day", value)}
                        >
                            <SelectTrigger data-testid="select-birth-day">
                                <SelectValue placeholder="Choose Day" />
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS.map((day) => (
                                    <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={dialogForm.watch("birth_month")}
                            onValueChange={(value) => dialogForm.setValue("birth_month", value)}
                        >
                            <SelectTrigger data-testid="select-birth-month">
                                <SelectValue placeholder="Choose Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((month) => (
                                    <SelectItem key={month} value={month}>{month}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={dialogForm.watch("birth_year")}
                            onValueChange={(value) => dialogForm.setValue("birth_year", value)}
                        >
                            <SelectTrigger data-testid="select-birth-year">
                                <SelectValue placeholder="Choose Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map((year) => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {(dialogForm.formState.errors.birth_day || dialogForm.formState.errors.birth_month || dialogForm.formState.errors.birth_year) && (
                        <p className="text-sm text-red-600 mt-1">Date of birth is incomplete</p>
                    )}
                </div>

                <div>
                    <Label className="mb-2 block font-semibold text-gray-700">
                        This person is the Main Applicant ({mainApplicantName})'s: <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={dialogForm.watch("relationship")}
                        onValueChange={(value) => dialogForm.setValue("relationship", value)}
                    >
                        <SelectTrigger data-testid="select-relationship">
                            <SelectValue placeholder="Choose Relationship Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {RELATIONSHIPS.map((rel) => (
                                <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {dialogForm.formState.errors.relationship && (
                        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.relationship.message}</p>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
                    Cancel
                </Button>
                <Button type="submit" className="bg-[#285646] hover:bg-[#1e4136] text-white" data-testid="button-ok">Ok</Button>
            </DialogFooter>
        </form>
    );
}

export default function FamilyPage() {
    const router = useRouter();
  const { startNavigation } = useNavigationLoading();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const draftSnap = useSnapshot(draftStore);
    const draft = draftSnap.draft;
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const appIdFromUrl = searchParams.get('applicationId');
        if (appIdFromUrl && appIdFromUrl !== draftStore.currentApplicationId) {
            draftStore.setApplicationId(appIdFromUrl);
            draftStore.loadDraft(appIdFromUrl);
        }
    }, [searchParams]);

    const form = useForm({
        defaultValues: {
            has_children: "no",
            family_members: [],
        }
    });

    const hasChildren = form.watch("has_children");
    const familyMembers = form.watch("family_members") || [];

    // Get Main Applicant Name
    const mainApplicant = draft.protection_main_applicant?.details || {};
    const mainApplicantName = mainApplicant.given_names
        ? `${mainApplicant.given_names} ${mainApplicant.family_name || ''}`.trim()
        : "Main Applicant";

    useEffect(() => {
        const savedData = draft.protection_family || {};
        if (Object.keys(savedData).length > 0) {
            form.reset(savedData);
        }
    }, []);

    const handleSave = async () => {
        const formData = form.getValues();
        const result = await draftStore.saveSectionData("protection_family", formData);

        if (result.success) {
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
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            await draftStore.saveSectionData("protection_family", data);
            const visaType = getVisaTypeFromPath(pathname);
            await draftStore.markPageComplete(`${visaType}/main-applicant/family`);
            const nextRoute = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
            if (nextRoute) {
                startNavigation(nextRoute);
                router.push(nextRoute);
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
        const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
        if (previousRoute) {
            startNavigation(previousRoute);
            router.push(previousRoute);
        }
    };

    return (
        <div className="min-h-screen bg-[#E0E7FF]">


            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="space-y-8">
                            {/* Question */}
                            <div>
                                <Label className="text-base font-bold mb-3 block text-gray-900">
                                    Does the Main Applicant ({mainApplicantName}) have any Children, Step Children, or Adopted Children?
                                </Label>
                                <RadioGroup
                                    value={hasChildren}
                                    onValueChange={(value) => form.setValue("has_children", value)}
                                    className="flex gap-4"
                                    data-testid="radio-has-children"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="yes" id="children-yes" />
                                        <Label htmlFor="children-yes" className="font-normal cursor-pointer">
                                            Yes
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="no" id="children-no" />
                                        <Label htmlFor="children-no" className="font-normal cursor-pointer">
                                            No
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Family Members Table */}
                            <div>
                                <div className="text-gray-700 mb-4 space-y-1">
                                    <p>Enter details about all of the Main Applicant ({mainApplicantName})'s:</p>
                                    <ul className="list-disc pl-6 space-y-1">
                                        <li>Spouse/Partner (if applicable); and</li>
                                        <li>Parents (including Step-Parents); and</li>
                                        <li>Siblings (including Step-Sisters/Step-Brothers); and</li>
                                        <li>Children (including children from a previous relationship, Step-Children and Adopted Children)</li>
                                        <li>Guardians (include any other person who has, or will have, custody or guardianship of this person)</li>
                                    </ul>
                                    <p className="mt-2">Please include details even if the family member is no longer alive.</p>
                                </div>

                                <RepeaterTable
                                    data={familyMembers}
                                    columns={[
                                        { key: "name", label: "Name", format: (row) => `${row.given_names} ${row.family_name}` },
                                        { key: "dob", label: "Date of Birth", format: (row) => `${row.birth_day} ${row.birth_month} ${row.birth_year}` },
                                        { key: "relationship", label: "Relationship" },
                                        { key: "edit", label: "Edit Relationship" }, // RepeaterTable usually handles edit automatically, but we customize label
                                    ]}
                                    onAdd={(newRow) => {
                                        const updated = [...familyMembers, newRow];
                                        form.setValue("family_members", updated);
                                    }}
                                    onEdit={(index, updatedRow) => {
                                        const updated = [...familyMembers];
                                        updated[index] = updatedRow;
                                        form.setValue("family_members", updated);
                                    }}
                                    onDelete={(index) => {
                                        const updated = familyMembers.filter((_, i) => i !== index);
                                        form.setValue("family_members", updated);
                                    }}
                                    DialogComponent={(props) => <FamilyMemberDialog {...props} mainApplicantName={mainApplicantName} />}
                                    addButtonText="Add"
                                    testIdPrefix="family-member"
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t">
                            <FormNavigation
                                onPrev={handlePrevious}
                                onNext={form.handleSubmit(onSubmit)}
                                onSave={handleSave}
                                loading={isSaving}
                                submitting={isSubmitting}
                                disabledNext={!form.formState.isValid}
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
