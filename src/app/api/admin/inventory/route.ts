import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { revalidateStorefrontCatalogue } from "@/lib/revalidate-catalogue";
import { collapseBrandDisplays } from "@/lib/catalog-normalize";
import { matchesBrandFilter, matchesPriceFilter, parsePriceBound } from "@/lib/admin-catalogue-filters";

const PAGE_SIZE = 20;
const SCAN_SIZE = 75;
const MAX_SCANNED = 600;
let salesCache: { values: Map<string, number>; expiresAt: number } | null = null;
let brandCache: { values: string[]; expiresAt: number } | null = null;

function decodeCursor(value: string | null) { if (!value) return null; try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return null; } }
function encodeCursor(value: string) { return Buffer.from(value, "utf8").toString("base64url"); }
function serialize(value: unknown): unknown {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
  return value;
}
async function getBrands() {
  if (brandCache && brandCache.expiresAt > Date.now()) return brandCache.values;
  const snapshot = await adminDb.collection("products").select("brand", "brandKey", "archived").limit(1500).get();
  const values = collapseBrandDisplays(
    snapshot.docs
      .filter((document) => document.data().archived !== true)
      .map((document) => ({ brand: document.data().brand, brandKey: document.data().brandKey })),
  );
  brandCache = { values, expiresAt: Date.now() + 5 * 60 * 1000 };
  return values;
}
async function recentSales() {
  if (salesCache && salesCache.expiresAt > Date.now()) return salesCache.values;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const snapshot = await adminDb.collection("orders").where("date", ">=", since).limit(2000).get();
  const values = new Map<string, number>();
  for (const document of snapshot.docs) {
    const order = document.data();
    if (String(order.status || "").toLowerCase() === "cancelled") continue;
    for (const item of Array.isArray(order.items) ? order.items : []) {
      const id = String(item.id || item.productId || "");
      if (id) values.set(id, (values.get(id) || 0) + Number(item.quantity || 0));
    }
  }
  salesCache = { values, expiresAt: Date.now() + 2 * 60 * 1000 };
  return values;
}
function matchesRisk(stock: number, threshold: number, risk: string) {
  if (risk === "out") return stock === 0;
  if (risk === "low") return stock > 0 && stock <= threshold;
  if (risk === "healthy") return stock > threshold;
  return true;
}

export async function GET(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const queryText = (params.get("q") || "").trim().toLowerCase().slice(0, 120);
  const risk = params.get("risk") || "all";
  const brand = (params.get("brand") || "").trim().slice(0, 120);
  const minPrice = parsePriceBound(params.get("minPrice"));
  const maxPrice = parsePriceBound(params.get("maxPrice"));
  let lastScannedId = decodeCursor(params.get("cursor"));
  let scanned = 0; let exhausted = false;
  const products: Record<string, unknown>[] = [];
  const sales = await recentSales();
  while (products.length < PAGE_SIZE && scanned < MAX_SCANNED && !exhausted) {
    let query = adminDb.collection("products").orderBy("__name__").limit(Math.min(SCAN_SIZE, MAX_SCANNED - scanned));
    if (lastScannedId) query = query.startAfter(lastScannedId);
    const snapshot = await query.get();
    if (snapshot.empty) { exhausted = true; break; }
    for (const document of snapshot.docs) {
      scanned += 1; lastScannedId = document.id;
      const data = document.data() as Record<string, unknown>;
      if (data.archived === true) continue;
      const stock = Number(data.stockQuantity || 0);
      const threshold = Number(data.lowStockThreshold || 10);
      if (!matchesRisk(stock, threshold, risk)) continue;
      if (!matchesBrandFilter(data, brand)) continue;
      if (!matchesPriceFilter(data, minPrice, maxPrice)) continue;
      if (queryText) {
        const haystack = [data.name, data.category, data.productCode, data.brand, document.id].map((value) => String(value || "").toLowerCase()).join(" ");
        if (!haystack.includes(queryText)) continue;
      }
      const totalSold = sales.get(document.id) || 0;
      products.push({ ...serialize(data) as Record<string, unknown>, id: document.id, totalSold30d: totalSold, dailyVelocity: totalSold / 30 });
      if (products.length === PAGE_SIZE) break;
    }
    exhausted = snapshot.size < SCAN_SIZE;
  }
  return NextResponse.json({ success: true, products, brands: await getBrands(), nextCursor: !exhausted && lastScannedId ? encodeCursor(lastScannedId) : null, searchLimited: scanned >= MAX_SCANNED && !exhausted });
}

const adjustmentSchema = z.object({ productId: z.string().min(1).max(180), adjustment: z.number().int().min(-10000).max(10000).refine((value) => value !== 0), reason: z.string().trim().max(240).optional() });

export async function POST(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 401 });
  const parsed = adjustmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid stock adjustment." }, { status: 400 });
  const { productId, adjustment, reason } = parsed.data;
  const productRef = adminDb.collection("products").doc(productId);
  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists) throw new Error("PRODUCT_NOT_FOUND");
    const data = snapshot.data() || {};
    const previousStock = Number(data.stockQuantity || 0);
    const newStock = previousStock + adjustment;
    if (newStock < 0) throw new Error("NEGATIVE_STOCK");
    const now = new Date().toISOString();
    transaction.update(productRef, { stockQuantity: newStock, inStock: newStock > 0, updatedAt: now });
    transaction.set(adminDb.collection("inventory_history").doc(), { productId, productName: data.name || "Unknown product", previousStock, newStock, change: adjustment, type: "admin_adjustment", reason: reason || "Quick inventory adjustment", updatedBy: actor.email || actor.uid, updatedAt: now });
    transaction.set(adminDb.collection("adminAuditLog").doc(), { action: "inventory_adjusted", actorId: actor.uid, actorEmail: actor.email || null, targetId: productId, before: { stockQuantity: previousStock }, after: { stockQuantity: newStock, adjustment, reason: reason || null }, createdAt: now });
    return { previousStock, newStock };
  }).catch((error: Error) => {
    if (error.message === "PRODUCT_NOT_FOUND") return null;
    if (error.message === "NEGATIVE_STOCK") return { negative: true } as const;
    throw error;
  });
  if (!result) return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
  if ("negative" in result) return NextResponse.json({ success: false, message: "Adjustment would make stock negative." }, { status: 409 });
  revalidateStorefrontCatalogue();
  return NextResponse.json({ success: true, ...result });
}
