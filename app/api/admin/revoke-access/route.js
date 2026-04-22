import { NextResponse } from "next/server";
import { adminAuth, db } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.ZOHO_WEBHOOK_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, zohoContactId } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const userRecord = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(userRecord.uid, { disabled: true });
    await adminAuth.revokeRefreshTokens(userRecord.uid);

    const userRef = db.collection("users").doc(userRecord.uid);
    await userRef.set(
      {
        portalAccess: false,
        Needs_Password_Change: true,
        needsPasswordChange: true,
        Password_Reset_Token: "",
        Temporary_Password: "",
        zohoContactId: zohoContactId || "",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, userId: userRecord.uid });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return NextResponse.json({ success: true, message: "User already absent" });
    }
    return NextResponse.json(
      { error: error.message || "Failed to revoke access" },
      { status: 500 }
    );
  }
}
