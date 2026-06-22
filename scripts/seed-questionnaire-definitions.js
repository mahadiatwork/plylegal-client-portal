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

function getDefinitionDoc(definition) {
  const { pages, ...definitionDoc } = definition;
  return {
    ...definitionDoc,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

function getPageDoc(page) {
  return {
    ...page,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function seedDefinition(db, definition) {
  validateQuestionnaireDefinition(definition);

  const definitionRef = db.collection("questionnaireDefinitions").doc(definition.id);
  const existing = await definitionRef.get();
  const definitionDoc = getDefinitionDoc(definition);

  await definitionRef.set(
    {
      ...definitionDoc,
      createdAt: existing.exists
        ? existing.data().createdAt || admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  for (const page of definition.pages) {
    const pageRef = definitionRef.collection("pages").doc(page.id);
    const pageSnap = await pageRef.get();
    await pageRef.set(
      {
        ...getPageDoc(page),
        createdAt: pageSnap.exists
          ? pageSnap.data().createdAt || admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log(`Seeded ${definition.id} (${definition.pages.length} page${definition.pages.length === 1 ? "" : "s"})`);
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
