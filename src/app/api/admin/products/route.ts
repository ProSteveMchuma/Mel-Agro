import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";

const PAGE_SIZE = 20;
const SCAN_SIZE = 75;
const MAX_SCANNED = 600;
let categoryCache: { values: string[]; expiresAt: number } | null = null;

async function getCategories() {
  if (categoryCache && categoryCache.expiresAt > Date.now()) return categoryCache.values;
  const snapshot = await adminDb.collection("products").select("category").limit(1500).get();
  const values = Array.from(new Set(snapshot.docs.map((document) => document.data().category).filter((value): value is string => typeof value === "string" && Boolean(value)))).sort();
  categoryCache = { values, expiresAt: Date.now() + 5 * 60 * 1000 };
  return values;
}

function decodeCursor(value: string | null) {
  if (!value) return null;
  try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return null; }
}
function encodeCursor(value: string) { return Buffer.from(value, "utf8").toString("base64url"); }
function serialize(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
  return value;
}
function totalStock(data: Record<string, unknown>) {
  const variants = Array.isArray(data.variants) ? data.variants as Array<Record<string, unknown>> : [];
  return Number(data.stockQuantity || 0) + variants.reduce((sum, variant) => sum + Number(variant.stockQuantity || 0), 0);
}
function matchesStock(data: Record<string, unknown>, stock: string) {
  const quantity = totalStock(data);
  const threshold = Number(data.lowStockThreshold || 10);
  if (stock === "in") return quantity > 0;
  if (stock === "low") return quantity > 0 && quantity <= threshold;
  if (stock === "out") return quantity === 0;
  return true;
}

export async function GET(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const queryText = (params.get("q") || "").trim().toLowerCase().slice(0, 120);
  const category = (params.get("category") || "").trim().slice(0, 100);
  const stock = params.get("stock") || "all";
  const archived = params.get("archived") === "true";
  const cursor = decodeCursor(params.get("cursor"));
  let lastScannedId = cursor;
  let scanned = 0;
  let exhausted = false;
  const products: Record<string, unknown>[] = [];

  while (products.length < PAGE_SIZE && scanned < MAX_SCANNED && !exhausted) {
    let firestoreQuery = adminDb.collection("products").orderBy("__name__").limit(Math.min(SCAN_SIZE, MAX_SCANNED - scanned));
    if (lastScannedId) firestoreQuery = firestoreQuery.startAfter(lastScannedId);
    const snapshot = await firestoreQuery.get();
    if (snapshot.empty) { exhausted = true; break; }
    for (const document of snapshot.docs) {
      scanned += 1; lastScannedId = document.id;
      const data = document.data() as Record<string, unknown>;
      if ((data.archived === true) !== archived) continue;
      if (category && data.category !== category) continue;
      if (!matchesStock(data, stock)) continue;
      if (queryText) {
        const haystack = [data.name, data.category, data.subCategory, data.productCode, data.brand, document.id].map((value) => String(value || "").toLowerCase()).join(" ");
        if (!haystack.includes(queryText)) continue;
      }
      products.push({ ...serialize(data) as Record<string, unknown>, id: document.id });
      if (products.length === PAGE_SIZE) break;
    }
    exhausted = snapshot.size < SCAN_SIZE;
  }
  return NextResponse.json({ success: true, products, categories: await getCategories(), nextCursor: !exhausted && lastScannedId ? encodeCursor(lastScannedId) : null, searchLimited: scanned >= MAX_SCANNED && !exhausted });
}
