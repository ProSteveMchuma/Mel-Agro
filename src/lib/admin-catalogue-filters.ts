import { brandKeyFrom } from './catalog-normalize.ts';

export function parsePriceBound(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function matchesBrandFilter(
  data: { brand?: unknown; brandKey?: unknown },
  brand: string,
): boolean {
  const needle = brand.trim();
  if (!needle) return true;
  const needleKey = brandKeyFrom(needle);
  const productKey = brandKeyFrom(data.brandKey) || brandKeyFrom(data.brand);
  if (productKey && needleKey && productKey === needleKey) return true;
  return String(data.brand || '').trim().toLowerCase() === needle.toLowerCase();
}

export function matchesPriceFilter(
  data: { price?: unknown },
  minPrice: number | null,
  maxPrice: number | null,
): boolean {
  const price = Number(data.price || 0);
  if (!Number.isFinite(price)) return false;
  if (minPrice != null && price < minPrice) return false;
  if (maxPrice != null && price > maxPrice) return false;
  return true;
}
