import { NextResponse } from "next/server";
import zohoClient from "@/lib/zohoClient";

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const contact = await zohoClient.findContactByEmail(email);
    if (!contact) {
      return NextResponse.json({ success: true });
    }

    await zohoClient.updateRecord("Contacts", contact.id, {
      Temporary_Password: "",
      Password_Reset_Token: "",
      Needs_Password_Change: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("password-changed sync error:", error);
    return NextResponse.json({ success: true });
  }
}
