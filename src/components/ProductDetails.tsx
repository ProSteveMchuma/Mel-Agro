"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import Link from 'next/link';
import Image from 'next/image';
import { getProductById, getRelatedProducts, Product } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from "react-hot-toast";

export default function ProductDetails({ id }: { id: string }) {
    const [product, setProduct] = useState<Product | undefined>(undefined);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'usage'>('description');
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [selectedImage, setSelectedImage] = useState<string>("");
    const [selectedVariant, setSelectedVariant] = useState<any>(null);

    const userCity = user?.city || user?.county;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const p = await getProductById(id);
            setProduct(p);
            if (p) {
                setSelectedImage(p.image);
                if (p.variants && p.variants.length > 0) {
                    setSelectedVariant(p.variants[0]);
                }
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

    const handleAddToCart = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (product) {
            addToCart(product, quantity, selectedVariant || undefined);
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

    const images = product.images && product.images.length > 0 ? product.images : [product.image];
    const displayImage = selectedImage || product.image;

    const safeImage = (typeof displayImage === 'string' && displayImage.startsWith('http'))
        ? displayImage
        : "https://placehold.co/400x400?text=No+Image";

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans text-gray-900">
            <Header />

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
                                src={safeImage}
                                alt={product.name}
                                fill
                                className="object-contain p-8 hover:scale-105 transition-transform duration-500"
                                priority
                                unoptimized={safeImage.includes('firebasestorage')}
                            />
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-4 justify-center overflow-x-auto pb-2">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(img)}
                                        className={`w-16 h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all ${selectedImage === img ? 'border-green-500 scale-110' : 'border-transparent hover:border-gray-200'}`}
                                    >
                                        <div className="relative w-full h-full bg-gray-50">
                                            <Image src={img} alt="Thumbnail" fill className="object-cover" unoptimized={img.includes('firebasestorage')} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
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

                        {/* Variants Case: Sizes/Weight */}
                        {product.variants && product.variants.length > 0 && (
                            <div className="mb-6">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">Select Size/Weight</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.variants.map((v) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setSelectedVariant(v)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${selectedVariant?.id === v.id
                                                ? 'bg-melagro-primary text-white border-melagro-primary shadow-lg shadow-green-100'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-melagro-primary'
                                                }`}
                                        >
                                            {v.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

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

                        {/* Price & Stock Urgency */}
                        <div className="flex flex-col gap-2 mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-4xl font-black text-[#22c55e]">KES {(selectedVariant?.price || product.price).toLocaleString()}</span>
                                <span className="text-lg text-gray-400 line-through font-medium">KES {((selectedVariant?.price || product.price) * 1.15).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">Save 15%</span>
                            </div>

                            {product.stockQuantity > 0 && product.stockQuantity <= 50 && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 text-red-600 text-sm font-bold"
                                >
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    Only {product.stockQuantity} items left in stock!
                                </motion.div>
                            )}
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
                                onClick={(e) => { handleAddToCart(e); router.push('/checkout'); }}
                                className="w-full h-12 border-2 border-gray-900 text-gray-900 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Buy Now
                            </button>
                            <a
                                href={`https://wa.me/254748970757?text=${encodeURIComponent(`*PRODUCT INQUIRY*\n\nI am interested in buying: *${product.name}*\nPrice: KES ${product.price.toLocaleString()}\n\nIs this available?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-12 bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.038 3.284l-.54 1.964 2.009-.528c.954.524 1.942.85 3.037.852 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.772-5.744-5.772zm3.374 8.086c-.1.272-.58.513-.801.551-.237.042-.46.079-.769-.015-.297-.091-.676-.239-1.144-.442-1.99-.861-3.284-2.885-3.383-3.018-.099-.134-.736-.979-.736-1.959 0-.979.512-1.46.694-1.658.183-.198.396-.247.53-.247.13 0 .26.012.37.012.11 0 .26-.041.408.321.148.36.512 1.25.56 1.348.049.099.083.214.016.347-.066.13-.1.214-.2.33-.1.115-.208.261-.297.35-.099.099-.198.198-.083.396.115.198.512.845 1.099 1.366.759.673 1.398.882 1.596.981.198.099.313.082.43-.049.115-.132.512-.596.644-.793.132-.198.26-.165.43-.099.172.066 1.09.514 1.277.613.183.1.312.148.363.23.049.082.049.479-.05.751z" />
                                </svg>
                                Inquiry via WhatsApp
                            </a>
                        </div>

                        {/* Delivery Info & Trust */}
                        <div className="space-y-4 mb-8">
                            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        <span className="text-sm font-bold text-gray-900">Delivery to {userCity || 'Your Location'}</span>
                                    </div>
                                    <button className="text-xs font-bold text-green-600 hover:underline">Change</button>
                                </div>
                                <p className="text-xs text-gray-600 leading-normal">
                                    Order now for delivery by <span className="font-bold text-gray-900">tomorrow</span>. Free delivery on orders over KES 10,000.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl">
                                    <span className="text-xl">🛡️</span>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase">Verified Quality</p>
                                        <p className="text-[9px] text-gray-500">Certified Agri-Inputs</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl">
                                    <span className="text-xl">🔒</span>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase">Secure Payment</p>
                                        <p className="text-[9px] text-gray-500">M-Pesa & Card Encrypted</p>
                                    </div>
                                </div>
                            </div>
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
                        <div className="min-h-[300px] relative">
                            <AnimatePresence mode="wait">
                                {activeTab === 'description' && (
                                    <motion.div
                                        key="description"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        <h3 className="text-lg font-bold text-gray-900">Product Overview</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {product.description}
                                        </p>
                                    </motion.div>
                                )}

                                {activeTab === 'specifications' && (
                                    <motion.div
                                        key="specs"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Specifications</h3>
                                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                                            <p className="text-gray-600 text-sm leading-relaxed">
                                                {product.specification || "No detailed specifications provided for this product."}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeTab === 'usage' && (
                                    <motion.div
                                        key="usage"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="text-lg font-bold text-gray-900">Usage Instructions</h3>
                                        <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                                            <p className="text-sm text-gray-700">
                                                {product.howToUse || "Follow standard agricultural practices for application. Refer to product packaging for specific instructions."}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="hidden lg:block">
                        <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                            <h4 className="font-bold text-yellow-800 mb-2">Need Bulk Supply?</h4>
                            <p className="text-xs text-yellow-700 mb-4">We offer special rates for orders over 100 bags.</p>
                            <Link href="/dashboard/user?tab=support" className="text-sm font-bold text-yellow-800 underline">Contact Sales Team</Link>
                        </div>
                    </div>
                </div>

                {/* Farmers Also Bought */}
                <div className="mb-20">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-1">More Choice</p>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">More in {product.category}</h2>
                        </div>
                        <Link href="/products" className="text-gray-400 font-bold text-sm hover:text-green-600 transition-colors uppercase tracking-widest">Explore All →</Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {relatedProducts.length > 0 ? relatedProducts.map((p) => (
                            <ProductCard
                                key={p.id}
                                id={p.id}
                                name={p.name}
                                price={p.price}
                                image={p.image}
                                images={p.images}
                                category={p.category}
                                variants={p.variants}
                            />
                        )) : (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="bg-gray-50 rounded-[2rem] h-80 animate-pulse"></div>
                            ))
                        )}
                    </div>
                </div>


            </main>

            <Footer />

            {/* Sticky Mobile Add to Cart */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40 flex items-center justify-between gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Total Price</p>
                    <p className="text-xl font-black text-[#22c55e]">KES {(product.price * quantity).toLocaleString()}</p>
                </div>
                <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className="flex-grow h-12 bg-[#22c55e] text-white font-black rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Add
                </button>
            </div>
        </div >
    );
}
