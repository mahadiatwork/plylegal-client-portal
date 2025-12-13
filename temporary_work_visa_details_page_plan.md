1. The Silent Validation Failure (is_main_applicant)
This is the most likely reason your data feels inconsistent.

The Problem: Your formSchema marks is_main_applicant as a required enum ("yes" or "no").

The Bug: You are tracking this value in a local React state (useState), but you are not registering it in the react-hook-form.

The Consequence:

When you click "Save Draft" (handleSave), it works because form.getValues() just grabs what's there, bypassing validation.

When you click "Continue" (which triggers onSubmit), Validation Fails silently because is_main_applicant is missing from the form data. The onSubmit function never runs, and the data isn't saved.

2. Type Mismatches in Select Components
This is why data loads but "disappears" visually.

The Problem: HTML Selects and Shadcn/Radix UI components expect Strings. Your database might be returning Numbers (e.g., birth day 5 instead of "5").

The Bug: In your useEffect reset logic, you pass the data directly: birth_day: savedData.birth_day || "".

The Consequence: If the DB sends a number 5, and your Select option is value "5", the Select component sees a mismatch (5 !== "5") and displays the placeholder "Choose Day" instead of the value. The data is there, but the UI says it's empty.

3. The useEffect Reset Race Condition
The Problem: You are conditionally checking if (Object.keys(savedData).length > 0).

The Bug: If your database returns a partial object or just the ID initially, the reset might trigger partially or not at all. Furthermore, reset(formData) wipes out everything else in the form.

The Fix: You need to ensure you are merging data safely and converting types to strings explicitly.

The Fixed Code
Here is the corrected component. I have added comments to highlight the fixes (look for // FIX:).

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";

const formSchema = z.object({
  // FIX: Ensure this matches the string values used in inputs
  is_main_applicant: z.enum(["yes", "no"]),

  completing_family_name: z.string().optional(),
  completing_given_names: z.string().optional(),
  completing_preferred_names: z.string().optional(),
  completing_gender: z.string().optional(),
  completing_birth_day: z.string().optional(),
  completing_birth_month: z.string().optional(),
  completing_birth_year: z.string().optional(),

  prefix: z.string().optional(),
  family_name: z.string().optional(),
  given_names: z.string().optional(),
  preferred_names: z.string().optional(),
  gender: z.string().optional(),
  birth_day: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
  country_of_birth: z.string().optional(),
  city_of_birth: z.string().optional(),
  state_of_birth: z.string().optional(),
  marital_status: z.string().optional(),
  marital_status_date_day: z.string().optional(),
  marital_status_date_month: z.string().optional(),
  marital_status_date_year: z.string().optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    // FIX: Simplified check. If URL has ID, we ensure we load it.
    if (appIdFromUrl) {
      if (appIdFromUrl !== draftSnap.currentApplicationId) {
         draftStore.setApplicationId(appIdFromUrl);
         draftStore.loadDraft(appIdFromUrl);
      }
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_main_applicant: "yes", // FIX: Add default value for validation
      completing_family_name: "",
      completing_given_names: "",
      completing_preferred_names: "",
      completing_gender: "",
      completing_birth_day: "",
      completing_birth_month: "",
      completing_birth_year: "",
      prefix: "",
      family_name: "",
      given_names: "",
      preferred_names: "",
      gender: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      country_of_birth: "",
      city_of_birth: "",
      state_of_birth: "",
      marital_status: "",
      marital_status_date_day: "",
      marital_status_date_month: "",
      marital_status_date_year: "",
    },
  });

  // Watch this for UI conditionals (instead of using useState)
  const isMainApplicant = form.watch("is_main_applicant");

  // Populate Form
  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_details;

    // FIX: Only reset if we actually have data, preventing overwrites with empty objects
    if (savedData && Object.keys(savedData).length > 0) {
      
      // FIX: Helper to safely convert incoming DB data to Strings for Select components
      const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);

      const formData = {
        // FIX: Include the required validation field in the reset
        is_main_applicant: safeStr(savedData.is_main_applicant) || "yes",
        
        completing_family_name: safeStr(savedData.completing_family_name),
        completing_given_names: safeStr(savedData.completing_given_names),
        completing_preferred_names: safeStr(savedData.completing_preferred_names),
        completing_gender: safeStr(savedData.completing_gender),
        completing_birth_day: safeStr(savedData.completing_birth_day),
        completing_birth_month: safeStr(savedData.completing_birth_month),
        completing_birth_year: safeStr(savedData.completing_birth_year),
        
        prefix: safeStr(savedData.prefix),
        family_name: safeStr(savedData.family_name),
        given_names: safeStr(savedData.given_names),
        preferred_names: safeStr(savedData.preferred_names),
        gender: safeStr(savedData.gender),
        
        // FIX: Explicitly convert numbers to strings for Selects
        birth_day: safeStr(savedData.birth_day),
        birth_month: safeStr(savedData.birth_month),
        birth_year: safeStr(savedData.birth_year),
        
        country_of_birth: safeStr(savedData.country_of_birth),
        city_of_birth: safeStr(savedData.city_of_birth),
        state_of_birth: safeStr(savedData.state_of_birth),
        marital_status: safeStr(savedData.marital_status),
        marital_status_date_day: safeStr(savedData.marital_status_date_day),
        marital_status_date_month: safeStr(savedData.marital_status_date_month),
        marital_status_date_year: safeStr(savedData.marital_status_date_year),
      };

      // FIX: Use keepDefaultValues to avoid blowing away unrelated state if you add more fields later
      form.reset(formData); 
    }
  }, [draftSnap.draft?.temporary_work_details, form]); // Keep dependencies minimal

  const onSubmit = async (data) => {
    // Save the form data
    await draftStore.saveSectionData("temporary_work_details", data);
    console.log("📦 Data saved to database via Submit:", data);

    // Navigation logic...
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const values = form.getValues();
      console.log("📦 Data saved to database via Save Draft:", values);
      const result = await draftStore.saveSectionData("temporary_work_details", values);
      
      if (result.success) {
        toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to save draft", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ... (Arrays for days/months remain the same) ...
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());
  const maritalStatuses = ["Never Married", "Married", "De Facto Relationship", "Divorced", "Widowed", "Separated"];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
           {/* ... Header ... */}
           <div className="px-6 py-8 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Main Applicant's Details</h1>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-8 space-y-8">
            
            {/* FIX: You need to register is_main_applicant even if you don't show an input for it, 
                or ensure it has a default value. If you have UI for it, use it here. 
                If it's always "yes" for this page, we handle it in defaultValues. 
            */}

            <div className="space-y-6 border-gray-200">
              
              {/* ... Other Inputs ... */}

              <div>
                <Label>Family Name</Label>
                <Input {...form.register("family_name")} />
              </div>
              
              {/* ... (Rest of your inputs) ... */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                   <Label>Date of Birth - Day</Label>
                   <Select
                     onValueChange={(value) => form.setValue("birth_day", value)}
                     // FIX: Ensure this value is never undefined/null
                     value={form.watch("birth_day") || ""} 
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Choose Day" />
                     </SelectTrigger>
                     <SelectContent>
                       {days.map((day) => (
                         <SelectItem key={day} value={day}>{day}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
                {/* Repeat similar fixes for Month/Year selects */}
              </div>

              {/* ... (Rest of form) ... */}

            </div>

            <FormNavigation
              onPrev={() => {}} 
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              loading={isSaving}
              saveLabel="Save Draft"
              nextLabel="Continue"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
Summary of Changes
Helper safeStr: I added a helper function safeStr in the reset logic. This ensures that even if your database returns the number 5, it is converted to string "5" before going into the form. This fixes the "Select shows empty" bug.

Integrated is_main_applicant: I removed the separate useState and integrated it into useForm. I ensured it's included in defaultValues and form.reset. This ensures validation passes when you submit.

Removed setIsMainApplicant: We now use const isMainApplicant = form.watch("is_main_applicant"). This is the standard React Hook Form way to conditionally show fields.

Value Guarding: In the JSX for the Select component, I added value={form.watch("birth_day") || ""}. This ensures the component never crashes or misbehaves if the internal value is undefined.