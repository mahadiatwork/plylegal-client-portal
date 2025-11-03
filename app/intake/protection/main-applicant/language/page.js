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

const PROFICIENCY_LEVELS = ["Basic", "Intermediate", "Proficient", "Fluent/Native"];
const TEST_TYPES = ["IELTS Academic", "IELTS General", "PTE Academic", "TOEFL iBT", "OET", "Other"];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));

const COMMON_LANGUAGES = [
  "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian", "Bengali", "Bosnian",
  "Bulgarian", "Catalan", "Chinese (Cantonese)", "Chinese (Mandarin)", "Croatian", "Czech", "Danish", "Dutch", "English",
  "Estonian", "Filipino", "Finnish", "French", "Georgian", "German", "Greek", "Gujarati", "Haitian Creole", "Hausa",
  "Hebrew", "Hindi", "Hungarian", "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Javanese", "Kannada",
  "Kazakh", "Khmer", "Korean", "Kurdish", "Kyrgyz", "Lao", "Latvian", "Lithuanian", "Macedonian", "Malagasy", "Malay",
  "Malayalam", "Maltese", "Maori", "Marathi", "Mongolian", "Nepali", "Norwegian", "Pashto", "Persian", "Polish", "Portuguese",
  "Punjabi", "Romanian", "Russian", "Serbian", "Sinhala", "Slovak", "Slovenian", "Somali", "Spanish", "Swahili", "Swedish",
  "Tamil", "Telugu", "Thai", "Turkish", "Ukrainian", "Urdu", "Uzbek", "Vietnamese", "Welsh", "Xhosa", "Yiddish", "Yoruba", "Zulu"
];

function LanguageDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    language: z.string().min(1, "Language is required"),
    proficiency: z.string().min(1, "Proficiency is required"),
    is_main_language: z.enum(["yes", "no"]),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      language: "",
      proficiency: "",
      is_main_language: "no",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <form onSubmit={dialogForm.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label className="mb-2 block">Language *</Label>
        <Select
          value={dialogForm.watch("language")}
          onValueChange={(value) => dialogForm.setValue("language", value)}
        >
          <SelectTrigger data-testid="select-language">
            <SelectValue placeholder="Choose Language" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.language && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.language.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Proficiency *</Label>
        <Select
          value={dialogForm.watch("proficiency")}
          onValueChange={(value) => dialogForm.setValue("proficiency", value)}
        >
          <SelectTrigger data-testid="select-proficiency">
            <SelectValue placeholder="Choose Proficiency" />
          </SelectTrigger>
          <SelectContent>
            {PROFICIENCY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.proficiency && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.proficiency.message}</p>
        )}
      </div>

      <div>
        <Label className="text-base font-medium mb-3 block">
          Is this your main language? *
        </Label>
        <RadioGroup
          value={dialogForm.watch("is_main_language")}
          onValueChange={(value) => dialogForm.setValue("is_main_language", value)}
          className="flex gap-4"
          data-testid="radio-main-language"
        >
          <div className="flex items-center">
            <RadioGroupItem value="yes" id="main-lang-yes" />
            <Label htmlFor="main-lang-yes" className="ml-2 cursor-pointer font-normal">
              Yes
            </Label>
          </div>
          <div className="flex items-center">
            <RadioGroupItem value="no" id="main-lang-no" />
            <Label htmlFor="main-lang-no" className="ml-2 cursor-pointer font-normal">
              No
            </Label>
          </div>
        </RadioGroup>
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

function EnglishTestDialog({ editingRow, onSave, onCancel }) {
  const dialogFormSchema = z.object({
    test_type: z.string().min(1, "Test type is required"),
    date_day: z.string().min(1, "Day is required"),
    date_month: z.string().min(1, "Month is required"),
    date_year: z.string().min(1, "Year is required"),
    location: z.string().min(1, "Location is required"),
    reference_number: z.string().min(1, "Reference number is required"),
    overall_score: z.string().min(1, "Overall score is required"),
    listening: z.string().optional(),
    reading: z.string().optional(),
    writing: z.string().optional(),
    speaking: z.string().optional(),
  });

  const dialogForm = useForm({
    resolver: zodResolver(dialogFormSchema),
    defaultValues: editingRow || {
      test_type: "",
      date_day: "",
      date_month: "",
      date_year: "",
      location: "",
      reference_number: "",
      overall_score: "",
      listening: "",
      reading: "",
      writing: "",
      speaking: "",
    }
  });

  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <form onSubmit={dialogForm.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label className="mb-2 block">Test Type *</Label>
        <Select
          value={dialogForm.watch("test_type")}
          onValueChange={(value) => dialogForm.setValue("test_type", value)}
        >
          <SelectTrigger data-testid="select-test-type">
            <SelectValue placeholder="Choose Test Type" />
          </SelectTrigger>
          <SelectContent>
            {TEST_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dialogForm.formState.errors.test_type && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.test_type.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Date *</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={dialogForm.watch("date_day")}
            onValueChange={(value) => dialogForm.setValue("date_day", value)}
          >
            <SelectTrigger data-testid="select-date-day">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day) => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_month")}
            onValueChange={(value) => dialogForm.setValue("date_month", value)}
          >
            <SelectTrigger data-testid="select-date-month">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dialogForm.watch("date_year")}
            onValueChange={(value) => dialogForm.setValue("date_year", value)}
          >
            <SelectTrigger data-testid="select-date-year">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dialogForm.formState.errors.date_day && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.date_day.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="location" className="mb-2 block">Location/Test Centre *</Label>
        <Input
          id="location"
          {...dialogForm.register("location")}
          data-testid="input-location"
        />
        {dialogForm.formState.errors.location && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.location.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="reference_number" className="mb-2 block">Reference/Registration Number *</Label>
        <Input
          id="reference_number"
          {...dialogForm.register("reference_number")}
          data-testid="input-reference-number"
        />
        {dialogForm.formState.errors.reference_number && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.reference_number.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="overall_score" className="mb-2 block">Overall Score *</Label>
        <Input
          id="overall_score"
          {...dialogForm.register("overall_score")}
          data-testid="input-overall-score"
        />
        {dialogForm.formState.errors.overall_score && (
          <p className="text-sm text-red-600 mt-1">{dialogForm.formState.errors.overall_score.message}</p>
        )}
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Sub-scores (optional)</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="listening" className="mb-2 block text-sm">Listening</Label>
            <Input
              id="listening"
              {...dialogForm.register("listening")}
              data-testid="input-listening"
            />
          </div>
          <div>
            <Label htmlFor="reading" className="mb-2 block text-sm">Reading</Label>
            <Input
              id="reading"
              {...dialogForm.register("reading")}
              data-testid="input-reading"
            />
          </div>
          <div>
            <Label htmlFor="writing" className="mb-2 block text-sm">Writing</Label>
            <Input
              id="writing"
              {...dialogForm.register("writing")}
              data-testid="input-writing"
            />
          </div>
          <div>
            <Label htmlFor="speaking" className="mb-2 block text-sm">Speaking</Label>
            <Input
              id="speaking"
              {...dialogForm.register("speaking")}
              data-testid="input-speaking"
            />
          </div>
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

export default function LanguagePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);
  const draft = draftSnap.draft;

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftStore.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams]);

  const form = useForm({
    defaultValues: {
      is_english_main_language: "no",
      languages: [],
      has_english_test: "no",
      english_tests: [],
    }
  });

  const isEnglishMainLanguage = form.watch("is_english_main_language");
  const hasEnglishTest = form.watch("has_english_test");
  const languages = form.watch("languages") || [];
  const englishTests = form.watch("english_tests") || [];

  useEffect(() => {
    const savedData = draft.protection_language || {};
    if (Object.keys(savedData).length > 0) {
      form.reset(savedData);
    }
  }, []);

  const handleSave = async () => {
    const formData = form.getValues();
    const result = await draftStore.saveSectionData("protection_language", formData);
    
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
    await draftStore.saveSectionData("protection_language", data);
    const visaType = getVisaTypeFromPath(pathname);
    draftStore.markPageComplete(`${visaType}/main-applicant/language`);
    
    const nextRoute = getNextRoute(pathname, visaType, draftStore.currentApplicationId);
    if (nextRoute) {
      router.push(nextRoute);
    }
  };

  const handlePrevious = () => {
    const visaType = getVisaTypeFromPath(pathname);
    const previousRoute = getPreviousRoute(pathname, visaType, draftStore.currentApplicationId);
    if (previousRoute) {
      router.push(previousRoute);
    }
  };

  return (
    <div className="min-h-screen bg-[#E0E7FF]">
      <StickyNav 
        title="Language"
        description="In this section, provide details about the main applicant's language skills."
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Q1: Is the English language your main language? */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Is the English language your main language?
                </Label>
                <RadioGroup
                  value={isEnglishMainLanguage}
                  onValueChange={(value) => form.setValue("is_english_main_language", value)}
                  className="flex gap-4"
                  data-testid="radio-english-main"
                >
                  <div className="flex items-center" data-testid="radio-english-main-yes">
                    <RadioGroupItem value="yes" id="english-main-yes" />
                    <Label htmlFor="english-main-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center" data-testid="radio-english-main-no">
                    <RadioGroupItem value="no" id="english-main-no" />
                    <Label htmlFor="english-main-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>

                {/* Languages Repeater (shown if No) */}
                {isEnglishMainLanguage === "no" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Languages Used</h3>
                    <RepeaterTable
                      data={languages}
                      columns={[
                        { key: "language", label: "Language" },
                        { key: "proficiency", label: "Proficiency" },
                        { key: "is_main_language", label: "Main Language?", format: (row) => row.is_main_language === "yes" ? "Yes" : "No" },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...languages, newRow];
                        form.setValue("languages", updated);
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...languages];
                        updated[index] = updatedRow;
                        form.setValue("languages", updated);
                      }}
                      onDelete={(index) => {
                        const updated = languages.filter((_, i) => i !== index);
                        form.setValue("languages", updated);
                      }}
                      DialogComponent={LanguageDialog}
                      addButtonText="Add"
                      testIdPrefix="language"
                    />
                  </div>
                )}
              </div>

              {/* Q2: Have you undertaken any English language test */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Have you undertaken any English language test within the last 36 months?
                </Label>
                <RadioGroup
                  value={hasEnglishTest}
                  onValueChange={(value) => form.setValue("has_english_test", value)}
                  className="flex gap-4"
                  data-testid="radio-english-test"
                >
                  <div className="flex items-center" data-testid="radio-english-test-yes">
                    <RadioGroupItem value="yes" id="english-test-yes" />
                    <Label htmlFor="english-test-yes" className="ml-2 cursor-pointer font-normal">
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center" data-testid="radio-english-test-no">
                    <RadioGroupItem value="no" id="english-test-no" />
                    <Label htmlFor="english-test-no" className="ml-2 cursor-pointer font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>

                {/* English Test Results Repeater (shown if Yes) */}
                {hasEnglishTest === "yes" && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">English Test Results</h3>
                    <RepeaterTable
                      data={englishTests}
                      columns={[
                        { key: "date_day", label: "Date", format: (row) => `${row.date_day}/${row.date_month}/${row.date_year}` },
                        { key: "test_type", label: "Test Type" },
                        { key: "location", label: "Location" },
                        { key: "reference_number", label: "Reference Number" },
                        { key: "overall_score", label: "Overall Score" },
                      ]}
                      onAdd={(newRow) => {
                        const updated = [...englishTests, newRow];
                        form.setValue("english_tests", updated);
                      }}
                      onEdit={(index, updatedRow) => {
                        const updated = [...englishTests];
                        updated[index] = updatedRow;
                        form.setValue("english_tests", updated);
                      }}
                      onDelete={(index) => {
                        const updated = englishTests.filter((_, i) => i !== index);
                        form.setValue("english_tests", updated);
                      }}
                      DialogComponent={EnglishTestDialog}
                      addButtonText="Add"
                      testIdPrefix="english-test"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                data-testid="button-previous"
              >
                Previous
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSave}
                  data-testid="button-save"
                >
                  Save
                </Button>
                <Button
                  type="submit"
                  className="bg-[#285646] hover:bg-[#1e4136] text-white"
                  data-testid="button-continue"
                >
                  Continue
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
