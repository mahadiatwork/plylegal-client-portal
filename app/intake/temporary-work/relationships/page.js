"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StickyNav } from "@/components/StickyNav";

const formSchema = z.object({
  marriage_day: z.string().optional(),
  marriage_month: z.string().optional(),
  marriage_year: z.string().optional(),
  children_from_relationship: z.string().optional(),
  living_together: z.string().optional(),
  reason_for_separation: z.string().optional(),
  separation_day: z.string().optional(),
  separation_month: z.string().optional(),
  separation_year: z.string().optional(),
});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  const [livingTogether, setLivingTogether] = useState("");

  useEffect(() => {
    const appIdFromUrl = searchParams.get('applicationId');
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marriage_day: "",
      marriage_month: "",
      marriage_year: "",
      children_from_relationship: "",
      living_together: "",
      reason_for_separation: "",
      separation_day: "",
      separation_month: "",
      separation_year: "",
    },
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_relationships || {};
    if (Object.keys(savedData).length > 0) {
      Object.keys(savedData).forEach((key) => {
        if (savedData[key] !== undefined && savedData[key] !== null) {
          form.setValue(key, savedData[key]);
        }
      });
      if (savedData.living_together) {
        setLivingTogether(savedData.living_together);
      }
    }
  }, []);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_relationships", data);
    await draftStore.markPageComplete(`${visaType}/relationships`);
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_relationships", values);
    if (result.success) {
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  return (
    <div className="min-h-screen bg-background">
      <StickyNav
        onPrevious={handlePrevious}
        onSave={handleSave}
        onContinue={form.handleSubmit(onSubmit)}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Current Relationship</h1>
          <p className="text-muted-foreground mt-2">
            Provide details about your current relationship with your spouse/partner.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="space-y-2">
              <Label>What date did you marry? *</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marriage_day">Day</Label>
                  <Select value={form.watch("marriage_day")} onValueChange={(value) => form.setValue("marriage_day", value)}>
                    <SelectTrigger id="marriage_day" data-testid="select-marriage-day">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marriage_month">Month</Label>
                  <Select value={form.watch("marriage_month")} onValueChange={(value) => form.setValue("marriage_month", value)}>
                    <SelectTrigger id="marriage_month" data-testid="select-marriage-month">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marriage_year">Year</Label>
                  <Select value={form.watch("marriage_year")} onValueChange={(value) => form.setValue("marriage_year", value)}>
                    <SelectTrigger id="marriage_year" data-testid="select-marriage-year">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="children_from_relationship">Number of Children from this relationship</Label>
              <Input
                id="children_from_relationship"
                type="number"
                min="0"
                {...form.register("children_from_relationship")}
                placeholder="Enter number of children (optional)"
                data-testid="input-children-count"
              />
            </div>

            <div className="space-y-2">
              <Label>Are you and your Spouse/Partner living together?</Label>
              <RadioGroup
                value={livingTogether}
                onValueChange={(value) => {
                  setLivingTogether(value);
                  form.setValue("living_together", value);
                }}
              >
                <div className="flex gap-4">
                  {["Yes", "No"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`living-${option}`} data-testid={`radio-living-together-${option.toLowerCase()}`} />
                      <Label htmlFor={`living-${option}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {livingTogether === "No" && (
              <div className="space-y-6 mt-6 pl-6 border-l-2 border-primary/30">
                <div className="space-y-2">
                  <Label htmlFor="reason_for_separation">Reason for living apart</Label>
                  <Textarea
                    id="reason_for_separation"
                    {...form.register("reason_for_separation")}
                    placeholder="Provide reason for living separately (optional)"
                    rows={4}
                    data-testid="textarea-reason-separation"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Since when have you been living separately?</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="separation_day">Day</Label>
                      <Select value={form.watch("separation_day")} onValueChange={(value) => form.setValue("separation_day", value)}>
                        <SelectTrigger id="separation_day" data-testid="select-separation-day">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="separation_month">Month</Label>
                      <Select value={form.watch("separation_month")} onValueChange={(value) => form.setValue("separation_month", value)}>
                        <SelectTrigger id="separation_month" data-testid="select-separation-month">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="separation_year">Year</Label>
                      <Select value={form.watch("separation_year")} onValueChange={(value) => form.setValue("separation_year", value)}>
                        <SelectTrigger id="separation_year" data-testid="select-separation-year">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
