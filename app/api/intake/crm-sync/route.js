import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import { getDb } from "@/lib/firebase-admin";
import { ZohoCRMClient } from "@/lib/zohoClient";
import { getCrmSyncFlags } from "@/lib/crm/crmSyncFlags.js";
import { parseCrmSyncRequestBody, runQuestionnaireCrmSync, runQuestionnaireCrmSyncWithClient } from "@/lib/crm/runQuestionnaireCrmSync.js";

export const runtime = "nodejs";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request) {
  try {
    const auth = await verifyFirebaseIdentity(request);
    const access = requireClient(auth);
    if (!access.authorized) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status, headers });
    }

    const body = await request.json().catch(() => null);
    const parsed = parseCrmSyncRequestBody(body);
    if (parsed.error) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: parsed.status, headers });
    }

    const flags = getCrmSyncFlags();
    if (!flags.enabled) {
      return NextResponse.json(
        { success: true, skipped: true, reason: "feature_disabled" },
        { headers },
      );
    }
    const client = createFirestoreClient(getBearerToken(request), request.signal);
    const application = await getOwnedApplication(client, auth, parsed.applicationId);
    const sync = {
      // Use the document ID whose ownership was verified, even if its data contains an id field.
      application: { ...application, id: parsed.applicationId },
      mode: parsed.mode,
      pageId: parsed.pageId,
      profileId: parsed.profileId,
      zoho: new ZohoCRMClient(),
      flags,
    };
    const database = getDb();
    let result;
    if (database.ok) {
      try {
        result = await runQuestionnaireCrmSync({ ...sync, db: database.db });
      } catch (error) {
        // A failed Admin read must not block the owner-scoped Firestore path.
        console.error("[intake/crm-sync] Admin Firestore path failed", { code: error?.code || error?.name || "unknown" });
      }
    }
    if (!result) {
      // The initial owner read's timeout may have elapsed while trying Admin.
      result = await runQuestionnaireCrmSyncWithClient({
        ...sync,
        client: createFirestoreClient(getBearerToken(request), request.signal),
      });
    }
    return NextResponse.json(result.body, { status: result.httpStatus, headers });
  } catch (error) {
    if (error?.status) return resourceErrorResponse(error);
    console.error("[intake/crm-sync] failed", { code: error?.code || error?.name || "crm_sync_failed" });
    return NextResponse.json(
      { success: false, error: { code: "crm_sync_server_error", message: "CRM synchronization failed on the server" } },
      { status: 502, headers },
    );
  }
}
