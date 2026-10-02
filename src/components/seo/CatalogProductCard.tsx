import Image from 'next/image';
import Link from 'next/link';
import { skipImageOptimizer } from '@/lib/product-image';
import { productSeoPath } from '@/lib/seo';
import type { Product } from '@/types';

/** Light catalogue card for category and brand landings. The full cart card stays on /products. */
export default function CatalogProductCard({ product }: { product: Product }) {
    const href = productSeoPath(product);
    const raw = product.image || product.images?.find(Boolean) || '';
    const imageSrc = raw.startsWith('http') || raw.startsWith('/')
        ? raw
        : 'https://placehold.co/400x400?text=No+Image';
    const prices = [Number(product.price) || 0, ...(product.variants || []).map((variant) => Number(variant.price) || 0)]
        .filter((price) => price > 0);
    const min = prices.length ? Math.min(...prices) : 0;
    const showFrom = new Set(prices).size > 1;
    const variantInStock = (product.variants || []).some((variant) => Number(variant.stockQuantity) > 0);
    const parentInStock = Number(product.stockQuantity ?? product.stock ?? 0) > 0;
    const inStock = product.inStock !== false && ((product.variants || []).length ? variantInStock : parentInStock);

    return (
        <Link href={href} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:border-green-200">
            <div className="relative aspect-square bg-[#f8fcf9]">
                <Image
                    src={imageSrc}
                    alt={`Buy ${product.name} online at Mel-Agri ${product.category}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized={skipImageOptimizer(imageSrc)}
                    className="object-contain p-3"
                />
            </div>
            <div className="flex flex-1 flex-col p-3 md:p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">{product.category}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-bold text-gray-900 group-hover:text-green-700">{product.name}</h3>
                <p className="mt-auto pt-3 text-lg font-black text-gray-900">{showFrom ? 'From ' : ''}KES {min.toLocaleString()}</p>
                <p className="text-[11px] font-bold text-gray-500">{inStock ? 'In stock' : 'Out of stock'}</p>
            </div>
        </Link>
    );
}
