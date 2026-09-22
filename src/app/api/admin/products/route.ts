import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { z } from "zod";
import { revalidateStorefrontCatalogue } from "@/lib/revalidate-catalogue";
import { collapseBrandDisplays, normalizeDisplayField, resolveProductBrand } from "@/lib/catalog-normalize";
import { matchesBrandFilter, matchesPriceFilter, parsePriceBound } from "@/lib/admin-catalogue-filters";

const PAGE_SIZE = 20;
const SCAN_SIZE = 75;
const MAX_SCANNED = 600;
let categoryCache: { values: string[]; expiresAt: number } | null = null;
let brandCache: { values: string[]; expiresAt: number } | null = null;

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
const variantSchema = z.object({ id: z.string().trim().min(1).max(100), sku: optionalText(100), name: z.string().trim().min(1).max(160), price: z.number().min(0).max(100_000_000).optional(), stockQuantity: z.number().int().min(0).max(100_000_000), weight: z.number().min(0).max(100_000).optional(), image: optionalText(1000) });
const productSchema = z.object({
  name: z.string().trim().min(2).max(200), price: z.number().min(0).max(100_000_000), category: z.string().trim().min(2).max(100), subCategory: optionalText(100), productCode: optionalText(100), brand: optionalText(120),
  image: z.string().trim().url().max(1000), images: z.array(z.string().url().max(1000)).max(8).optional().default([]), rating: z.number().min(0).max(5).optional().default(0), reviews: z.number().int().min(0).max(10_000_000).optional().default(0),
  stockQuantity: z.number().int().min(0).max(100_000_000), lowStockThreshold: z.number().int().min(0).max(1_000_000), inStock: z.boolean().optional(), description: optionalText(10_000), tags: z.array(z.string().trim().min(1).max(80)).max(30).optional().default([]), features: z.array(z.string().trim().min(1).max(300)).max(30).optional().default([]), specification: optionalText(10_000), howToUse: optionalText(10_000), variants: z.array(variantSchema).max(100).optional().default([]),
  weight: z.number().min(0).max(100_000).optional(), weightUnit: z.enum(["kg", "g", "lb", "l", "ml"]).optional(), featured: z.boolean().optional().default(false), supplierLeadTimeDays: z.number().int().min(1).max(365).optional().default(14), incomingStock: z.number().int().min(0).max(100_000_000).optional().default(0), safetyStock: z.number().int().min(0).max(1_000_000).optional().default(0), minimumOrderQuantity: z.number().int().min(1).max(1_000_000).optional().default(1),
}).strict();
const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: productSchema, forceNewBrand: z.boolean().optional().default(false) }),
  z.object({ action: z.literal("update"), productId: z.string().trim().min(1).max(200), data: productSchema, forceNewBrand: z.boolean().optional().default(false) }),
]);

async function getCategories() {
  if (categoryCache && categoryCache.expiresAt > Date.now()) return categoryCache.values;
  const snapshot = await adminDb.collection("products").select("category").limit(1500).get();
  const values = Array.from(new Set(snapshot.docs.map((document) => document.data().category).filter((value): value is string => typeof value === "string" && Boolean(value)))).sort();
  categoryCache = { values, expiresAt: Date.now() + 5 * 60 * 1000 };
  return values;
}

async function getBrands() {
  if (brandCache && brandCache.expiresAt > Date.now()) return brandCache.values;
  const snapshot = await adminDb.collection("products").select("brand", "brandKey", "archived").limit(1500).get();
  const values = collapseBrandDisplays(
    snapshot.docs
      .filter((document) => document.data().archived !== true)
      .map((document) => ({ brand: document.data().brand, brandKey: document.data().brandKey }))
  );
  brandCache = { values, expiresAt: Date.now() + 5 * 60 * 1000 };
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
  const brand = (params.get("brand") || "").trim().slice(0, 120);
  const stock = params.get("stock") || "all";
  const archived = params.get("archived") === "true";
  const minPrice = parsePriceBound(params.get("minPrice"));
  const maxPrice = parsePriceBound(params.get("maxPrice"));
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
      if (!matchesBrandFilter(data, brand)) continue;
      if (!matchesPriceFilter(data, minPrice, maxPrice)) continue;
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
  return NextResponse.json({ success: true, products, categories: await getCategories(), brands: await getBrands(), nextCursor: !exhausted && lastScannedId ? encodeCursor(lastScannedId) : null, searchLimited: scanned >= MAX_SCANNED && !exhausted });
}

export async function POST(request: Request) {
  const actor = await requirePermission(request, "catalogue.manage");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || "Invalid product data." }, { status: 400 });
  const input = parsed.data; const productRef = input.action === "create" ? adminDb.collection("products").doc() : adminDb.collection("products").doc(input.productId);
  const knownBrands = await getBrands();
  const brandResolved = resolveProductBrand(input.data.brand, knownBrands, { forceNewBrand: input.forceNewBrand });
  if (!brandResolved.ok) {
    return NextResponse.json({
      success: false,
      code: "BRAND_NEAR_DUPLICATE",
      suggestedBrand: brandResolved.suggestedBrand,
      message: `Brand looks similar to existing "${brandResolved.suggestedBrand}". Use that spelling, or confirm creating a new brand.`,
    }, { status: 409 });
  }
  const { brand, brandKey } = brandResolved;
  const category = normalizeDisplayField(input.data.category) || input.data.category;
  const subCategory = normalizeDisplayField(input.data.subCategory);
  const productCode = normalizeDisplayField(input.data.productCode);
  const name = normalizeDisplayField(input.data.name) || input.data.name;

  if (productCode) {
    const skuSnap = await adminDb.collection("products").where("productCode", "==", productCode).limit(5).get();
    const conflict = skuSnap.docs.find((doc) => doc.id !== productRef.id);
    if (conflict) return NextResponse.json({ success: false, message: "Another product already uses this product code (SKU)." }, { status: 409 });
  }

  try {
    await adminDb.runTransaction(async (transaction) => {
      const existing = await transaction.get(productRef); if (input.action === "update" && !existing.exists) throw new Error("PRODUCT_NOT_FOUND");
      const before = existing.data() || {}; const now = new Date().toISOString(); const totalAvailable = input.data.stockQuantity + input.data.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
      const product = {
        ...input.data,
        name,
        category,
        subCategory,
        productCode,
        brand,
        brandKey,
        inStock: totalAvailable > 0,
        ...(input.action === "create" ? { createdAt: now, archived: false } : {}),
        updatedAt: now,
        updatedBy: actor.uid,
      };
      if (input.action === "update") transaction.set(productRef, product, { merge: true }); else transaction.set(productRef, product);
      const previousStock = Number(before.stockQuantity || 0); if (input.action === "create" || previousStock !== input.data.stockQuantity) transaction.set(adminDb.collection("inventory_history").doc(), { productId: productRef.id, productName: name, previousStock: input.action === "create" ? 0 : previousStock, newStock: input.data.stockQuantity, change: input.data.stockQuantity - (input.action === "create" ? 0 : previousStock), type: input.action === "create" ? "initial" : "product_edit", updatedBy: actor.email || actor.uid, updatedAt: now, note: input.action === "create" ? "Product created" : "Stock changed through product editor" });
      transaction.set(adminDb.collection("adminAuditLog").doc(), { action: input.action === "create" ? "product_created" : "product_updated", actorId: actor.uid, actorEmail: actor.email || null, targetId: productRef.id, before: input.action === "update" ? { name: before.name || null, price: before.price || null, stockQuantity: before.stockQuantity || 0, brand: before.brand || null } : null, after: { name, price: input.data.price, stockQuantity: input.data.stockQuantity, brand, brandKey, variants: input.data.variants.length }, createdAt: now });
    });
    categoryCache = null;
    brandCache = null;
    revalidateStorefrontCatalogue();
    return NextResponse.json({ success: true, productId: productRef.id }, { status: input.action === "create" ? 201 : 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") return NextResponse.json({ success: false, message: "Product not found." }, { status: 404 });
    throw error;
  }
}
