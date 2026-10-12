import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import { getDb } from "@/lib/firebase-admin";
import { ZohoCRMClient } from "@/lib/zohoClient";
import { parseCrmSyncRequestBody, runQuestionnaireCrmSync } from "@/lib/crm/runQuestionnaireCrmSync.js";

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

    const client = createFirestoreClient(getBearerToken(request), request.signal);
    const application = await getOwnedApplication(client, auth, parsed.applicationId);
    const database = getDb();
    if (!database.ok) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500, headers },
      );
    }

    const result = await runQuestionnaireCrmSync({
      db: database.db,
      application: { id: parsed.applicationId, ...application },
      authUid: auth.uid,
      mode: parsed.mode,
      pageId: parsed.pageId,
      profileId: parsed.profileId,
      zoho: new ZohoCRMClient(),
    });
    return NextResponse.json(result.body, { status: result.httpStatus, headers });
  } catch (error) {
    if (error?.status) return resourceErrorResponse(error);
    console.error("[intake/crm-sync] failed", { code: error?.code || error?.name || "crm_sync_failed" });
    return NextResponse.json(
      { success: false, error: "CRM synchronization failed" },
      { status: 502, headers },
    );
  }
}
