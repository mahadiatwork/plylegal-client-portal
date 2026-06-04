"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { RepeaterTable } from "@/components/RepeaterTable";
import { DialogFooter } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";

// ─── Constants ────────────────────────────────────────────────────────
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const YEARS = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));
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
    "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const formatDate = (day, month, year) => {
    if (!day || !month || !year) return "";
    return `${day} ${month} ${year}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatCoverageDate = (date) =>
    `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

const todayOnly = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const addYears = (date, years) => {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
};

function monthIndex(value) {
    const raw = String(value || "").trim();
    if (!raw) return -1;
    if (/^\d+$/.test(raw)) {
        const month = Number.parseInt(raw, 10);
        return month >= 1 && month <= 12 ? month - 1 : -1;
    }
    return MONTHS.findIndex((month) => month.toLowerCase() === raw.toLowerCase());
}

function parseResidenceDate(day, month, year) {
    const parsedDay = Number.parseInt(String(day || ""), 10);
    const parsedYear = Number.parseInt(String(year || ""), 10);
    const parsedMonth = monthIndex(month);
    if (!parsedDay || parsedMonth < 0 || !parsedYear) return null;

    const date = new Date(parsedYear, parsedMonth, parsedDay);
    if (
        date.getFullYear() !== parsedYear ||
        date.getMonth() !== parsedMonth ||
        date.getDate() !== parsedDay
    ) {
        return null;
    }
    return date;
}

function rowBelongsToApplicant(row, applicant) {
    const saved = String(row?.applicant_name || "").trim();
    if (!saved) return false;
    return [applicant.value, applicant.label, applicant.id].filter(Boolean).some((token) => saved === token);
}

function applicantLabelForValue(value, applicants) {
    const saved = String(value || "").trim();
    const applicant = applicants.find((item) =>
        [item.value, item.label, item.id].filter(Boolean).some((token) => token === saved)
    );
    return applicant?.label || saved;
}

function applicantCoverageStart(applicant, today) {
    const tenYearsAgo = new Date(today);
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const dob = parseResidenceDate(applicant.birth_day, applicant.birth_month, applicant.birth_year);
    if (!dob) return tenYearsAgo;

    const sixteenthBirthday = addYears(dob, 16);
    return sixteenthBirthday > tenYearsAgo ? sixteenthBirthday : tenYearsAgo;
}

function parseResidenceInterval(row, today) {
    const start = parseResidenceDate(row.date_from_day, row.date_from_month, row.date_from_year);
    if (!start) return { error: "Date From is incomplete or invalid." };

    const toValues = [row.date_to_day, row.date_to_month, row.date_to_year].map((value) => String(value || "").trim());
    const filledToValues = toValues.filter(Boolean).length;
    let end = today;

    if (filledToValues > 0 && filledToValues < 3) {
        return { error: "Date To is incomplete." };
    }

    if (filledToValues === 3) {
        end = parseResidenceDate(row.date_to_day, row.date_to_month, row.date_to_year);
        if (!end) return { error: "Date To is invalid." };
    }

    if (end < start) {
        return { error: "Date To cannot be before Date From." };
    }

    return { start, end };
}

function validateResidenceCoverage(records, applicants) {
    if (!applicants.length) return null;

    const today = todayOnly();
    const issues = [];

    applicants.forEach((applicant) => {
        const requiredStart = applicantCoverageStart(applicant, today);
        if (requiredStart > today) return;

        const intervals = [];
        const applicantRows = (records || []).filter((row) => rowBelongsToApplicant(row, applicant));

        applicantRows.forEach((row) => {
            const parsed = parseResidenceInterval(row, today);
            if (parsed.error) {
                issues.push(`${applicant.label}: ${parsed.error}`);
                return;
            }
            if (parsed.end < requiredStart || parsed.start > today) return;
            intervals.push({
                start: parsed.start < requiredStart ? requiredStart : parsed.start,
                end: parsed.end > today ? today : parsed.end,
            });
        });

        if (!intervals.length) {
            issues.push(`${applicant.label}: add residence records from ${formatCoverageDate(requiredStart)} to today.`);
            return;
        }

        intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
        let coveredEnd = null;

        intervals.forEach((interval) => {
            if (!coveredEnd) {
                if (interval.start > requiredStart) {
                    issues.push(`${applicant.label}: coverage must start by ${formatCoverageDate(requiredStart)}.`);
                }
                coveredEnd = interval.end;
                return;
            }

            if (interval.start.getTime() > coveredEnd.getTime() + MS_PER_DAY) {
                issues.push(
                    `${applicant.label}: gap between ${formatCoverageDate(addDays(coveredEnd, 1))} and ${formatCoverageDate(addDays(interval.start, -1))}.`
                );
            }

            if (interval.end > coveredEnd) {
                coveredEnd = interval.end;
            }
        });

        if (coveredEnd && coveredEnd < today) {
            issues.push(`${applicant.label}: coverage must continue through today.`);
        }
    });

    if (!issues.length) return null;
    return `Residence history must cover the full 10-year/since-16 period. ${issues.join(" ")}`;
}

// ─── Residence Dialog ─────────────────────────────────────────────────
function ResidenceDialog({ editingRow, onSave, onCancel, applicants = [] }) {
    const dialogFormSchema = z.object({
        applicant_name: z.string().min(1, "Please select an applicant"),
        date_from_day: z.string().min(1, "Day is required"),
        date_from_month: z.string().min(1, "Month is required"),
        date_from_year: z.string().min(1, "Year is required"),
        date_to_day: z.string().optional(),
        date_to_month: z.string().optional(),
        date_to_year: z.string().optional(),
        country: z.string().min(1, "Country is required"),
        address1: z.string().min(1, "Address is required"),
        address2: z.string().optional(),
        suburb: z.string().min(1, "Suburb / Town is required"),
        state: z.string().optional(),
        postcode: z.string().optional(),
    });

    const dialogForm = useForm({
        resolver: zodResolver(dialogFormSchema),
        defaultValues: editingRow || {
            applicant_name: "",
            date_from_day: "",
            date_from_month: "",
            date_from_year: "",
            date_to_day: "",
            date_to_month: "",
            date_to_year: "",
            country: "",
            address1: "",
            address2: "",
            suburb: "",
            state: "",
            postcode: "",
        },
    });

    const handleSubmit = (data) => {
        onSave(data);
        dialogForm.reset();
    };

    return (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <h3 className="text-base font-bold text-gray-900 mb-2">Details of country of residence</h3>
            <p className="text-sm text-gray-500 mb-4">
                Select the applicant that these details apply to.
            </p>

            {/* Applicant Name */}
            <div>
                <Label className="mb-2 block">Name</Label>
                <Select
                    value={dialogForm.watch("applicant_name")}
                    onValueChange={(value) => dialogForm.setValue("applicant_name", value)}
                >
                    <SelectTrigger data-testid="select-applicant-name">
                        <SelectValue placeholder="Choose Applicant" />
                    </SelectTrigger>
                    <SelectContent>
                        {applicants.length === 0 ? (
                            <SelectItem value="__none__" disabled>No applicants found</SelectItem>
                        ) : (
                            applicants.map((a) => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
                {dialogForm.formState.errors.applicant_name && (
                    <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.applicant_name.message}</p>
                )}
            </div>

            {/* Date From */}
            <div>
                <Label className="mb-2 block">Date from</Label>
                <div className="grid grid-cols-3 gap-2">
                    <Select
                        value={dialogForm.watch("date_from_day")}
                        onValueChange={(v) => dialogForm.setValue("date_from_day", v)}
                    >
                        <SelectTrigger data-testid="select-from-day">
                            <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                            {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select
                        value={dialogForm.watch("date_from_month")}
                        onValueChange={(v) => dialogForm.setValue("date_from_month", v)}
                    >
                        <SelectTrigger data-testid="select-from-month">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select
                        value={dialogForm.watch("date_from_year")}
                        onValueChange={(v) => dialogForm.setValue("date_from_year", v)}
                    >
                        <SelectTrigger data-testid="select-from-year">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {dialogForm.formState.errors.date_from_day && (
                    <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_from_day.message}</p>
                )}
            </div>

            {/* Date To */}
            <div>
                <Label className="mb-2 block">Date to <span className="text-gray-400 font-normal">(&apos;Date to&apos; may be left blank if this address is current)</span></Label>
                <div className="grid grid-cols-3 gap-2">
                    <Select
                        value={dialogForm.watch("date_to_day")}
                        onValueChange={(v) => dialogForm.setValue("date_to_day", v)}
                    >
                        <SelectTrigger data-testid="select-to-day">
                            <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                            {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select
                        value={dialogForm.watch("date_to_month")}
                        onValueChange={(v) => dialogForm.setValue("date_to_month", v)}
                    >
                        <SelectTrigger data-testid="select-to-month">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select
                        value={dialogForm.watch("date_to_year")}
                        onValueChange={(v) => dialogForm.setValue("date_to_year", v)}
                    >
                        <SelectTrigger data-testid="select-to-year">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Residential Address */}
            <h4 className="text-sm font-semibold text-gray-800 pt-2">Residential address</h4>

            {/* Country */}
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
                        {COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {dialogForm.formState.errors.country && (
                    <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.country.message}</p>
                )}
            </div>

            {/* Address */}
            <div>
                <Label htmlFor="address1" className="mb-2 block">Address</Label>
                <Input
                    id="address1"
                    {...dialogForm.register("address1")}
                    placeholder="Street number and name"
                    data-testid="input-address1"
                />
                {dialogForm.formState.errors.address1 && (
                    <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.address1.message}</p>
                )}
            </div>

            {/* Suburb / Town */}
            <div>
                <Label htmlFor="suburb" className="mb-2 block">Suburb / Town</Label>
                <Input
                    id="suburb"
                    {...dialogForm.register("suburb")}
                    placeholder="Suburb or town"
                    data-testid="input-suburb"
                />
                {dialogForm.formState.errors.suburb && (
                    <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.suburb.message}</p>
                )}
            </div>

            {/* State / Territory */}
            <div>
                <Label htmlFor="state" className="mb-2 block">State / Territory</Label>
                <Input
                    id="state"
                    {...dialogForm.register("state")}
                    placeholder="State"
                    data-testid="input-state"
                />
            </div>

            {/* Postcode */}
            <div>
                <Label htmlFor="postcode" className="mb-2 block">Postcode</Label>
                <Input
                    id="postcode"
                    {...dialogForm.register("postcode")}
                    placeholder="Postcode"
                    data-testid="input-postcode"
                />
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

// ─── Main Page ────────────────────────────────────────────────────────
export default function Page() {
    const router = useRouter();
  const { startNavigation } = useNavigationLoading();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const visaType = getVisaTypeFromPath(pathname);
    const { toast } = useToast();
    const draftSnap = useSnapshot(draftStore);
    const [isSaving, setIsSaving] = useState(false);
    const [coverageError, setCoverageError] = useState("");

    useEffect(() => {
        const appIdFromUrl = searchParams.get("applicationId");
        if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
            draftStore.setApplicationId(appIdFromUrl);
            draftStore.loadDraft(appIdFromUrl);
        }
    }, [searchParams, draftSnap.currentApplicationId]);

    const form = useForm({
        defaultValues: {
            residence_records: [],
        },
    });

    const residenceRecords = form.watch("residence_records") || [];

    // ── Hydrate from draft ───────────────────────────────────────────────
    useEffect(() => {
        const savedData = draftSnap.draft?.temporary_work_countries_of_residence || {};
        if (Object.keys(savedData).length > 0 && savedData.residence_records) {
            form.setValue("residence_records", savedData.residence_records);
        }
    }, [draftSnap.draft?.temporary_work_countries_of_residence, form]);

    // ── Build applicants list ────────────────────────────────────────────
    const applicants = useMemo(() => {
        const profiles = draftSnap.draft?.profiles || [];
        if (profiles.length > 0) {
            return profiles.map((p) => {
                const fullName = [p.given_names, p.family_name].filter(Boolean).join(" ");
                return {
                    label: fullName.trim() || "Unnamed",
                    value: fullName.trim() || "Unnamed",
                    id: p.id,
                    birth_day: p.birth_day || "",
                    birth_month: p.birth_month || "",
                    birth_year: p.birth_year || "",
                };
            });
        }

        // Fallback for backward compatibility if profiles array is empty
        const list = [];
        const mainDetails = draftSnap.draft?.temporary_work_details;
        if (mainDetails) {
            const fullName = [mainDetails.given_names, mainDetails.family_name].filter(Boolean).join(" ");
            if (fullName.trim()) {
                list.push({
                    label: fullName.trim(),
                    value: fullName.trim(),
                    id: "legacy_main",
                    birth_day: mainDetails.birth_day || "",
                    birth_month: mainDetails.birth_month || "",
                    birth_year: mainDetails.birth_year || "",
                });
            }
        }

        const spouseDetails = draftSnap.draft?.temporary_work_spouse_details;
        if (spouseDetails) {
            const fullName = [spouseDetails.given_names, spouseDetails.family_name].filter(Boolean).join(" ");
            if (fullName.trim()) {
                list.push({
                    label: `${fullName.trim()} (Spouse/Partner)`,
                    value: fullName.trim(),
                    id: "legacy_spouse",
                    birth_day: spouseDetails.birth_day || "",
                    birth_month: spouseDetails.birth_month || "",
                    birth_year: spouseDetails.birth_year || "",
                });
            }
        }

        const childrenData = draftSnap.draft?.temporary_work_children;
        if (childrenData?.children && Array.isArray(childrenData.children)) {
            childrenData.children
                .filter((child) => child.included_in_application === "Yes")
                .forEach((child, index) => {
                    const fullName = [child.given_names, child.family_name].filter(Boolean).join(" ");
                    if (fullName.trim()) {
                        list.push({
                            label: `${fullName.trim()} (Child)`,
                            value: fullName.trim(),
                            id: `legacy_child_${index}`,
                            birth_day: child.birth_day || "",
                            birth_month: child.birth_month || "",
                            birth_year: child.birth_year || "",
                        });
                    }
                });
        }

        return list;
    }, [
        draftSnap.draft?.profiles,
        draftSnap.draft?.temporary_work_details,
        draftSnap.draft?.temporary_work_spouse_details,
        draftSnap.draft?.temporary_work_children,
    ]);

    // ── Memoized wrapped dialog ──────────────────────────────────────────
    const ResidenceDialogWithApplicants = useMemo(
        () =>
            function WrappedResidenceDialog(props) {
                return <ResidenceDialog {...props} applicants={applicants} />;
            },
        [applicants]
    );

    const onSubmit = async (data) => {
        setIsSaving(true);
        try {
            const validationError = validateResidenceCoverage(data.residence_records || [], applicants);
            if (validationError) {
                setCoverageError(validationError);
                toast({
                    title: "Residence history incomplete",
                    description: validationError,
                    variant: "destructive",
                });
                return;
            }
            setCoverageError("");
            await draftStore.saveSectionData("temporary_work_countries_of_residence", data);
            await draftStore.markPageComplete(
                `${visaType}/all-applicants/countries-of-residence`,
                null,
                "temporary_work_countries_of_residence"
            );
            const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
            startNavigation(next);
            if (next) router.push(next);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrevious = () => {
        const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
        startNavigation(prev);
        if (prev) router.push(prev);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const values = form.getValues();
            const result = await draftStore.saveSectionData("temporary_work_countries_of_residence", values);
            if (result.success) {
                toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
            } else {
                toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="rounded-2xl shadow-md bg-white">
            <CardHeader>
                <CardTitle className="text-2xl font-semibold">Countries of Residence</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                    Provide details of all countries where the applicant(s) have spent a total of 12 months or more in the past
                    10 years since turning 16.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <h2 className="text-xl font-semibold text-foreground">Details of country of residence</h2>

                        {coverageError && (
                            <div
                                role="alert"
                                data-testid="residence-coverage-error"
                                className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                            >
                                {coverageError}
                            </div>
                        )}

                        <RepeaterTable
                            data={residenceRecords}
                            columns={[
                                {
                                    key: "applicant_name",
                                    label: "Applicant",
                                    format: (row) => applicantLabelForValue(row.applicant_name, applicants),
                                },
                                { key: "country", label: "Country" },
                                {
                                    key: "date_from_day",
                                    label: "From",
                                    format: (row) => formatDate(row.date_from_day, row.date_from_month, row.date_from_year),
                                },
                                {
                                    key: "date_to_day",
                                    label: "To",
                                    format: (row) =>
                                        row.date_to_year
                                            ? formatDate(row.date_to_day, row.date_to_month, row.date_to_year)
                                            : "Ongoing",
                                },
                            ]}
                            onAdd={(newRow) => {
                                setCoverageError("");
                                const updated = [...residenceRecords, newRow];
                                form.setValue("residence_records", updated, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true,
                                });
                            }}
                            onEdit={(index, updatedRow) => {
                                setCoverageError("");
                                const updated = [...residenceRecords];
                                updated[index] = updatedRow;
                                form.setValue("residence_records", updated, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true,
                                });
                            }}
                            onDelete={(index) => {
                                setCoverageError("");
                                const updated = residenceRecords.filter((_, i) => i !== index);
                                form.setValue("residence_records", updated, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true,
                                });
                            }}
                            DialogComponent={ResidenceDialogWithApplicants}
                            addButtonText="Add Country"
                            emptyMessage="No countries of residence added yet"
                            testIdPrefix="residence"
                        />
                    </div>

                    <FormNavigation
                        onPrev={handlePrevious}
                        onNext={form.handleSubmit(onSubmit)}
                        onSave={handleSave}
                        nextLabel="Continue"
                        loading={isSaving}
                    />
                </form>
            </CardContent>
        </Card>
    );
}
