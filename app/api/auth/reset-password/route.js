import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuth, db } from "@/lib/firebase-admin";
import zohoClient from "@/lib/zohoClient";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a || "", "utf8");
  const bBuffer = Buffer.from(b || "", "utf8");
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export async function POST(request) {
  try {
    const { email, token, newPassword } = await request.json();
    if (!email || !token || !newPassword) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const contact = await zohoClient.findContactByEmail(email);
    if (!contact) {
      return NextResponse.json({ success: false, error: "Invalid reset request" }, { status: 400 });
    }

    const portalAccess = String(contact.Portal_Access || "Inactive").toLowerCase();
    if (portalAccess !== "active") {
      return NextResponse.json({ success: false, error: "Portal access is inactive" }, { status: 403 });
    }

    const storedHash = String(contact.Password_Reset_Token || "");
    const providedHash = hashToken(token);
    if (!storedHash || !safeEqual(storedHash, providedHash)) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 400 });
    }

    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(user.uid, {
      password: newPassword,
      disabled: false,
    });
    await adminAuth.revokeRefreshTokens(user.uid);
    await db.collection("users").doc(user.uid).set(
      {
        portalAccess: true,
        needsPasswordChange: false,
        Needs_Password_Change: false,
        temporaryPasswordHash: "",
        Password_Reset_Token: "",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await zohoClient.updateRecord("Contacts", contact.id, {
      Password_Reset_Token: "",
      Temporary_Password: "",
      Needs_Password_Change: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to reset password" },
      { status: 500 }
    );
  }
}
