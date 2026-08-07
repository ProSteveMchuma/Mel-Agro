import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

const PAGE_SIZE = 25;
type Cursor = { at: string; id: string };
const encode = (value: Cursor) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decode = (value: string | null): Cursor | null => { try { const parsed = JSON.parse(Buffer.from(value || "", "base64url").toString()); return parsed && typeof parsed.at === "string" && typeof parsed.id === "string" ? parsed : null; } catch { return null; } };
function iso(value: unknown) { if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString(); return String(value || ""); }

export async function GET(request: Request) {
  const actor = await requirePermission(request, "customers.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const conversationId = params.get("conversationId");
  if (conversationId) {
    const conversation = await adminDb.collection("conversations").doc(conversationId).get();
    if (!conversation.exists) return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    const snapshot = await conversation.ref.collection("messages").orderBy("createdAt", "desc").limit(100).get();
    const messages = snapshot.docs.map((document) => ({ id: document.id, ...document.data(), createdAt: iso(document.data().createdAt) })).reverse();
    return NextResponse.json({ success: true, conversation: { id: conversation.id, ...conversation.data(), lastMessageAt: iso(conversation.data()?.lastMessageAt) }, messages, truncated: snapshot.size >= 100 });
  }
  const search = (params.get("q") || "").trim().toLowerCase().slice(0, 120);
  const status = ["open", "pending", "closed"].includes(params.get("status") || "") ? params.get("status") : "all";
  const owner = ["mine", "unassigned"].includes(params.get("owner") || "") ? params.get("owner") : "all";
  let cursor = decode(params.get("cursor"));
  const conversations: Record<string, unknown>[] = [];
  let scanned = 0; let exhausted = false;
  while (conversations.length <= PAGE_SIZE && scanned < 500 && !exhausted) {
    let query = adminDb.collection("conversations").orderBy("lastMessageAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(75);
    if (cursor) query = query.startAfter(new Date(cursor.at), cursor.id);
    const snapshot = await query.get();
    if (snapshot.empty) { exhausted = true; break; }
    scanned += snapshot.size;
    for (const document of snapshot.docs) {
      const data = document.data(); const at = iso(data.lastMessageAt); cursor = { at, id: document.id };
      const currentStatus = String(data.status || "open");
      if (status !== "all" && currentStatus !== status) continue;
      if (owner === "mine" && data.assignedTo !== actor.uid) continue;
      if (owner === "unassigned" && data.assignedTo) continue;
      if (search) { const haystack = [document.id, data.userName, data.userEmail, data.lastMessage].map((value) => String(value || "").toLowerCase()).join(" "); if (!haystack.includes(search)) continue; }
      conversations.push({ id: document.id, ...data, status: currentStatus, lastMessageAt: at });
      if (conversations.length > PAGE_SIZE) break;
    }
    exhausted = snapshot.size < 75;
  }
  const page = conversations.slice(0, PAGE_SIZE); const last = page.at(-1);
  return NextResponse.json({ success: true, conversations: page, nextCursor: last && (conversations.length > PAGE_SIZE || !exhausted) ? encode({ at: String(last.lastMessageAt || ""), id: String(last.id) }) : null, searchLimited: Boolean(search && scanned >= 500) });
}

const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), conversationId: z.string().min(1).max(180), content: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("assign"), conversationId: z.string().min(1).max(180), assigned: z.boolean() }),
  z.object({ action: z.literal("status"), conversationId: z.string().min(1).max(180), status: z.enum(["open", "pending", "closed"]) }),
]);

export async function POST(request: Request) {
  const actor = await requirePermission(request, "customers.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid support update." }, { status: 400 });
  const input = parsed.data; const ref = adminDb.collection("conversations").doc(input.conversationId);
  try {
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("NOT_FOUND");
      const conversation = snapshot.data() || {}; const now = new Date().toISOString();
      const ownedByOther = conversation.assignedTo && conversation.assignedTo !== actor.uid;
      if (ownedByOther && actor.role !== "super-admin") throw new Error("OWNED_BY_OTHER");
      if (input.action === "reply") {
        const messageRef = ref.collection("messages").doc();
        transaction.set(messageRef, { senderId: actor.uid, senderName: actor.email || "Support", content: input.content, createdAt: now, type: "text", direction: "outbound" });
        transaction.set(ref, { lastMessage: input.content, lastMessageAt: now, unreadCount: 0, status: "pending", assignedTo: conversation.assignedTo || actor.uid, assignedToName: conversation.assignedToName || actor.email || actor.uid, updatedAt: now }, { merge: true });
      } else if (input.action === "assign") {
        transaction.set(ref, { assignedTo: input.assigned ? actor.uid : FieldValue.delete(), assignedToName: input.assigned ? actor.email || actor.uid : FieldValue.delete(), updatedAt: now }, { merge: true });
      } else transaction.set(ref, { status: input.status, closedAt: input.status === "closed" ? now : FieldValue.delete(), closedBy: input.status === "closed" ? actor.uid : FieldValue.delete(), updatedAt: now }, { merge: true });
      transaction.set(adminDb.collection("adminAuditLog").doc(), { action: `support_${input.action}`, actorId: actor.uid, actorEmail: actor.email || null, targetId: input.conversationId, before: { status: conversation.status || "open", assignedTo: conversation.assignedTo || null }, after: input.action === "reply" ? { replied: true, status: "pending" } : input.action === "assign" ? { assignedTo: input.assigned ? actor.uid : null } : { status: input.status }, createdAt: now });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    if (code === "OWNED_BY_OTHER") return NextResponse.json({ success: false, message: "This conversation is assigned to another support agent." }, { status: 409 });
    throw error;
  }
}
