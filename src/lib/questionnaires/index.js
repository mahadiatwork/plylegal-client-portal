import { questionnaireDefinitions } from "./temporaryWork482.definition";
import { validateQuestionnaireDefinition } from "./validation";

const definitionsById = new Map(questionnaireDefinitions.map((definition) => [definition.id, definition]));

function getLocalDefinition({ definitionId, visaType, visaContext } = {}) {
  if (definitionId && definitionsById.has(definitionId)) {
    return definitionsById.get(definitionId);
  }

  return questionnaireDefinitions.find((definition) => {
    if (visaType && definition.visaType !== visaType) return false;
    if (visaContext && definition.visaContext !== visaContext) return false;
    return definition.status === "active";
  }) || null;
}

function sortPages(pages = []) {
  return [...pages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function normalizeDefinition(definition, pages = definition?.pages || []) {
  if (!definition) return null;
  const normalized = {
    ...definition,
    pages: sortPages(pages),
  };
  validateQuestionnaireDefinition(normalized);
  return normalized;
}

async function loadFirestoreDefinition(localDefinition) {
  if (typeof window === "undefined") return null;
  if (process.env.NEXT_PUBLIC_DATABASE_TYPE !== "firebase") return null;
  if (!localDefinition?.id) return null;

  try {
    const firestore = await import("firebase/firestore");
    const firebase = await import("@/lib/firebase");
    const definitionRef = firestore.doc(firebase.db, "questionnaireDefinitions", localDefinition.id);
    const definitionSnap = await firestore.getDoc(definitionRef);

    if (!definitionSnap.exists()) return null;
    const definitionData = definitionSnap.data();
    if (definitionData.status !== "active") return null;

    const pagesSnap = await firestore.getDocs(
      firestore.query(
        firestore.collection(firebase.db, "questionnaireDefinitions", localDefinition.id, "pages"),
        firestore.orderBy("order", "asc")
      )
    );

    const pages = pagesSnap.docs.map((pageDoc) => ({
      id: pageDoc.id,
      ...pageDoc.data(),
    }));

    return normalizeDefinition(
      {
        ...localDefinition,
        ...definitionData,
        id: definitionSnap.id,
      },
      pages.length ? pages : localDefinition.pages
    );
  } catch (error) {
    console.warn("Could not load Firestore questionnaire definition; using local definition.", error);
    return null;
  }
}

export async function getQuestionnaireDefinition({ definitionId, visaType, visaContext } = {}) {
  const localDefinition = normalizeDefinition(getLocalDefinition({ definitionId, visaType, visaContext }));
  const firestoreDefinition = await loadFirestoreDefinition(localDefinition);
  return firestoreDefinition || localDefinition;
}

export async function getQuestionnairePage({ definitionId, route, visaType, visaContext } = {}) {
  const definition = await getQuestionnaireDefinition({ definitionId, visaType, visaContext });
  if (!definition) return null;

  const normalizedRoute = String(route || "").split("?")[0];
  return definition.pages.find((page) => page.route === normalizedRoute || page.id === route) || null;
}

export function getLocalQuestionnaireDefinition(args = {}) {
  return normalizeDefinition(getLocalDefinition(args));
}
