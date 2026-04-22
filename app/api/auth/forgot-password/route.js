import { NextResponse } from "next/server";
import crypto from "crypto";
import zohoClient from "@/lib/zohoClient";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: true });
    }

    const contact = await zohoClient.findContactByEmail(email);
    if (!contact) {
      return NextResponse.json({ success: true });
    }

    const portalAccess = String(contact.Portal_Access || "Inactive").toLowerCase();
    if (portalAccess !== "active") {
      return NextResponse.json({ success: true });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    await zohoClient.updateRecord("Contacts", contact.id, {
      Password_Reset_Token: tokenHash,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;

    const webhookUrl = process.env.PORTAL_RESET_EMAIL_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resetLink,
          contactId: contact.id,
        }),
      });
    } else {
      console.warn("PORTAL_RESET_EMAIL_WEBHOOK_URL not configured; reset link generated but not emailed.");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ success: true });
  }
}
