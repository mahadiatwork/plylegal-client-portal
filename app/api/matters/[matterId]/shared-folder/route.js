import { NextResponse } from "next/server";
import { getBearerToken, requireClient, verifyFirebaseIdentity } from "@/lib/serverAuth";
import { createFirestoreClient, getOwnedApplication, resourceErrorResponse } from "@/lib/firestoreClient";
import { loadClientSharedFolderAccess } from "@/lib/clientSharedFolder.server";

export async function GET(request, { params }) {
  try {
    const auth = await verifyFirebaseIdentity(request);
    const clientCheck = requireClient(auth);
    if (!clientCheck.authorized) {
      return NextResponse.json(
        { success: false, error: clientCheck.error },
        { status: clientCheck.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const { matterId } = await params;
    const client = createFirestoreClient(getBearerToken(request), request.signal);
    const application = await getOwnedApplication(client, auth, matterId);
    const sharedFolder = await loadClientSharedFolderAccess(application);

    return NextResponse.json(
      { success: true, sharedFolder },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[shared-folder] Load failed", { status: error.status || 502, code: error.name });
    const response = resourceErrorResponse(error);
    if (response.status !== 502) return response;
    return NextResponse.json(
      { success: false, error: "Unable to load your shared folder. Please try again." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
