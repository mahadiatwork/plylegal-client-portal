import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";
import { questionnaireDefinitions } from "../src/lib/questionnaires/temporaryWork482.definition.js";
import { validateQuestionnaireDefinition } from "../src/lib/questionnaires/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  const envText = fs.readFileSync(envPath, "utf8");
  envText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

function getServiceAccount() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is required to seed questionnaire definitions.");
  }

  const serviceAccount = JSON.parse(rawKey);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  return serviceAccount;
}

function getDefinitionDoc(definition, now) {
  const visaContexts = Array.isArray(definition.visaContexts)
    ? definition.visaContexts
    : definition.visaContext
      ? [definition.visaContext]
      : [];
  return {
    ...definition,
    schemaVersion: definition.schemaVersion || 1,
    visaContexts,
    revision: 1,
    createdAt: now,
    createdBy: "questionnaire-seed",
    updatedAt: now,
    updatedBy: "questionnaire-seed",
  };
}

function contextsOverlap(left, right) {
  const leftContexts = Array.isArray(left?.visaContexts) ? left.visaContexts : [];
  const rightContexts = Array.isArray(right?.visaContexts) ? right.visaContexts : [];
  if (leftContexts.length === 0 || rightContexts.length === 0) return true;
  const rightSet = new Set(rightContexts.map((value) => String(value).toLowerCase()));
  return leftContexts.some((value) => rightSet.has(String(value).toLowerCase()));
}

async function seedDefinition(db, definition) {
  validateQuestionnaireDefinition(definition);

  const definitions = db.collection("questionnaireDefinitions");
  const revisions = db.collection("questionnaireDefinitionRevisions");
  const definitionRef = definitions.doc(definition.id);
  const result = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(definitionRef);
    if (existing.exists) {
      const existingData = existing.data() || {};
      const revision = Number.isInteger(existingData.revision) ? existingData.revision : 0;
      const legacyPages = Object.prototype.hasOwnProperty.call(existingData, "pages")
        ? null
        : await transaction.get(definitionRef.collection("pages"));
      const revisionRef = revisions.doc(`${definition.id}__${revision}`);
      const revisionSnapshot = await transaction.get(revisionRef);
      if (!revisionSnapshot.exists) {
        transaction.create(revisionRef, {
          ...existingData,
          id: definition.id,
          definitionId: definition.id,
          revision,
          pages: legacyPages
            ? legacyPages.docs.map((pageDoc) => ({ id: pageDoc.id, ...pageDoc.data() }))
            : existingData.pages || [],
          capturedAt: new Date(),
        });
      }
      return { skipped: true, backfilled: !revisionSnapshot.exists };
    }

    const sameVisaType = await transaction.get(
      definitions.where("visaType", "==", definition.visaType)
    );
    const conflict = sameVisaType.docs.find((doc) => {
      if (doc.id === definition.id) return false;
      const candidate = doc.data() || {};
      return candidate.status === "active" && contextsOverlap(candidate, definition);
    });
    if (conflict) {
      throw new Error(
        `Cannot seed ${definition.id}: active definition ${conflict.id} overlaps this audience. Use the admin builder to manage lifecycle changes.`
      );
    }

    const now = new Date();
    const definitionDoc = getDefinitionDoc(definition, now);
    const revisionRef = revisions.doc(`${definition.id}__${definitionDoc.revision}`);
    const previousIdentity = await transaction.get(
      revisions.where("definitionId", "==", definition.id).limit(1)
    );
    if (!previousIdentity.empty) {
      throw new Error(
        `Cannot seed ${definition.id}: this definition ID was used previously.`
      );
    }

    transaction.create(definitionRef, definitionDoc);
    transaction.create(revisionRef, {
      ...definitionDoc,
      definitionId: definition.id,
      capturedAt: now,
    });
    return { skipped: false };
  });

  if (result.skipped) {
    console.log(
      `Skipped ${definition.id}; it already exists${result.backfilled ? " and its current revision history was backfilled" : ""}. Edit it in Admin → Questionnaires.`
    );
    return;
  }
  console.log(`Seeded ${definition.id} with revision history (${definition.pages.length} page${definition.pages.length === 1 ? "" : "s"})`);
}

async function main() {
  loadEnvFile();

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required to seed questionnaire definitions.");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(getServiceAccount()),
      projectId,
    });
  }

  const db = admin.firestore();
  for (const definition of questionnaireDefinitions) {
    await seedDefinition(db, definition);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
