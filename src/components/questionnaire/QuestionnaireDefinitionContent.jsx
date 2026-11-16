"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { DynamicQuestionnairePage } from "@/components/questionnaire/DynamicQuestionnairePage";
import { QuestionnaireCopyProvider } from "@/components/questionnaire/QuestionnaireCopyContext";
import { findQuestionnaireDefinitionPage } from "@/lib/questionnaires/pageRoutes";
import {
  buildDefinitionNavigation,
  getFirstContentStep,
  getRouteAvailability,
  isDefinitionNavigation,
} from "@/lib/questionnaires/navigation";
import { buildIntakeHref, getApplicationIdFromPathname, getIntakeSlugForContext, getVisaTypeFromPath } from "@/lib/routes";
import { draftStore } from "@/stores/draftStore";

/** Shown instead of a route that the active questionnaire does not include. */
function SectionNotInQuestionnaire({ definition }) {
  const router = useRouter();
  const pathname = usePathname();
  const draftSnap = useSnapshot(draftStore);
  const visaType = getVisaTypeFromPath(pathname);

  const goToStart = () => {
    const navigation = buildDefinitionNavigation(definition, { draft: draftSnap.draft || {}, visaType });
    const target = getFirstContentStep(navigation) || navigation.steps[0];
    const href = buildIntakeHref({
      slug: getIntakeSlugForContext(visaType, draftSnap.visaContext),
      appId: getApplicationIdFromPathname(pathname) || draftSnap.currentApplicationId,
      internalHref: target?.href || `/intake/${visaType}/start`,
      visaType,
      visaContext: draftSnap.visaContext,
    });
    router.push(href);
  };

  return (
    <div role="status" data-testid="section-not-in-questionnaire" className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-700 shadow-md">
      <h2 className="text-lg font-semibold text-slate-900">This section is not part of your questionnaire</h2>
      <p className="mt-2">Use the steps on the left to continue. Anything you have already entered has been kept.</p>
      <button type="button" onClick={goToStart} className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50">
        Go to the questionnaire
      </button>
    </div>
  );
}

/** Definition availability never removes the built-in form or its saved answers. */
export function QuestionnaireDefinitionContent({ children, definition, errorCode, hasLoadError, loading, onRetry, route }) {
  if (loading) {
    return <div className="rounded-2xl bg-white p-8 text-sm text-gray-600 shadow-md">Loading questionnaire…</div>;
  }

  // Definition-driven questionnaires: excluded groups and sections the definition does not contain
  // are not reachable, even by typing the URL. Saved answers are untouched.
  if (!hasLoadError && isDefinitionNavigation(definition) && !getRouteAvailability(definition, route).reachable) {
    return <SectionNotInQuestionnaire definition={definition} />;
  }

  const remotePage = findQuestionnaireDefinitionPage(definition, route);
  if (remotePage && !hasLoadError && (remotePage.metadata?.renderer === "legacy" || remotePage.questions?.length > 0)) {
    if (remotePage.metadata?.renderer === "legacy") {
      return <QuestionnaireCopyProvider page={remotePage}>{children}</QuestionnaireCopyProvider>;
    }
    return (
      <DynamicQuestionnairePage
        key={`${definition.id}:${definition.revision}:${remotePage.id}`}
        definitionId={definition.id}
        definitionRevision={definition.revision}
        pageDefinition={remotePage}
        route={route}
      />
    );
  }

  return (
    <>
      {hasLoadError && (
        <div role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p>Using the built-in questionnaire while the published questionnaire is unavailable. Your saved answers have not changed.</p>
          {errorCode === "unauthenticated" ? (
            <a className="mt-3 inline-flex rounded-lg border border-amber-300 bg-white px-4 py-2 font-medium" href="/login">Sign in again to save your answers</a>
          ) : (
            <button type="button" className="mt-3 rounded-lg border border-amber-300 bg-white px-4 py-2 font-medium" onClick={onRetry}>Try loading the published questionnaire again</button>
          )}
        </div>
      )}
      {children}
    </>
  );
}
