In the details page, the date of birth and What is your marital status? these two things are not saving.

The reason your data is not saving (and why it keeps reverting to empty strings) is a conflict between your useEffect data loading logic and how you are handling ShadCN Select components.

You have two major issues causing this "Reset Loop":

1. The "Reset" Loop (The Main Culprit)
You have form in your useEffect dependency array.

JavaScript

// ❌ PROBLEM: 'form' changes on every render/interaction in some RHF versions
useEffect(() => {
  // ... logic that calls form.reset()
}, [draftSnap.draft?.temporary_work_details, form]); 
Here is what is happening:

You select "Married" in the dropdown.

form state updates.

Because form is in the dependency array, the useEffect fires again.

The useEffect looks at draftSnap (which is still empty because you haven't saved yet).

It calls form.reset(), overwriting your "Married" selection back to "" immediately.

When you click save, you are submitting the reset (empty) value.

2. Improper Component Registration
You are manually using setValue and watch on the Select components. In react-hook-form, if a component isn't "registered" (either via register() or a <Controller/>), handleSubmit often ignores it or treats it as an unregistered field during the submission event.

You should use the ShadCN <FormField> wrapper (which uses Controller internally) to ensure the form properly "owns" the data.

The Fix
Here is the corrected code. I have updated the Select components to use FormField and fixed the useEffect.

TypeScript

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
import { FormNavigation } from "@/components/FormNavigation";
// 1. IMPORT SHADCN FORM COMPONENTS
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"; 

// ... (Your Zod Schema remains the same) ...
const formSchema = z.object({
  is_main_applicant: z.enum(["yes", "no"]),
  // ... other fields
  marital_status: z.string().optional(),
  marital_status_date_day: z.string().optional(),
  marital_status_date_month: z.string().optional(),
  marital_status_date_year: z.string().optional(),
  // ... other fields
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  // Add other fields as needed for the example to work
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.string().optional(),
  country_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const [isSaving, setIsSaving] = useState(false);

  // ... (Your initial load useEffect remains the same) ...

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_main_applicant: "yes",
      // ... ensure all defaults are present
      marital_status: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
    },
  });

  // 2. FIXED POPULATE EFFECT
  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_details;

    if (savedData && Object.keys(savedData).length > 0) {
      const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);

      const formData = {
        is_main_applicant: safeStr(savedData.is_main_applicant) || "yes",
        marital_status: safeStr(savedData.marital_status),
        marital_status_date_day: safeStr(savedData.marital_status_date_day),
        marital_status_date_month: safeStr(savedData.marital_status_date_month),
        marital_status_date_year: safeStr(savedData.marital_status_date_year),
        birth_day: safeStr(savedData.birth_day),
        birth_month: safeStr(savedData.birth_month),
        birth_year: safeStr(savedData.birth_year),
        // ... map other fields ...
        family_name: safeStr(savedData.family_name),
        given_names: safeStr(savedData.given_names),
        preferred_names: safeStr(savedData.preferred_names),
        gender: safeStr(savedData.gender),
        country_of_birth: safeStr(savedData.country_of_birth),
        city_of_birth: safeStr(savedData.city_of_birth),
        state_of_birth: safeStr(savedData.state_of_birth),
      };

      form.reset(formData);
    }
    // FIX: Removed 'form' from dependency array to prevent reset loops
  }, [draftSnap.draft?.temporary_work_details]); 

  // ... (onSubmit, handlePrevious, handleSave, arrays remain the same) ...
  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_details", data);
    await draftStore.markPageComplete(`${visaType}/main-applicant/details`, null, "temporary_work_details");
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handleSave = async () => {
    // ... your save logic
    const values = form.getValues();
    await draftStore.saveSectionData("temporary_work_details", values);
    // ...
  };

  // Helper arrays
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
  const maritalStatuses = ["Never Married", "Married", "De Facto Relationship", "Divorced", "Widowed", "Separated"];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-8 border-b border-gray-200">
             <h1 className="text-2xl font-semibold text-gray-900">Main Applicant's Details</h1>
          </div>

          {/* 3. WRAP EVERYTHING IN <Form> PROVIDER */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-8 space-y-8">
              
              {/* Example: Date of Birth Day using FormField */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="birth_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth - Day</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose Day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Month</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose Month" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                             <SelectValue placeholder="Choose Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Example: Marital Status using FormField */}
              <FormField
                control={form.control}
                name="marital_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your marital status?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose Marital Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maritalStatuses.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ... The rest of your conditional fields for Marital Status Date ... */}
              {/* Remember to wrap those Selects in FormField as well! */}

              <FormNavigation
                onPrev={form.handleSubmit(() => {})} // Just placeholder logic
                onNext={form.handleSubmit(onSubmit)}
                onSave={handleSave}
                loading={isSaving}
              />
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}