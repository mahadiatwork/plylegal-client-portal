"use client";

import { DynamicQuestionnairePage } from "@/components/questionnaire/DynamicQuestionnairePage";
import { QuestionnaireCopyProvider } from "@/components/questionnaire/QuestionnaireCopyContext";
import { findQuestionnaireDefinitionPage } from "@/lib/questionnaires/pageRoutes";

/** Definition availability never removes the built-in form or its saved answers. */
export function QuestionnaireDefinitionContent({ children, definition, errorCode, hasLoadError, loading, onRetry, route }) {
  if (loading) {
    return <div className="rounded-2xl bg-white p-8 text-sm text-gray-600 shadow-md">Loading questionnaire…</div>;
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
