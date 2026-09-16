import { NextResponse } from "next/server";
import { requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import {
  normalizeQuestionnaireDefinition,
  selectActiveQuestionnaireDefinition,
  selectQuestionnaireDefinitionPages,
} from "@/lib/questionnaires";

export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store" };
const visaTypes = new Set(["temporary-work", "partner", "protection"]);
const safeId = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export async function GET(request) {
  try {
    const auth = await verifyFirebaseIdentity(request);
    const access = requireClient(auth);
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status, headers });
    }

    const params = new URL(request.url).searchParams;
    const args = Object.fromEntries(["definitionId", "visaType", "visaContext"].map((key) => [key, params.get(key) || undefined]));
    if (
      (args.definitionId && !safeId.test(args.definitionId)) ||
      (args.visaType && !visaTypes.has(args.visaType)) ||
      (args.visaContext && !["186", "482"].includes(args.visaContext))
    ) {
      return NextResponse.json({ success: false, error: "Invalid questionnaire selection" }, { status: 400, headers });
    }

    // Only published question wording is read here. This endpoint never reads
    // applications, applicant answers, drafts, or definition revision history.
    const { getDb } = await import("@/lib/firebase-admin");
    const database = getDb();
    if (!database.ok) throw new Error("Questionnaire database is unavailable");
    const collection = database.db.collection("questionnaireDefinitions");
    const snapshot = args.definitionId
      ? await collection.doc(args.definitionId).get().then((doc) => ({ docs: doc.exists ? [doc] : [] }))
      : await collection.where("status", "==", "active").get();
    const selected = selectActiveQuestionnaireDefinition(
      snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
      args,
    );
    if (!selected) {
      return NextResponse.json({ success: true, definition: null }, { headers });
    }

    let legacyPages = [];
    if (!Object.prototype.hasOwnProperty.call(selected, "pages")) {
      const pages = await collection.doc(selected.id).collection("pages").get();
      legacyPages = pages.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    }
    const definition = normalizeQuestionnaireDefinition(
      selected,
      selectQuestionnaireDefinitionPages(selected, legacyPages),
    );
    // The browser needs form content and version information, not admin audit data.
    const { createdBy, updatedBy, publishedBy, archivedBy, ...publishedDefinition } = definition;
    return NextResponse.json({ success: true, definition: publishedDefinition }, { headers });
  } catch (error) {
    console.error("[questionnaires/definition] Published definition read failed", { code: error?.code || "unavailable" });
    return NextResponse.json(
      { success: false, error: "Unable to load the published questionnaire. Please try again." },
      { status: 503, headers },
    );
  }
}
