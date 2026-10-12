import { writeFile } from "node:fs/promises";
import { describeCrmSeedPlan, seedDefinitionCrmMappings } from "../src/lib/crm/questionnaireCrmSeed.js";
import { getCrmCoverageSummary } from "../src/lib/crm/questionnaireCrmContract.js";

const write = process.argv.includes("--write");

async function loadDefinitions(db) {
  const snapshot = await db.collection("questionnaireDefinitions").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function main() {
  const { getDb } = await import("../src/lib/firebase-admin.js");
  const database = getDb();
  if (!database.ok) {
    console.error(database.error);
    process.exit(1);
  }
  const definitions = await loadDefinitions(database.db);
  const report = [];
  for (const definition of definitions) {
    if (!["draft", "active"].includes(definition.status)) continue;
    const rows = describeCrmSeedPlan(definition);
    report.push(...rows);
    if (!write) continue;
    const seeded = seedDefinitionCrmMappings(definition);
    const coverage = getCrmCoverageSummary(seeded);
    const backupPath = `C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\kilo\\crm-seed-${definition.id}-${Date.now()}.json`;
    await writeFile(backupPath, JSON.stringify(definition), "utf8");
    const nextRevision = Number(definition.revision || 0) + 1;
    await database.db.collection("questionnaireDefinitions").doc(definition.id).set({
      ...seeded,
      revision: nextRevision,
      updatedAt: new Date().toISOString(),
    });
    console.error(`wrote ${definition.id} revision ${nextRevision} coverage=${JSON.stringify(coverage)} backup=${backupPath}`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (!write) {
    console.error(`dry-run ${report.length} questions; pass --write to apply`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
