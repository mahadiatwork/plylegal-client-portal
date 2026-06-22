"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useSnapshot } from "valtio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormNavigation } from "@/components/FormNavigation";
import { useNavigationLoading } from "@/components/NavigationLoadingProvider";
import { QuestionRenderer } from "@/components/questionnaire/QuestionRenderer";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { getApplicationIdFromSearchParams, getProfileIdFromSearchParams } from "@/lib/intakeQueryParams";
import {
  getApplicationIdFromPathname,
  getInternalIntakeHref,
  getNextRoute,
  getPreviousRoute,
  getVisaTypeFromPath,
} from "@/lib/routes";
import { evaluateVisibleIf } from "@/lib/questionnaires/validation";
import { getQuestionnairePage } from "@/lib/questionnaires";

function getNestedValue(obj, path) {
  if (!path) return undefined;
  return path.split(".").reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, obj);
}

function getQuestionsFlat(questions = []) {
  return questions.flatMap((question) => [
    question,
    ...getQuestionsFlat(question.followUps || []),
  ]);
}

function getQuestionDefaultValue(question) {
  if (question.defaultValue !== undefined) return question.defaultValue;
  if (question.type === "checkbox") return false;
  if (question.type === "repeater") return [];
  return "";
}

function getDefaultValues(questions = []) {
  return getQuestionsFlat(questions).reduce((defaults, question) => {
    if (question.type === "dateParts" && question.parts) {
      Object.values(question.parts).forEach((partName) => {
        defaults[partName] = "";
      });
    } else if (question.answerKey) {
      defaults[question.answerKey] = getQuestionDefaultValue(question);
    }
    return defaults;
  }, {});
}

function getQuestionFieldNames(question) {
  if (question.type === "dateParts" && question.parts) {
    return Object.values(question.parts);
  }
  return question.answerKey ? [question.answerKey] : [];
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim() !== "";
  return value !== null && value !== undefined;
}

function validateVisibleRequiredQuestions({ form, page, values }) {
  let isValid = true;
  form.clearErrors();

  getQuestionsFlat(page.questions).forEach((question) => {
    if (!question.required) return;
    if (!evaluateVisibleIf(question.visibleIf, values)) return;

    getQuestionFieldNames(question).forEach((fieldName) => {
      if (hasValue(values[fieldName])) return;
      form.setError(fieldName, {
        type: "required",
        message: question.validation?.requiredMessage || "This field is required",
      });
      isValid = false;
    });
  });

  return isValid;
}

function renderIntroBlock(block, index) {
  if (block.type === "list") {
    return (
      <div key={index} className="space-y-2">
        {block.lead && <p>{block.lead}</p>}
        <ul className="list-disc pl-5 space-y-1">
          {(block.items || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  return <p key={index}>{block.text}</p>;
}

function getApplicantOptions(draft) {
  const profiles = draft?.profiles || [];
  if (profiles.length > 0) {
    return profiles.map((profile) => {
      const name = [profile.given_names, profile.family_name].filter(Boolean).join(" ").trim();
      return {
        value: name || "Unnamed Applicant",
        label: name || "Unnamed Applicant",
      };
    });
  }

  const options = [];
  const main = draft?.temporary_work_details;
  if (main) {
    const name = [main.given_names, main.family_name].filter(Boolean).join(" ").trim();
    if (name) options.push({ value: name, label: name });
  }
  const spouse = draft?.temporary_work_spouse_details;
  if (spouse) {
    const name = [spouse.given_names, spouse.family_name].filter(Boolean).join(" ").trim();
    if (name) options.push({ value: name, label: name });
  }
  const children = draft?.temporary_work_children?.children || [];
  children.forEach((child) => {
    const name = [child.given_names, child.family_name].filter(Boolean).join(" ").trim();
    if (name) options.push({ value: name, label: name });
  });

  return options.length ? options : [{ value: "Main Applicant", label: "Main Applicant" }];
}

export function DynamicQuestionnairePage({
  definitionId,
  pageDefinition: providedPageDefinition,
  repeaterRegistry = {},
  route,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const draftSnap = useSnapshot(draftStore);
  const { toast } = useToast();
  const { startNavigation } = useNavigationLoading();

  const [pageDefinition, setPageDefinition] = useState(providedPageDefinition || null);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(!providedPageDefinition);
  const [isSaving, setIsSaving] = useState(false);

  const internalRoute = route || getInternalIntakeHref(pathname).split("?")[0];
  const visaType = getVisaTypeFromPath(pathname);
  const appId = getApplicationIdFromSearchParams(searchParams) || getApplicationIdFromPathname(pathname);
  const profileId = getProfileIdFromSearchParams(searchParams);

  useEffect(() => {
    if (appId && appId !== draftSnap.currentApplicationId) {
      draftStore.setApplicationId(appId);
      draftStore.loadDraft(appId);
    }
  }, [appId, draftSnap.currentApplicationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadPageDefinition() {
      if (providedPageDefinition) {
        setPageDefinition(providedPageDefinition);
        setIsLoadingDefinition(false);
        return;
      }

      setIsLoadingDefinition(true);
      const loadedPage = await getQuestionnairePage({
        definitionId,
        route: internalRoute,
        visaType,
        visaContext: draftSnap.visaContext,
      });

      if (!cancelled) {
        setPageDefinition(loadedPage);
        setIsLoadingDefinition(false);
      }
    }

    loadPageDefinition();

    return () => {
      cancelled = true;
    };
  }, [definitionId, draftSnap.visaContext, internalRoute, providedPageDefinition, visaType]);

  const defaultValues = useMemo(
    () => getDefaultValues(pageDefinition?.questions || []),
    [pageDefinition]
  );

  const form = useForm({
    defaultValues,
  });

  const sectionData = useMemo(() => {
    if (!pageDefinition) return {};
    if (pageDefinition.scope === "profile" && profileId) {
      return draftSnap.draft?.profiles_data?.[profileId]?.[pageDefinition.sectionKey] || {};
    }
    return getNestedValue(draftSnap.draft, pageDefinition.sectionKey) || {};
  }, [draftSnap.draft, pageDefinition, profileId]);

  useEffect(() => {
    if (!pageDefinition || draftSnap.isLoading) return;
    form.reset({
      ...defaultValues,
      ...sectionData,
    });
  }, [defaultValues, draftSnap.isLoading, form, pageDefinition, sectionData]);

  const optionSources = useMemo(() => ({
    applicants: getApplicantOptions(draftSnap.draft),
  }), [draftSnap.draft]);

  const savePageData = async (data) => {
    if (!pageDefinition) return { success: false, error: "Questionnaire page is not loaded" };

    if (pageDefinition.scope === "profile") {
      if (!profileId) return { success: false, error: "Profile ID required" };
      return draftStore.saveProfileSectionData(profileId, pageDefinition.sectionKey, data);
    }

    return draftStore.saveSectionData(pageDefinition.sectionKey, data);
  };

  const markPageComplete = async () => {
    if (pageDefinition.scope === "profile") {
      return draftStore.markProfilePageComplete(profileId, pageDefinition.completionKey || internalRoute.replace("/intake/", ""));
    }
    return draftStore.markPageComplete(
      pageDefinition.completionKey || internalRoute.replace("/intake/", ""),
      null,
      pageDefinition.sectionKey
    );
  };

  const handleSubmit = async (data) => {
    if (!validateVisibleRequiredQuestions({ form, page: pageDefinition, values: data })) return;

    setIsSaving(true);
    try {
      const result = await savePageData(data);
      if (!result.success) {
        toast({ title: "Error", description: result.error || "Failed to save draft", variant: "destructive" });
        return;
      }

      const completionResult = await markPageComplete();
      if (!completionResult.success) {
        toast({
          title: "Complete required information",
          description: completionResult.error || "Please complete this page before continuing.",
          variant: "destructive",
        });
        return;
      }

      const next = getNextRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
      if (next) {
        startNavigation(next);
        router.push(next);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    const values = form.getValues();
    if (!validateVisibleRequiredQuestions({ form, page: pageDefinition, values })) return;

    setIsSaving(true);
    try {
      const result = await savePageData(values);
      if (result.success) {
        toast({ title: "Draft saved", description: "Your changes have been saved successfully" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to save draft", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevious = () => {
    const prev = getPreviousRoute(pathname, visaType, draftSnap.currentApplicationId, draftSnap.visaContext);
    if (prev) {
      startNavigation(prev);
      router.push(prev);
    }
  };

  if (isLoadingDefinition) {
    return (
      <Card className="rounded-2xl shadow-md bg-white">
        <CardContent className="p-8 text-sm text-gray-600">Loading questionnaire...</CardContent>
      </Card>
    );
  }

  if (!pageDefinition) {
    return (
      <Card className="rounded-2xl shadow-md bg-white">
        <CardContent className="p-8 text-sm text-red-700">Questionnaire page definition was not found.</CardContent>
      </Card>
    );
  }

  const values = form.watch();

  return (
    <Card
      className="rounded-2xl shadow-md bg-white"
      data-testid="dynamic-questionnaire-page"
      data-questionnaire-page-id={pageDefinition.id}
    >
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{pageDefinition.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6">
            {pageDefinition.introBlocks?.length > 0 && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3 text-sm text-foreground">
                {pageDefinition.introBlocks.map(renderIntroBlock)}
              </div>
            )}

            <QuestionRenderer
              form={form}
              optionSources={optionSources}
              questions={pageDefinition.questions}
              repeaterRegistry={repeaterRegistry}
              values={values}
            />

            <FormNavigation
              onPrev={handlePrevious}
              onNext={form.handleSubmit(handleSubmit)}
              onSave={handleSave}
              loading={isSaving || draftSnap.isSaving}
              submitting={isSaving || draftSnap.isSaving}
              nextLabel="Continue"
              saveLabel="Save Draft"
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
