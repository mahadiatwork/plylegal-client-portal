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
import { getLocalQuestionnaireDefinition, getQuestionnairePage } from "@/lib/questionnaires";
import { withQuestionnaireLoadTimeout } from "@/lib/questionnaires/remoteLoading";
import {
  getQuestionnaireCompletionKey,
  getQuestionnaireCompletionStamp,
  getQuestionnaireDatePartNames,
  getQuestionnairePageValidationIssues,
  sanitizeQuestionnairePageValues,
} from "@/lib/questionnaires/answers";

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
  if (question.type === "repeater") return question.metadata?.collection === "object" ? {} : [];
  return "";
}

function getDefaultValues(questions = []) {
  return getQuestionsFlat(questions).reduce((defaults, question) => {
    if (question.type === "dateParts") {
      Object.values(getQuestionnaireDatePartNames(question)).forEach((partName) => {
        defaults[partName] = "";
      });
    } else if (question.answerKey) {
      defaults[question.answerKey] = getQuestionDefaultValue(question);
    }
    return defaults;
  }, {});
}

function validateVisibleRequiredQuestions({ form, page, values }) {
  form.clearErrors();
  const issues = getQuestionnairePageValidationIssues(page, values);
  issues.forEach(({ fieldName, message }) => {
    form.setError(fieldName, { type: "required", message });
  });
  return issues.length === 0;
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

function inferProfileId(route, draft, requestedProfileId = null) {
  const childId = String(route || "").match(/\/children\/([^/]+)\//)?.[1];
  if (childId) {
    return (draft?.profiles || []).some(
      (profile) => String(profile.id) === childId && profile.relationship === "child"
    ) ? childId : null;
  }

  const relationship = String(route || "").includes("/main-applicant/")
    ? "main_applicant"
    : String(route || "").includes("/spouse-partner/")
      ? "spouse"
      : null;
  if (!relationship) return null;
  if (requestedProfileId) {
    const requestedProfile = (draft?.profiles || []).find(
      (profile) => String(profile.id) === String(requestedProfileId)
    );
    if (requestedProfile?.relationship === relationship) return requestedProfile.id;
  }
  return (draft?.profiles || []).find((profile) => profile.relationship === relationship)?.id || null;
}

export function DynamicQuestionnairePage({
  definitionId,
  definitionRevision,
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
  const resolvedProfileId = inferProfileId(internalRoute, draftSnap.draft, profileId);
  const hasManagedDefinition = Boolean(definitionId) && Number.isInteger(definitionRevision);

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

      // This direct-render path is also the shipped Character page fallback.
      // An already failed optional definition read must not trigger another
      // remote read before its bundled questionnaire becomes available.
      const bundledDefinition = getLocalQuestionnaireDefinition({ definitionId, visaType, visaContext: draftSnap.visaContext });
      const bundledPage = bundledDefinition?.pages.find((page) => page.route === internalRoute);
      if (bundledPage) {
        setPageDefinition(bundledPage);
        setIsLoadingDefinition(false);
        return;
      }

      setIsLoadingDefinition(true);
      const loadedPage = await withQuestionnaireLoadTimeout(() => getQuestionnairePage({
        definitionId,
        route: internalRoute,
        visaType,
        visaContext: draftSnap.visaContext,
      })).catch(() => null);

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
    if (pageDefinition.scope === "profile" && resolvedProfileId) {
      return draftSnap.draft?.profiles_data?.[resolvedProfileId]?.[pageDefinition.sectionKey] || {};
    }
    return getNestedValue(draftSnap.draft, pageDefinition.sectionKey) || {};
  }, [draftSnap.draft, pageDefinition, resolvedProfileId]);

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
      if (!resolvedProfileId) return { success: false, error: "Profile ID required" };
      return draftStore.saveProfileSectionData(resolvedProfileId, pageDefinition.sectionKey, data);
    }

    return draftStore.saveSectionData(pageDefinition.sectionKey, data);
  };

  const markPageComplete = async () => {
    const completionKey = getQuestionnaireCompletionKey(pageDefinition);
    if (hasManagedDefinition) {
      return draftStore.markDynamicQuestionnairePageComplete(
        completionKey,
        getQuestionnaireCompletionStamp(
          { id: definitionId, revision: definitionRevision },
          pageDefinition
        ),
        pageDefinition.scope === "profile" ? resolvedProfileId : null
      );
    }
    if (pageDefinition.scope === "profile") {
      return draftStore.markProfilePageComplete(resolvedProfileId, completionKey);
    }
    return draftStore.markPageComplete(
      completionKey,
      null,
      pageDefinition.sectionKey
    );
  };

  const handleSubmit = async (data) => {
    const sanitizedData = sanitizeQuestionnairePageValues(pageDefinition, data);
    form.reset(sanitizedData);
    if (!validateVisibleRequiredQuestions({ form, page: pageDefinition, values: sanitizedData })) return;

    setIsSaving(true);
    try {
      const result = await savePageData(sanitizedData);
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
    const values = sanitizeQuestionnairePageValues(pageDefinition, form.getValues());
    form.reset(values);

    setIsSaving(true);
    try {
      const result = await savePageData(values);
      if (result.success) {
        let completionResult = { success: true };
        if (hasManagedDefinition) {
          const completionKey = getQuestionnaireCompletionKey(pageDefinition);
          const completionProfileId = pageDefinition.scope === "profile" ? resolvedProfileId : null;
          const fullCompletionKey = completionProfileId
            ? `${completionKey}__${completionProfileId}`
            : completionKey;
          if (getQuestionnairePageValidationIssues(pageDefinition, values).length) {
            completionResult = await draftStore.markDynamicQuestionnairePageIncomplete(
              completionKey,
              completionProfileId
            );
          } else if (draftSnap.completionStatus?.[fullCompletionKey] === true) {
            completionResult = await draftStore.markDynamicQuestionnairePageComplete(
              completionKey,
              getQuestionnaireCompletionStamp(
                { id: definitionId, revision: definitionRevision },
                pageDefinition
              ),
              completionProfileId
            );
          }
        }
        if (!completionResult?.success) {
          toast({
            title: "Draft saved with a warning",
            description:
              completionResult?.error ||
              "Your answers were saved, but the page completion status could not be updated. Please try again.",
            variant: "destructive",
          });
          return;
        }
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
