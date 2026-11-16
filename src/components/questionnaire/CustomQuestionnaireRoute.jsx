"use client";

import { usePathname } from "next/navigation";
import {
  useActiveQuestionnaireDefinition,
  useActiveQuestionnaireDefinitionResolved,
} from "@/components/questionnaire/DynamicQuestionnaireOverride";
import { findPageForRoute } from "@/lib/questionnaires/navigation";
import { getInternalIntakeHref } from "@/lib/routes";

/**
 * Page behind every `/intake/<visa>/<anything-else>` URL that has no hand-written screen.
 *
 * Administrator-created sections live only in the questionnaire definition, so there is no file
 * for them. `QuestionnaireDefinitionContent` (in the intake layout) renders the dynamic page for
 * any route the definition contains; this component is only reached while the definition is still
 * loading, or for a route the definition does not contain / that has no questions yet.
 */
export default function CustomQuestionnaireRoute() {
  const pathname = usePathname();
  const definition = useActiveQuestionnaireDefinition();
  const resolved = useActiveQuestionnaireDefinitionResolved();
  const route = getInternalIntakeHref(pathname).split("?")[0].replace(/\/+$/, "");

  if (!resolved) {
    return <div data-testid="custom-section-loading" className="rounded-2xl bg-white p-8 text-sm text-gray-600 shadow-md">Loading questionnaire…</div>;
  }

  const page = definition ? findPageForRoute(definition, route) : null;
  if (page) {
    return (
      <div data-testid="custom-section-empty" className="rounded-2xl bg-white p-8 text-sm text-gray-600 shadow-md">
        <h2 className="text-lg font-semibold text-slate-900">{page.title}</h2>
        <p className="mt-2">This section has no questions yet.</p>
      </div>
    );
  }

  return (
    <div role="status" data-testid="custom-section-not-found" className="rounded-2xl bg-white p-8 text-sm text-gray-600 shadow-md">
      <h2 className="text-lg font-semibold text-slate-900">Section not found</h2>
      <p className="mt-2">This section is not part of your questionnaire. Use the steps on the left to continue.</p>
    </div>
  );
}
