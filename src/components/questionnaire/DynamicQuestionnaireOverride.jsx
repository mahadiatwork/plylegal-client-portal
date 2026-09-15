"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DynamicQuestionnairePage } from "@/components/questionnaire/DynamicQuestionnairePage";
import { getRemoteQuestionnaireDefinitionStrict } from "@/lib/questionnaires";

const ActiveQuestionnaireDefinitionContext = createContext({
  definition: null,
  replaceDefinition: () => {},
});

export function useActiveQuestionnaireDefinition() {
  return useContext(ActiveQuestionnaireDefinitionContext).definition;
}

export function useActiveQuestionnaireDefinitionController() {
  return useContext(ActiveQuestionnaireDefinitionContext);
}

export function DynamicQuestionnaireOverride({
  children,
  ready = true,
  route,
  visaContext = null,
  visaType,
}) {
  const remoteDefinitionsEnabled = process.env.NEXT_PUBLIC_DATABASE_TYPE === "firebase";
  const audienceKey = `${visaType || ""}|${visaContext || ""}`;
  const [resolved, setResolved] = useState({ key: null, definition: null, status: "idle" });

  const replaceDefinition = useCallback((definition) => {
    setResolved({ key: audienceKey, definition, status: "ready" });
  }, [audienceKey]);

  useEffect(() => {
    let cancelled = false;

    if (!remoteDefinitionsEnabled || !ready || !visaType) {
      return () => {
        cancelled = true;
      };
    }

    getRemoteQuestionnaireDefinitionStrict({ visaContext, visaType })
      .then((definition) => {
        if (!cancelled) setResolved({ key: audienceKey, definition, status: "ready" });
      })
      .catch((error) => {
        console.warn("Could not resolve a remote questionnaire page.", error);
        if (!cancelled) setResolved({ key: audienceKey, definition: null, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [audienceKey, ready, remoteDefinitionsEnabled, visaContext, visaType]);

  const normalizedRoute = String(route || "").split("?")[0];
  const remotePage = resolved.key === audienceKey
    ? resolved.definition?.pages?.find((page) => page.route === normalizedRoute) || null
    : null;
  const activeDefinition = remoteDefinitionsEnabled && resolved.key === audienceKey
    ? resolved.definition
    : null;
  const contextValue = useMemo(() => ({
    definition: activeDefinition,
    replaceDefinition,
  }), [activeDefinition, replaceDefinition]);

  let content = children;
  if (remoteDefinitionsEnabled && (!ready || resolved.key !== audienceKey)) {
    content = (
      <div className="rounded-2xl bg-white p-8 text-sm text-gray-600 shadow-md">
        Loading questionnaire…
      </div>
    );
  } else if (remoteDefinitionsEnabled && resolved.status === "error") {
    content = (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-800 shadow-md">
        We could not securely load the current questionnaire. Refresh the page to try again.
      </div>
    );
  } else if (remotePage) {
    content = (
      <DynamicQuestionnairePage
        key={`${resolved.definition.id}:${resolved.definition.revision}:${remotePage.id}`}
        definitionId={resolved.definition.id}
        definitionRevision={resolved.definition.revision}
        pageDefinition={remotePage}
        route={route}
      />
    );
  }

  return (
    <ActiveQuestionnaireDefinitionContext.Provider value={contextValue}>
      {content}
    </ActiveQuestionnaireDefinitionContext.Provider>
  );
}
