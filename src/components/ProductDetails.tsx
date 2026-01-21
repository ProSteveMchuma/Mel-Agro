"use client";
import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import Link from 'next/link';
import Image from 'next/image';
import { getProductById, getRelatedProducts, Product } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useChama } from '@/context/ChamaContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProductDetails({ id }: { id: string }) {
    const [product, setProduct] = useState<Product | undefined>(undefined);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'usage'>('description');

    const { activeChamas } = useChama();
    const router = useRouter();
    const searchParams = useSearchParams();
    const joinChamaId = searchParams.get('join');
    const [targetChama, setTargetChama] = useState<any>(null);

    useEffect(() => {
        if (joinChamaId && activeChamas.length > 0) {
            const found = activeChamas.find(c => c.id === joinChamaId);
            if (found) setTargetChama(found);
        }
    }, [joinChamaId, activeChamas]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const p = await getProductById(id);
            setProduct(p);
            if (p) {
                import('@/lib/analytics').then(({ AnalyticsService }) => {
                    AnalyticsService.logView(String(p.id));
                });
                const related = await getRelatedProducts(p.category, String(p.id));
                setRelatedProducts(related);
            }
            setLoading(false);
        };
        fetchData();
    }, [id]);

    const { addToCart } = useCart();

    const handleAddToCart = () => {
        if (product) {
            addToCart(product, quantity);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-white">
                <Header />
                <main className="flex-grow flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
                        <Link href="/products" className="text-green-600 hover:underline">Back to Products</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans text-gray-900">
            <Header />

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed top-24 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-xl z-50 animate-in slide-in-from-right-5 flex items-center gap-3">
                    <div className="bg-white/20 p-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-bold text-sm">Added to Cart!</p>
                        <p className="text-xs text-white/80">{quantity} x {product.name}</p>
                    </div>
                </div>
            )}

            <main className="flex-grow container-custom py-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8 font-medium">
                    <Link href="/" className="hover:text-green-600">Home</Link>
                    <span>/</span>
                    <Link href="/products" className="hover:text-green-600">{product.category}</Link>
                    <span>/</span>
                    <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
                    {/* Left Column: Images */}
                    <div className="space-y-6">
                        <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-square mx-auto max-w-lg lg:max-w-none">
                            <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wide">Best Seller</span>
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm">-10%</span>
                            </div>

                            <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-contain p-8 hover:scale-105 transition-transform duration-500"
                                priority
                            />
                        </div>

                        {/* Thumbnails */}
                        <div className="flex gap-4 justify-center">
                            {[product.image, '/placeholder-2.jpg', '/placeholder-3.jpg'].map((img, idx) => (
                                <button key={idx} className={`w-16 h-16 rounded-lg border-2 overflow-hidden ${idx === 0 ? 'border-green-500' : 'border-transparent hover:border-gray-200'}`}>
                                    <div className="relative w-full h-full bg-gray-50">
                                        <Image src={product.image} alt="Thumbnail" fill className="object-cover" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Info */}
                    <div className="flex flex-col">
                        <span className="text-green-600 font-bold text-xs uppercase tracking-wider mb-2">
                            {product.supplier || "MEL-AGRI QUALITY"}
                        </span>

                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h1>
                            <button className="text-gray-400 hover:text-red-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-6">
                            <div className="flex text-green-500">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-200'}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">120 Reviews</span>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-3xl font-extrabold text-[#22c55e]">KES {product.price.toLocaleString()}</span>
                            <span className="text-lg text-gray-400 line-through font-medium">KES {(product.price * 1.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">Save KES {(product.price * 0.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>

                        <p className="text-gray-600 text-sm leading-relaxed mb-6">
                            {product.description}
                        </p>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <div className="flex items-center border border-gray-300 rounded-lg px-2 w-32 justify-between h-12">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 flex justify-center text-gray-500 hover:text-green-600 text-lg font-bold">-</button>
                                <span className="text-gray-900 font-bold">{quantity}</span>
                                <button onClick={() => setQuantity(quantity + 1)} className="w-8 flex justify-center text-gray-500 hover:text-green-600 text-lg font-bold">+</button>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                disabled={!product.inStock}
                                className="h-12 flex-1 bg-[#22c55e] hover:bg-green-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                Add to Cart
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 mb-8">
                            <button
                                onClick={() => { handleAddToCart(); router.push('/checkout'); }}
                                className="w-full h-12 border-2 border-gray-900 text-gray-900 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Buy Now
                            </button>
                        </div>

                        {/* Delivery Info */}
                        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                    <span className="text-sm font-bold text-gray-900">Delivery to Nairobi</span>
                                </div>
                                <button className="text-xs font-bold text-green-600 hover:underline">Change</button>
                            </div>
                            <p className="text-xs text-gray-600 leading-normal">
                                Order now for delivery by tomorrow. Free delivery on orders over KES 5,000.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs & Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
                    <div className="lg:col-span-2">
                        {/* Tab Headers */}
                        <div className="flex gap-8 border-b border-gray-200 mb-8 overflow-x-auto">
                            {['Description', 'Specifications', 'Usage Guide'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab.toLowerCase() as any)}
                                    className={`pb-4 text-sm font-bold capitalize whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.toLowerCase()
                                        ? 'text-[#22c55e] border-[#22c55e]'
                                        : 'text-gray-400 border-transparent hover:text-gray-600'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[300px]">
                            {activeTab === 'description' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-lg font-bold text-gray-900">Product Overview</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        {product.description}
                                    </p>
                                </div>
                            )}

                            {activeTab === 'specifications' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Specifications</h3>
                                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {product.specification || "No detailed specifications provided for this product."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'usage' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-lg font-bold text-gray-900">Usage Instructions</h3>
                                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                        <p className="text-sm text-gray-700">
                                            {product.howToUse || "Follow standard agricultural practices for application. Refer to product packaging for specific instructions."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden lg:block">
                        {targetChama ? (
                            <div className="bg-purple-50 border-2 border-purple-500 rounded-2xl p-6">
                                <h3 className="font-bold text-purple-900 text-lg mb-2">Join {targetChama.creatorName}'s Group!</h3>
                                <p className="text-sm text-purple-700 mb-4">Buy together to save 15%</p>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="text-3xl font-bold text-purple-700">KES {targetChama.price.toLocaleString()}</div>
                                    <div className="text-sm text-gray-500 line-through">KES {product.price.toLocaleString()}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (product) {
                                            addToCart({
                                                ...product,
                                                id: `${product.id}_chama_${targetChama.id}`,
                                                name: `${product.name} (Group Buy)`,
                                                price: targetChama.price,
                                                category: 'Group Buy'
                                            } as any);
                                            setShowToast(true);
                                            setTimeout(() => setShowToast(false), 3000);
                                        }
                                    }}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
                                >
                                    Join & Pay
                                </button>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                                <h4 className="font-bold text-yellow-800 mb-2">Need Bulk Supply?</h4>
                                <p className="text-xs text-yellow-700 mb-4">We offer special rates for orders over 100 bags.</p>
                                <Link href="/dashboard/user?tab=support" className="text-sm font-bold text-yellow-800 underline">Contact Sales Team</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Farmers Also Bought */}
                <div>
                    <div className="flex justify-between items-end mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Farmers also bought</h2>
                        <Link href="/products" className="text-green-600 font-bold text-sm hover:underline">View All</Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {relatedProducts.length > 0 ? relatedProducts.map((p) => (
                            <ProductCard
                                key={p.id}
                                id={p.id}
                                name={p.name}
                                price={p.price}
                                image={p.image}
                                category={p.category}
                            />
                        )) : (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse"></div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
