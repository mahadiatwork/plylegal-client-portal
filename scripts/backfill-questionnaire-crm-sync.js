import { getCrmSyncFlags } from "../src/lib/crm/crmSyncFlags.js";
import { runQuestionnaireCrmSync } from "../src/lib/crm/runQuestionnaireCrmSync.js";
import { ZohoCRMClient } from "../src/lib/zohoClient.js";

const write = process.argv.includes("--write");
const visaFilter = process.argv.find((arg) => arg.startsWith("--visa="))?.slice("--visa=".length);
const applicationFilter = process.argv.find((arg) => arg.startsWith("--application="))
  ?.slice("--application=".length);
const checkpoint = { lastId: null };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { getDb } = await import("../src/lib/firebase-admin.js");
  const database = getDb();
  if (!database.ok) {
    console.error(database.error);
    process.exit(1);
  }
  const flags = {
    ...getCrmSyncFlags(),
    enabled: true,
    dryRun: !write,
  };
  const snapshot = await database.db.collection("applications").get();
  let delay = 500;
  for (const doc of snapshot.docs) {
    const application = { id: doc.id, ...doc.data() };
    if (applicationFilter && doc.id !== applicationFilter) continue;
    if (visaFilter && String(application.visaTypeCode || application.type || "") !== visaFilter) continue;
    checkpoint.lastId = doc.id;
    const result = await runQuestionnaireCrmSync({
      db: database.db,
      application,
      authUid: application.userId,
      mode: "full",
      zoho: new ZohoCRMClient(),
      flags,
    });
    console.log(JSON.stringify({
      applicationId: doc.id,
      dryRun: !write,
      status: result.httpStatus,
      success: result.body?.success,
      jobId: result.body?.jobId || null,
      failed: result.body?.summary?.failed?.length || 0,
    }));
    if (result.httpStatus >= 500) {
      delay = Math.min(delay * 2, 15000);
      await sleep(delay);
    } else {
      delay = 500;
      await sleep(delay);
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message, checkpoint }));
  process.exit(1);
});
