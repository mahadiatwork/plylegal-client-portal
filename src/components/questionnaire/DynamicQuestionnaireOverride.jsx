"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getRemoteQuestionnaireDefinitionStrict } from "@/lib/questionnaires";
import { withQuestionnaireLoadTimeout } from "@/lib/questionnaires/remoteLoading";
import { QuestionnaireDefinitionContent } from "@/components/questionnaire/QuestionnaireDefinitionContent";

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
  const [retryAttempt, setRetryAttempt] = useState(0);

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

    setResolved({ key: audienceKey, definition: null, status: "loading" });
    withQuestionnaireLoadTimeout(() => getRemoteQuestionnaireDefinitionStrict({ visaContext, visaType }))
      .then((definition) => {
        if (!cancelled) setResolved({ key: audienceKey, definition, status: "ready" });
      })
      .catch((error) => {
        console.warn("Could not resolve a remote questionnaire page.", error);
        if (!cancelled) setResolved({ key: audienceKey, definition: null, status: "error", errorCode: error?.code });
      });

    return () => {
      cancelled = true;
    };
  }, [audienceKey, ready, remoteDefinitionsEnabled, retryAttempt, visaContext, visaType]);

  const activeDefinition = remoteDefinitionsEnabled && resolved.key === audienceKey
    ? resolved.definition
    : null;
  const contextValue = useMemo(() => ({
    definition: activeDefinition,
    replaceDefinition,
  }), [activeDefinition, replaceDefinition]);

  return (
    <ActiveQuestionnaireDefinitionContext.Provider value={contextValue}>
      <QuestionnaireDefinitionContent
        definition={activeDefinition}
        errorCode={resolved.errorCode}
        hasLoadError={remoteDefinitionsEnabled && resolved.key === audienceKey && resolved.status === "error"}
        loading={remoteDefinitionsEnabled && (!ready || (visaType && (resolved.key !== audienceKey || resolved.status === "loading")))}
        onRetry={() => setRetryAttempt((attempt) => attempt + 1)}
        route={route}
      >
        {children}
      </QuestionnaireDefinitionContent>
    </ActiveQuestionnaireDefinitionContext.Provider>
  );
}
