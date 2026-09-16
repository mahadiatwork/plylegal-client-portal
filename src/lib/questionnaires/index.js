import { questionnaireDefinitions } from "./temporaryWork482.definition.js";
import { loadAuthenticatedQuestionnaireDefinition } from "./remoteLoading.js";
import { findQuestionnaireDefinitionPage } from "./pageRoutes.js";
import {
  isSafeQuestionnaireRoute,
  validateQuestionnaireDefinition,
} from "./validation.js";

const definitionsById = new Map(questionnaireDefinitions.map((definition) => [definition.id, definition]));

export function getQuestionnaireVisaContexts(definition = {}) {
  if (Array.isArray(definition.visaContexts)) {
    return definition.visaContexts
      .filter((context) => typeof context === "string" && context.trim())
      .map((context) => context.trim());
  }

  if (typeof definition.visaContext === "string" && definition.visaContext.trim()) {
    return [definition.visaContext.trim()];
  }

  return [];
}

export function questionnaireDefinitionMatches(
  definition,
  { definitionId, visaType, visaContext, status = "active" } = {}
) {
  if (!definition || typeof definition !== "object") return false;
  if (definitionId && definition.id !== definitionId) return false;
  if (status && definition.status !== status) return false;
  if (visaType && definition.visaType !== visaType) return false;

  const contexts = getQuestionnaireVisaContexts(definition);
  if (contexts.length === 0) return true;

  const requestedContext = typeof visaContext === "string" ? visaContext.trim() : "";
  return Boolean(requestedContext) && contexts.includes(requestedContext);
}

function timestampMillis(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function definitionSpecificity(definition) {
  return getQuestionnaireVisaContexts(definition).length > 0 ? 1 : 0;
}

export function selectActiveQuestionnaireDefinition(definitions = [], args = {}) {
  return [...definitions]
    .filter((definition) => questionnaireDefinitionMatches(definition, args))
    .sort((left, right) => {
      const specificity = definitionSpecificity(right) - definitionSpecificity(left);
      if (specificity !== 0) return specificity;

      const updated = timestampMillis(right.updatedAt) - timestampMillis(left.updatedAt);
      if (updated !== 0) return updated;

      const version = String(right.version || "").localeCompare(String(left.version || ""), undefined, {
        numeric: true,
      });
      if (version !== 0) return version;

      return String(left.id || "").localeCompare(String(right.id || ""));
    })[0] || null;
}

function sortPages(pages = []) {
  if (!Array.isArray(pages)) return pages;
  return [...pages].sort((left, right) => {
    const order = (left?.order ?? 0) - (right?.order ?? 0);
    if (order !== 0) return order;
    return String(left?.id || "").localeCompare(String(right?.id || ""));
  });
}

export function selectQuestionnaireDefinitionPages(definitionData = {}, legacyPages = []) {
  if (Object.prototype.hasOwnProperty.call(definitionData, "pages")) {
    return definitionData.pages;
  }
  return legacyPages;
}

export function normalizeQuestionnaireDefinition(definition, pages = definition?.pages || []) {
  if (!definition) return null;
  const normalized = {
    ...definition,
    visaContexts: getQuestionnaireVisaContexts(definition),
    pages: sortPages(pages),
  };
  validateQuestionnaireDefinition(normalized);
  return normalized;
}

function getLocalDefinition({ definitionId, visaType, visaContext } = {}) {
  if (definitionId && definitionsById.has(definitionId)) {
    return definitionsById.get(definitionId);
  }

  if (!definitionId && !visaType && visaContext === undefined) {
    return questionnaireDefinitions.find((definition) => definition.status === "active") || null;
  }

  return selectActiveQuestionnaireDefinition(questionnaireDefinitions, { visaType, visaContext });
}

function canLoadRemoteDefinitions() {
  return typeof window !== "undefined" && process.env.NEXT_PUBLIC_DATABASE_TYPE === "firebase";
}

async function loadLegacyPages(firestore, db, definitionId) {
  const pagesSnap = await firestore.getDocs(
    firestore.collection(db, "questionnaireDefinitions", definitionId, "pages")
  );

  return pagesSnap.docs.map((pageDoc) => ({
    ...pageDoc.data(),
    id: pageDoc.id,
  }));
}

async function hydrateRemoteDefinition(firestore, db, definitionSnap) {
  if (!definitionSnap?.exists()) return null;

  const definitionData = definitionSnap.data();
  let legacyPages = [];
  if (!Object.prototype.hasOwnProperty.call(definitionData, "pages")) {
    legacyPages = await loadLegacyPages(firestore, db, definitionSnap.id);
  }

  return normalizeQuestionnaireDefinition(
    {
      ...definitionData,
      id: definitionSnap.id,
    },
    selectQuestionnaireDefinitionPages(definitionData, legacyPages)
  );
}

async function readFirestoreDefinition(firestore, firebase, { definitionId, visaType, visaContext } = {}) {
  if (definitionId) {
    const definitionSnap = await firestore.getDoc(
      firestore.doc(firebase.db, "questionnaireDefinitions", definitionId)
    );
    if (!definitionSnap.exists()) return null;

    const candidate = {
      ...definitionSnap.data(),
      id: definitionSnap.id,
    };
    if (!questionnaireDefinitionMatches(candidate, { definitionId, visaType, visaContext })) return null;

    return hydrateRemoteDefinition(firestore, firebase.db, definitionSnap);
  }

  const definitionsSnap = await firestore.getDocs(
    firestore.query(
      firestore.collection(firebase.db, "questionnaireDefinitions"),
      firestore.where("status", "==", "active")
    )
  );

  const selected = selectActiveQuestionnaireDefinition(
    definitionsSnap.docs.map((definitionSnap) => ({ ...definitionSnap.data(), id: definitionSnap.id })),
    { visaType, visaContext }
  );
  if (!selected) return null;

  return hydrateRemoteDefinition(
    firestore,
    firebase.db,
    definitionsSnap.docs.find((definitionSnap) => definitionSnap.id === selected.id)
  );
}

async function readServerDefinition(args, token) {
  const params = new URLSearchParams();
  for (const key of ["definitionId", "visaType", "visaContext"]) {
    if (args[key]) params.set(key, args[key]);
  }
  const response = await fetch(`/api/questionnaires/definition?${params}`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true || !("definition" in payload)) {
    const error = new Error("Unable to load the published questionnaire. Please try again.");
    error.code = response.status === 401 ? "unauthenticated" : "unavailable";
    throw error;
  }
  if (payload.definition === null) return null;
  if (!questionnaireDefinitionMatches(payload.definition, args)) {
    throw new Error("The published questionnaire does not match this application.");
  }
  return normalizeQuestionnaireDefinition(payload.definition);
}

async function loadFirestoreDefinitionUnchecked(args = {}) {
  if (!canLoadRemoteDefinitions()) return null;

  const [firestore, firebase] = await Promise.all([
    import("firebase/firestore"),
    import("@/lib/firebase"),
  ]);
  return loadAuthenticatedQuestionnaireDefinition({
    auth: firebase.auth,
    loadFromFirestore: () => readFirestoreDefinition(firestore, firebase, args),
    loadFromServer: (token) => readServerDefinition(args, token),
  });
}

async function loadFirestoreDefinition(args = {}) {
  try {
    return await loadFirestoreDefinitionUnchecked(args);
  } catch (error) {
    console.warn("Could not load a Firestore questionnaire definition.", error);
    return null;
  }
}

export async function getRemoteQuestionnaireDefinition(args = {}) {
  return loadFirestoreDefinition(args);
}

/**
 * Load the current remote definition without converting transport or schema
 * failures into an apparent "no active definition" result.
 */
export async function getRemoteQuestionnaireDefinitionStrict(args = {}) {
  return loadFirestoreDefinitionUnchecked(args);
}

export async function getRemoteQuestionnairePage({ route, ...args } = {}) {
  const normalizedRoute = String(route || "").split("?")[0];
  if (!isSafeQuestionnaireRoute(normalizedRoute)) return null;

  const definition = await getRemoteQuestionnaireDefinition(args);
  if (!definition) return null;

  return findQuestionnaireDefinitionPage(definition, normalizedRoute) || definition.pages.find(
    (page) => page.route === normalizedRoute || page.id === route
  ) || null;
}

export async function getQuestionnaireDefinition({ definitionId, visaType, visaContext } = {}) {
  const localDefinition = normalizeQuestionnaireDefinition(
    getLocalDefinition({ definitionId, visaType, visaContext })
  );
  const remoteDefinition = await getRemoteQuestionnaireDefinition({
    definitionId,
    visaType: visaType || localDefinition?.visaType,
    visaContext: visaContext === undefined ? localDefinition?.visaContext : visaContext,
  });
  return remoteDefinition || localDefinition;
}

export async function getQuestionnairePage({ definitionId, route, visaType, visaContext } = {}) {
  const remotePage = await getRemoteQuestionnairePage({ definitionId, route, visaType, visaContext });
  if (remotePage) return remotePage;

  const localDefinition = normalizeQuestionnaireDefinition(
    getLocalDefinition({ definitionId, visaType, visaContext })
  );
  if (!localDefinition) return null;

  const normalizedRoute = String(route || "").split("?")[0];
  return localDefinition.pages.find(
    (page) => page.route === normalizedRoute || page.id === route
  ) || null;
}

export function getLocalQuestionnaireDefinition(args = {}) {
  return normalizeQuestionnaireDefinition(getLocalDefinition(args));
}
