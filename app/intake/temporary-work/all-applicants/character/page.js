"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute, getPreviousRoute, getVisaTypeFromPath } from "@/lib/routes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormNavigation } from "@/components/FormNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const CHARACTER_QUESTIONS = [
  {
    key: "char_q01",
    label:
      "Has any applicant ever been charged with any offence that is currently awaiting legal action?",
  },
  {
    key: "char_q02",
    label:
      "Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)?",
  },
  {
    key: "char_q03",
    label:
      "Has any applicant ever been the subject of a domestic violence or family violence order, or any other order, of a tribunal or court or other similar authority, for the personal protection of another person?",
  },
  {
    key: "char_q04",
    label: "Has any applicant ever been the subject of an arrest warrant or Interpol notice?",
  },
  {
    key: "char_q05",
    label:
      "Has any applicant ever been found guilty of a sexually based offence involving a child (including where no conviction was recorded)?",
  },
  {
    key: "char_q06",
    label: "Has any applicant ever been named on a sex offender register?",
  },
  {
    key: "char_q07",
    label:
      "Has any applicant ever been acquitted of any offence on the grounds of unsoundness of mind or insanity?",
  },
  {
    key: "char_q08",
    label: "Has any applicant ever been found by a court not fit to plead?",
  },
  {
    key: "char_q09",
    label:
      "Has any applicant ever been directly or indirectly involved in, or associated with, activities which would represent a risk to national security in Australia or any other country?",
  },
  {
    key: "char_q10",
    label:
      "Has any applicant ever been charged with, or indicted for: genocide, war crimes, crimes against humanity, torture, slavery, or any other crime that is otherwise of a serious international concern?",
  },
  {
    key: "char_q11",
    label:
      "Has any applicant ever been associated with a person, group or organisation that has been or is involved in criminal conduct?",
  },
  {
    key: "char_q12",
    label:
      "Has any applicant ever been associated with an organisation engaged in violence or engaged in acts of violence (including war, insurgency, freedom fighting, terrorism, protest) either overseas or in Australia?",
  },
  {
    key: "char_q13",
    label:
      "Has any applicant ever served in a military force, police force, state sponsored / private militia or intelligence agency (including secret police)?",
  },
  {
    key: "char_q14",
    label:
      "Has any applicant ever undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products?",
  },
  {
    key: "char_q15",
    label: "Has any applicant ever been involved in people smuggling or people trafficking offences?",
  },
  {
    key: "char_q16",
    label:
      "Has any applicant ever been removed, deported or excluded from any country (including Australia)?",
  },
  {
    key: "char_q17",
    label: "Has any applicant ever overstayed a visa in any country (including Australia)?",
  },
  {
    key: "char_q18",
    label:
      "Has any applicant ever had any outstanding debts to the Australian Government or any public authority in Australia?",
  },
];

const formSchema = z.object(
  CHARACTER_QUESTIONS.reduce((acc, q) => {
    acc[q.key] = z.enum(["yes", "no"]).optional();
    acc[`${q.key}_applicant_name`] = z.string().optional();
    acc[`${q.key}_details`] = z.string().optional();
    return acc;
  }, {})
);

const defaultFormValues = CHARACTER_QUESTIONS.reduce((acc, q) => {
  acc[q.key] = "no";
  acc[`${q.key}_applicant_name`] = "";
  acc[`${q.key}_details`] = "";
  return acc;
}, {});

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visaType = getVisaTypeFromPath(pathname);
  const { toast } = useToast();
  const draftSnap = useSnapshot(draftStore);

  // Build applicant name options from profiles array
  const applicantOptions = (() => {
    const profiles = draftSnap.draft?.profiles || [];
    if (profiles.length > 0) {
      return profiles.map((p) => {
        const name = [p.given_names, p.family_name].filter(Boolean).join(" ").trim();
        return name || "Unnamed Applicant";
      });
    }

    // Fallback if profiles array is empty
    const opts = [];
    const main = draftSnap.draft?.temporary_work_details;
    if (main) {
      const name = [main.given_names, main.family_name].filter(Boolean).join(" ").trim();
      if (name) opts.push(name);
    }
    const spouse = draftSnap.draft?.temporary_work_spouse_details;
    if (spouse) {
      const name = [spouse.given_names, spouse.family_name].filter(Boolean).join(" ").trim();
      if (name) opts.push(name);
    }
    const childrenData = draftSnap.draft?.temporary_work_children?.children || [];
    childrenData.forEach(child => {
      const name = [child.given_names, child.family_name].filter(Boolean).join(" ").trim();
      if (name) opts.push(name);
    });

    return opts.length ? opts : ["Main Applicant"];
  })();

  useEffect(() => {
    const appIdFromUrl = searchParams.get("applicationId");
    if (appIdFromUrl && appIdFromUrl !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appIdFromUrl);
      draftStore.loadDraft(appIdFromUrl);
    }
  }, [searchParams, draftSnap.currentApplicationId]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    const savedData = draftSnap.draft?.temporary_work_character || {};
    if (Object.keys(savedData).length === 0) return;

    const merged = { ...defaultFormValues };
    CHARACTER_QUESTIONS.forEach((q) => {
      if (savedData[q.key] === "yes" || savedData[q.key] === "no") {
        merged[q.key] = savedData[q.key];
      }
      const appName = savedData[`${q.key}_applicant_name`];
      if (typeof appName === "string") {
        merged[`${q.key}_applicant_name`] = appName;
      }
      const det = savedData[`${q.key}_details`];
      if (typeof det === "string") {
        merged[`${q.key}_details`] = det;
      }
    });
    form.reset(merged);
  }, [draftSnap.draft?.temporary_work_character, form]);

  const onSubmit = async (data) => {
    await draftStore.saveSectionData("temporary_work_character", data);
    await draftStore.markPageComplete(`${visaType}/all-applicants/character`, null, "temporary_work_character");
    const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (next) router.push(next);
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (prev) router.push(prev);
  };

  const handleSave = async () => {
    const values = form.getValues();
    const result = await draftStore.saveSectionData("temporary_work_character", values);
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

  return (
    <Card className="rounded-2xl shadow-md bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">All Applicants&apos; Character</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3 text-sm text-foreground">
              <p>
                If the applicant answers &apos;Yes&apos; to any of the character declarations they must give all relevant
                details. For combined applications, state which applicant the declaration applies to.
              </p>
              <p>If the matter relates to a criminal conviction, provide:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>the date and nature of the offence</li>
                <li>full details of the sentence</li>
                <li>dates of any period of imprisonment or other detention.</li>
              </ul>
            </div>

            {CHARACTER_QUESTIONS.map((q) => (
              <div key={q.key} className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
                <Label className="text-base font-normal leading-relaxed">{q.label}</Label>
                <RadioGroup
                  value={form.watch(q.key) || ""}
                  onValueChange={(value) => {
                    form.setValue(q.key, value);
                    if (value === "no") {
                      form.setValue(`${q.key}_details`, "");
                    }
                  }}
                >
                  <div className="flex gap-4">
                    {["yes", "no"].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${q.key}-${option}`} />
                        <Label htmlFor={`${q.key}-${option}`}>{option === "yes" ? "Yes" : "No"}</Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                {form.watch(q.key) === "yes" && (
                  <div className="mt-4 space-y-4 bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Which applicant does this declaration apply to?</Label>
                      <Select
                        value={form.watch(`${q.key}_applicant_name`) || ""}
                        onValueChange={(value) => form.setValue(`${q.key}_applicant_name`, value)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose Applicant" />
                        </SelectTrigger>
                        <SelectContent>
                          {applicantOptions.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Give details</Label>
                      <Textarea
                        className="bg-white"
                        rows={4}
                        {...form.register(`${q.key}_details`)}
                        placeholder="Please provide full details as requested in the instructions above..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(onSubmit)}
              onSave={handleSave}
              nextLabel="Continue"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
