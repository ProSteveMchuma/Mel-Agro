import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { enforceRateLimit } from "@/lib/request-guard";
import { reportIncident } from "@/lib/incident-reporting";

const subscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  website: z.string().max(500).optional().default(""),
});

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "newsletter-subscribe", 5, 60 * 60_000);
  if (limited) return limited;

  try {
    const parsed = subscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    }

    // Silently accept honeypot submissions without storing them.
    if (parsed.data.website) {
      return NextResponse.json({ success: true, message: "Thanks. Please check your inbox for future updates." });
    }

    const email = parsed.data.email;
    const id = createHash("sha256").update(email).digest("hex");
    const ref = adminDb.collection("newsletterSubscriptions").doc(id);
    const existing = await ref.get();
    const now = new Date().toISOString();

    await ref.set({
      email,
      status: "active",
      source: "homepage-newsletter",
      consentText: "Seasonal planting reminders, practical guides, and selected offers by email.",
      subscribedAt: existing.data()?.subscribedAt || now,
      updatedAt: now,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: existing.exists
        ? "You are already subscribed and will continue receiving Mel-Agri updates."
        : "Thanks. You are now subscribed to Mel-Agri updates.",
    });
  } catch (error) {
    void reportIncident({
      type: "notification_failure",
      severity: "warning",
      source: "newsletter-subscribe",
      message: "Newsletter subscription storage failed",
    });
    console.error("Newsletter subscription error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ success: false, message: "We could not save your subscription. Please try again." }, { status: 500 });
  }
}
