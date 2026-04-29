"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { buildIntakeHref, getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StickyNav } from "@/components/StickyNav";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { FormNavigation } from "@/components/FormNavigation";

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 110 }, (_, i) => String(new Date().getFullYear() - i));

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

const OBTAINED_METHODS = [
    "Birth",
    "Descent",
    "Naturalisation",
    "Grant",
    "Adoption",
    "Other"
];

const CEASED_REASONS = [
    "Renounced",
    "Revoked",
    "Expired",
    "Other"
];

// Dialog for Citizenships
function CitizenshipDialog({ editingRow, onSave, onCancel }) {
    const dialogFormSchema = z.object({
        country: z.string().min(1, "Country is required"),
        how_obtained: z.string().min(1, "Method obtained is required"),
        date_obtained_day: z.string().min(1, "Day is required"),
        date_obtained_month: z.string().min(1, "Month is required"),
        date_obtained_year: z.string().min(1, "Year is required"),
        still_citizen: z.string().optional(),
        date_ceased_day: z.string().optional(),
        date_ceased_month: z.string().optional(),
        date_ceased_year: z.string().optional(),
        ceased_reason: z.string().optional(),
    }).superRefine((data, ctx) => {
        if (data.still_citizen === "no") {
            if (!data.date_ceased_day || !data.date_ceased_month || !data.date_ceased_year) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Date ceased is incomplete",
                    path: ["date_ceased_day"], // Mark day as error target
                });
            }
            if (!data.ceased_reason) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Reason is required",
                    path: ["ceased_reason"],
                });
            }
        }
    });

    const dialogForm = useForm({
        resolver: zodResolver(dialogFormSchema),
        defaultValues: editingRow || {
            country: "",
            how_obtained: "",
            date_obtained_day: "",
            date_obtained_month: "",
            date_obtained_year: "",
            still_citizen: "yes",
            date_ceased_day: "",
            date_ceased_month: "",
            date_ceased_year: "",
            ceased_reason: "",
        }
    });

    const stillCitizen = dialogForm.watch("still_citizen");

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
                <div className="border-b pb-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Citizenship</h3>
                    <p className="text-sm text-gray-600">Enter details of Citizenship that your Spouse/Partner holds or has previously held</p>
                </div>

                <div>
                    <Label className="mb-2 block font-semibold text-gray-700">Country of Citizenship</Label>
                    <Select
                        value={dialogForm.watch("country")}
                        onValueChange={(value) => dialogForm.setValue("country", value)}
                    >
                        <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder="Choose Country" />
                        </SelectTrigger>
                        <SelectContent>
                            {COUNTRIES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {dialogForm.formState.errors.country && (
                        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
                    )}
                </div>

                <div>
                    <Label className="mb-2 block font-semibold text-gray-700">How was this Citizenship obtained?</Label>
                    <Select
                        value={dialogForm.watch("how_obtained")}
                        onValueChange={(value) => dialogForm.setValue("how_obtained", value)}
                    >
                        <SelectTrigger data-testid="select-how-obtained">
                            <SelectValue placeholder="Choose Reason" />
                        </SelectTrigger>
                        <SelectContent>
                            {OBTAINED_METHODS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {dialogForm.formState.errors.how_obtained && (
                        <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.how_obtained.message}</p>
                    )}
                </div>

                <div>
                    <Label className="mb-2 block font-semibold text-gray-700">Date Obtained</Label>
                    <div className="grid grid-cols-3 gap-2">
                        <Select
                            value={dialogForm.watch("date_obtained_day")}
                            onValueChange={(value) => dialogForm.setValue("date_obtained_day", value)}
                        >
                            <SelectTrigger data-testid="select-date-day">
                                <SelectValue placeholder="Choose Day" />
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS.map((day) => (
                                    <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={dialogForm.watch("date_obtained_month")}
                            onValueChange={(value) => dialogForm.setValue("date_obtained_month", value)}
                        >
                            <SelectTrigger data-testid="select-date-month">
                                <SelectValue placeholder="Choose Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {MONTHS.map((month) => (
                                    <SelectItem key={month} value={month}>{month}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={dialogForm.watch("date_obtained_year")}
                            onValueChange={(value) => dialogForm.setValue("date_obtained_year", value)}
                        >
                            <SelectTrigger data-testid="select-date-year">
                                <SelectValue placeholder="Choose Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {YEARS.map((year) => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {(dialogForm.formState.errors.date_obtained_day || dialogForm.formState.errors.date_obtained_month || dialogForm.formState.errors.date_obtained_year) && (
                        <p className="text-sm text-red-600 mt-1">Date is incomplete</p>
                    )}
                </div>

                <div>
                    <Label className="mb-2 block font-semibold text-gray-700">Is your Spouse/Partner still a Citizen of this country?</Label>
                    <RadioGroup
                        value={stillCitizen}
                        onValueChange={(value) => dialogForm.setValue("still_citizen", value)}
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="still-yes" />
                            <Label htmlFor="still-yes" className="font-normal cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="still-no" />
                            <Label htmlFor="still-no" className="font-normal cursor-pointer">No</Label>
                        </div>
                    </RadioGroup>
                </div>

                {stillCitizen === "no" && (
                    <>
                        <div>
                            <Label className="mb-2 block font-semibold text-gray-700">Date Ceased</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <Select
                                    value={dialogForm.watch("date_ceased_day")}
                                    onValueChange={(value) => dialogForm.setValue("date_ceased_day", value)}
                                >
                                    <SelectTrigger data-testid="select-ceased-day">
                                        <SelectValue placeholder="Choose Day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS.map((day) => (
                                            <SelectItem key={day} value={day}>{day}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={dialogForm.watch("date_ceased_month")}
                                    onValueChange={(value) => dialogForm.setValue("date_ceased_month", value)}
                                >
                                    <SelectTrigger data-testid="select-ceased-month">
                                        <SelectValue placeholder="Choose Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((month) => (
                                            <SelectItem key={month} value={month}>{month}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={dialogForm.watch("date_ceased_year")}
                                    onValueChange={(value) => dialogForm.setValue("date_ceased_year", value)}
                                >
                                    <SelectTrigger data-testid="select-ceased-year">
                                        <SelectValue placeholder="Choose Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {YEARS.map((year) => (
                                            <SelectItem key={year} value={year}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {(dialogForm.formState.errors.date_ceased_day || dialogForm.formState.errors.date_ceased_month || dialogForm.formState.errors.date_ceased_year) && (
                                <p className="text-sm text-red-600 mt-1">Date ceased is incomplete</p>
                            )}
                        </div>

                        <div>
                            <Label className="mb-2 block font-semibold text-gray-700">Reason</Label>
                            <Select
                                value={dialogForm.watch("ceased_reason")}
                                onValueChange={(value) => dialogForm.setValue("ceased_reason", value)}
                            >
                                <SelectTrigger data-testid="select-ceased-reason">
                                    <SelectValue placeholder="Choose Reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CEASED_REASONS.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {dialogForm.formState.errors.ceased_reason && (
                                <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.ceased_reason.message}</p>
                            )}
                        </div>
                    </>
                )}
            </div>

            <DialogFooter>
                <div className="flex justify-end gap-2 w-full">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit">Ok</Button>
                </div>
            </DialogFooter>
        </form>
    );
}

// Dialog for Permanent Residencies
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
                            {COUNTRIES.map((c) => (
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
                    <Button type="submit" className="bg-[#285646] hover:bg-[#1e4136] text-white">Add</Button>
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                </div>
            </DialogFooter>
        </form>
    );
}

export default function IdentityPage() {
    const router = useRouter();
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
    const spouseDetails = draft.protection_spouse_partner?.details || {};
    const spouseName = spouseDetails.given_names
        ? `${spouseDetails.given_names} ${spouseDetails.family_name || ''}`.trim()
        : "Spouse/Partner";

    useEffect(() => {
        const savedData = draft.protection_spouse_identity || {};
        if (Object.keys(savedData).length > 0) {
            form.reset(savedData);
        }
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formData = form.getValues();
            const result = await draftStore.saveSectionData("protection_spouse_identity", formData);

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
        } catch (error) {
            console.error("Error saving:", error);
            toast({ title: "Error", description: "Failed to save", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            await draftStore.saveSectionData("protection_spouse_identity", data);
            const visaType = getVisaTypeFromPath(pathname);
            await draftStore.markPageComplete(`${visaType}/spouse-partner/identity`);

            // Manual navigation since getNextRoute might depend on exact array order
            router.push(buildIntakeHref({
                appId: draftStore.currentApplicationId,
                internalHref: "/intake/protection/children",
                visaType,
            }));
        } catch (error) {
            console.error("Error submitting:", error);
            toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrevious = () => {
        router.push(buildIntakeHref({
            appId: draftStore.currentApplicationId,
            internalHref: "/intake/protection/spouse-partner/other-details",
            visaType: getVisaTypeFromPath(pathname),
        }));
    };

    return (
        <div className="min-h-screen bg-[#E0E7FF]">


            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="space-y-8">

                            {/* Q1: Is Spouse Citizen? */}
                            <div>
                                <Label className="text-base font-bold mb-3 block text-gray-900">
                                    Is your Spouse/Partner currently a Citizen of any Country?
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
                                    <p className="text-sm text-gray-600 mb-4">Enter details of all Citizenships that your Spouse/Partner hold or have previously held</p>
                                    <RepeaterTable
                                        data={citizenships}
                                        columns={[
                                            { key: "country", label: "Country" },
                                            { key: "how_obtained", label: "How was this Citizenship obtained?" },
                                            { key: "date_obtained", label: "Date Obtained", format: (row) => `${row.date_obtained_day} ${row.date_obtained_month} ${row.date_obtained_year}` },
                                            { key: "still_citizen", label: "Is your Spouse/Partner still a Citizen of this Country?", format: (res) => res?.still_citizen === 'yes' ? 'Yes' : 'No' }, // Note: checking key might be tricky if not consistent
                                        ]}
                                        onAdd={(newRow) => {
                                            const updated = [...citizenships, newRow];
                                            form.setValue("citizenships", updated);
                                        }}
                                        onEdit={(index, updatedRow) => {
                                            const updated = [...citizenships];
                                            updated[index] = updatedRow;
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
                                            You have answered that your Spouse/Partner is not a Citizen of any country. You must provide details of how, when and why they are stateless
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
                                            Has your Spouse/Partner ever been a Citizen of any Country?
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
                                            <p className="text-sm text-gray-600 mb-4">Enter details of all Citizenships that your Spouse/Partner previously held</p>
                                            <RepeaterTable
                                                data={previousCitizenships}
                                                columns={[
                                                    { key: "country", label: "Country" },
                                                    { key: "how_obtained", label: "How was this Citizenship obtained?" },
                                                    { key: "date_obtained", label: "Date Obtained", format: (row) => `${row.date_obtained_day} ${row.date_obtained_month} ${row.date_obtained_year}` },
                                                    { key: "still_citizen", label: "Is your Spouse/Partner still a Citizen of this Country?", format: (res) => res?.still_citizen === 'yes' ? 'Yes' : 'No' },
                                                ]}
                                                onAdd={(newRow) => {
                                                    const updated = [...previousCitizenships, newRow];
                                                    form.setValue("previous_citizenships", updated);
                                                }}
                                                onEdit={(index, updatedRow) => {
                                                    const updated = [...previousCitizenships];
                                                    updated[index] = updatedRow;
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
                                    Does your spouse have the right to permanently reside in any country of which they are not a citizen?
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
                                    <p className="text-sm text-gray-600 mb-4">Enter details of all countries that your spouse holds permanent residency for</p>
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
                                            updated[index] = updatedRow;
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
