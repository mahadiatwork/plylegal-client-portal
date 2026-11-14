import { normalizeQuestionnaireDefinition, questionnaireDefinitionMatches } from "./index.js";

/**
 * Local development / e2e only: lets a parity test render an exact admin-exported
 * definition without Firebase. Never active when NEXT_PUBLIC_DATABASE_TYPE is
 * "firebase", so production clients cannot be affected by browser storage.
 */
export const LOCAL_QUESTIONNAIRE_OVERRIDE_KEY = "ply:questionnaireDefinitionOverride";

export function readLocalQuestionnaireDefinitionOverride({ visaType, visaContext } = {}) {
  if (typeof window === "undefined") return null;
  if (process.env.NEXT_PUBLIC_DATABASE_TYPE === "firebase") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_QUESTIONNAIRE_OVERRIDE_KEY);
    if (!raw) return null;
    const definition = normalizeQuestionnaireDefinition(JSON.parse(raw));
    if (!definition || !questionnaireDefinitionMatches(definition, { visaType, visaContext })) return null;
    return definition;
  } catch (error) {
    console.warn("Ignoring invalid local questionnaire definition override.", error);
    return null;
  }
}
