import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message } = body ?? {};

    if (
      !name || typeof name !== "string" || !name.trim() ||
      !email || typeof email !== "string" || !email.trim() ||
      !message || typeof message !== "string" || !message.trim()
    ) {
      return NextResponse.json({ ok: false, error: "All fields are required." }, { status: 400 });
    }

    await resend.emails.send({
      from: "Roots Contact <onboarding@resend.dev>",
      to: "dan.rohin.crm@gmail.com",
      subject: `New Roots contact form message from ${name.trim()}`,
      text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json({ ok: false, error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
