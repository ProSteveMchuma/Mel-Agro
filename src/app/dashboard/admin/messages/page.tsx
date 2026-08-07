"use client";

import { useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

type Conversation = { id: string; userName?: string; userEmail?: string; lastMessage?: string; lastMessageAt?: string; unreadCount?: number; status: "open" | "pending" | "closed"; assignedTo?: string; assignedToName?: string };
type ChatMessage = { id: string; senderId: string; senderName?: string; content: string; createdAt: string; type?: string };

export default function AdminSupportPage() {
  const { user: actor } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadTruncated, setThreadTruncated] = useState(false);
  const [error, setError] = useState("");
  const [searchLimited, setSearchLimited] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const activeId = active?.id || null;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const token = await getAuth().currentUser?.getIdToken(); if (!token) throw new Error("Admin session is unavailable.");
        const params = new URLSearchParams({ status, owner }); if (search.trim()) params.set("q", search.trim()); if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/support?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }); const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load support inbox.");
        setConversations(result.conversations || []); setNextCursor(result.nextCursor || null); setSearchLimited(Boolean(result.searchLimited));
        setActive((current) => current ? (result.conversations || []).find((item: Conversation) => item.id === current.id) || current : null);
      } catch (caught) { if ((caught as Error).name !== "AbortError") setError(caught instanceof Error ? caught.message : "Could not load support inbox."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, search ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, status, owner, cursor, refreshKey]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    const controller = new AbortController(); setThreadLoading(true);
    (async () => { try { const token = await getAuth().currentUser?.getIdToken(); if (!token) return; const response = await fetch(`/api/admin/support?conversationId=${encodeURIComponent(activeId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }); const result = await response.json(); if (!response.ok) throw new Error(result.message); setMessages(result.messages || []); setThreadTruncated(Boolean(result.truncated)); window.setTimeout(() => endRef.current?.scrollIntoView(), 0); } catch (caught) { if ((caught as Error).name !== "AbortError") toast.error("Could not load conversation"); } finally { if (!controller.signal.aborted) setThreadLoading(false); } })();
    return () => controller.abort();
  }, [activeId, refreshKey]);

  function resetPage() { setCursor(null); setHistory([]); setActive(null); }
  async function mutate(body: Record<string, unknown>) { const token = await getAuth().currentUser?.getIdToken(); if (!token) throw new Error("Admin session is unavailable."); const response = await fetch("/api/admin/support", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "Support update failed."); }
  async function sendReply(event: React.FormEvent) { event.preventDefault(); if (!active || !input.trim()) return; setSaving(true); try { await mutate({ action: "reply", conversationId: active.id, content: input }); setInput(""); toast.success("Reply sent"); setRefreshKey((value) => value + 1); } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Reply failed"); } finally { setSaving(false); } }
  async function updateConversation(body: Record<string, unknown>, success: string) { if (!active) return; setSaving(true); try { await mutate({ conversationId: active.id, ...body }); toast.success(success); setRefreshKey((value) => value + 1); } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Update failed"); } finally { setSaving(false); } }

  const ownedByOther = Boolean(active?.assignedTo && active.assignedTo !== actor?.uid);
  return <div className="space-y-5"><header><p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-green-700">Customer operations</p><h1 className="text-2xl font-black text-gray-950">Support inbox</h1><p className="mt-1 text-sm text-gray-500">Own conversations, respond clearly, and keep resolution history auditable.</p></header>
    <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row"><input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Customer, email, conversation or message" className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-green-600"/><select value={status} onChange={(event) => { setStatus(event.target.value); resetPage(); }} className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold"><option value="all">All states</option><option value="open">Open</option><option value="pending">Waiting on customer</option><option value="closed">Closed</option></select><select value={owner} onChange={(event) => { setOwner(event.target.value); resetPage(); }} className="min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-bold"><option value="all">All owners</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option></select></section>
    {searchLimited && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">This search checked the next 500 conversations. Use a more specific customer name or email.</p>}{error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[340px_minmax(0,1fr)]"><aside className={`${active ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-gray-200`}><div className="flex-1 overflow-y-auto">{loading ? <Empty>Loading conversations…</Empty> : conversations.length === 0 ? <Empty>No conversations found.</Empty> : conversations.map((conversation) => <button key={conversation.id} onClick={() => setActive(conversation)} className={`w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 ${active?.id === conversation.id ? "bg-green-50" : ""}`}><div className="flex justify-between gap-2"><p className="truncate font-black text-gray-900">{conversation.userName || "Anonymous customer"}</p><StateBadge status={conversation.status}/></div><p className="truncate text-xs text-gray-500">{conversation.userEmail || conversation.id}</p><p className="mt-2 truncate text-sm text-gray-600">{conversation.lastMessage || "No message preview"}</p><div className="mt-2 flex justify-between text-[10px] font-bold text-gray-400"><span>{conversation.assignedToName || "Unassigned"}</span><span>{conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleString() : ""}</span></div></button>)}</div>{conversations.length > 0 && <footer className="flex items-center justify-between border-t border-gray-100 p-3 text-xs text-gray-500"><span>Page {history.length + 1}</span><div className="flex gap-2"><button disabled={history.length === 0} onClick={() => setHistory((current) => { const copy = [...current]; setCursor(copy.pop() ?? null); return copy; })} className="rounded-lg border px-2 py-1.5 font-bold disabled:opacity-40">Previous</button><button disabled={!nextCursor} onClick={() => { if (nextCursor) { setHistory((current) => [...current, cursor]); setCursor(nextCursor); } }} className="rounded-lg border px-2 py-1.5 font-bold disabled:opacity-40">Next</button></div></footer>}</aside>
      <main className={`${active ? "flex" : "hidden lg:flex"} min-w-0 flex-col`}>{active ? <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4"><div className="flex items-center gap-3"><button onClick={() => setActive(null)} className="rounded-lg border px-2 py-1 text-sm font-black lg:hidden">←</button><div><h2 className="font-black text-gray-950">{active.userName || "Anonymous customer"}</h2><p className="text-xs text-gray-500">{active.userEmail || active.id} · {active.assignedToName || "Unassigned"}</p></div></div><div className="flex gap-2">{!active.assignedTo ? <button disabled={saving} onClick={() => updateConversation({ action: "assign", assigned: true }, "Conversation assigned to you")} className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-black text-green-700">Assign to me</button> : active.assignedTo === actor?.uid && <button disabled={saving} onClick={() => updateConversation({ action: "assign", assigned: false }, "Conversation unassigned")} className="rounded-lg border px-3 py-2 text-xs font-black text-gray-600">Unassign</button>}<select disabled={saving || ownedByOther} value={active.status} onChange={(event) => updateConversation({ action: "status", status: event.target.value }, "Conversation status updated")} className="rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-50"><option value="open">Open</option><option value="pending">Waiting</option><option value="closed">Closed</option></select></div></div>
        {threadTruncated && <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">Showing the latest 100 messages.</p>}<div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">{threadLoading ? <Empty>Loading messages…</Empty> : messages.map((message) => { const customer = message.senderId === active.id; return <div key={message.id} className={`flex ${customer ? "justify-start" : "justify-end"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${customer ? "rounded-bl-sm bg-white text-gray-800 shadow-sm" : "rounded-br-sm bg-green-700 text-white"}`}><p>{message.content}</p><p className={`mt-1 text-[10px] ${customer ? "text-gray-400" : "text-green-100"}`}>{message.senderName || (customer ? "Customer" : "Support")} · {message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}</p></div></div>; })}<div ref={endRef}/></div>
        {ownedByOther ? <p className="border-t border-amber-200 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-800">Assigned to {active.assignedToName || "another support agent"}. Ask them or a super-admin to transfer ownership.</p> : <form onSubmit={sendReply} className="flex gap-2 border-t border-gray-200 p-4"><textarea value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} placeholder="Write a helpful response…" className="min-h-12 flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-600"/><button disabled={saving || !input.trim()} className="rounded-xl bg-green-700 px-5 text-sm font-black text-white disabled:opacity-40">Send</button></form>}</> : <Empty>Select a conversation to begin.</Empty>}</main></div>
  </div>;
}

function Empty({ children }: { children: React.ReactNode }) { return <div className="flex min-h-32 items-center justify-center p-6 text-center text-sm text-gray-500">{children}</div>; }
function StateBadge({ status }: { status: Conversation["status"] }) { const styles = { open: "bg-red-50 text-red-700", pending: "bg-amber-50 text-amber-700", closed: "bg-green-50 text-green-700" }; return <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${styles[status]}`}>{status === "pending" ? "Waiting" : status}</span>; }
