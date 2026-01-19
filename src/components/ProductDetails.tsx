"use client";
import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import Link from 'next/link';
import Image from 'next/image';
import { getProductById, getRelatedProducts, Product } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { getProductReviews, Review } from '@/lib/reviews';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import { useChama } from '@/context/ChamaContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProductDetails({ id }: { id: string }) {
    const [product, setProduct] = useState<Product | undefined>(undefined);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const { createChama, activeChamas } = useChama();
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
                // Log view
                import('@/lib/analytics').then(({ AnalyticsService }) => {
                    AnalyticsService.logView(String(p.id));
                });

                const related = await getRelatedProducts(p.category, String(p.id));
                setRelatedProducts(related);
                const productReviews = await getProductReviews(String(p.id));
                setReviews(productReviews);
            }
            setLoading(false);
        };

        fetchData();
    }, [id]);

    const handleReviewAdded = async () => {
        if (product) {
            const productReviews = await getProductReviews(String(product.id));
            setReviews(productReviews);
        }
    };

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
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow flex items-center justify-center bg-gray-50">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-12 w-12 border-4 border-melagro-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading product details...</p>
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
                    <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
                        <p className="text-gray-500 mb-6">The product you are looking for might have been removed or is temporarily unavailable.</p>
                        <Link href="/products" className="btn-primary inline-block">Back to Products</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative bg-gray-50 font-sans">
            <Header />

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed top-24 right-4 bg-melagro-primary text-white px-6 py-4 rounded-xl shadow-xl z-50 animate-in slide-in-from-right-5 flex items-center gap-3 border border-white/10 backdrop-blur-md">
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

            <main className="flex-grow py-12">
                <div className="container-custom">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
                        <Link href="/" className="hover:text-melagro-primary transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/products" className="hover:text-melagro-primary transition-colors">Products</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
                    </nav>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-16">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                            {/* Product Image */}
                            <div className="bg-gray-100 relative h-[500px] lg:h-auto group overflow-hidden">
                                <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                    priority
                                />
                                <div className="absolute top-6 left-6">
                                    <span className="bg-white/90 backdrop-blur-sm text-melagro-primary px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border border-gray-100">
                                        {product.category}
                                    </span>
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-8 lg:p-12 flex flex-col justify-center">
                                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">{product.name}</h1>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex items-center text-yellow-400 gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <span className="text-gray-500 text-sm font-medium">({reviews.length} reviews)</span>
                                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${product.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>

                                <div className="text-4xl font-bold text-melagro-primary mb-8">
                                    KES {product.price.toLocaleString()}
                                </div>

                                {/* Chama Join Offer */}
                                {targetChama && (
                                    <div className="mb-8 p-4 bg-purple-50 border-2 border-purple-500 rounded-2xl animate-in slide-in-from-top-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-purple-900 text-lg">Join {targetChama.creatorName}'s Group!</h3>
                                                <p className="text-sm text-purple-700">Buy together to save 15%</p>
                                            </div>
                                            <div className="bg-purple-600 text-white font-bold px-3 py-1 rounded-full text-sm">
                                                Save KES {(product.price - targetChama.price).toLocaleString()}
                                            </div>
                                        </div>
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
                                                        category: 'Group Buy' // metadata
                                                    } as any);
                                                    setShowToast(true);
                                                    setTimeout(() => setShowToast(false), 3000);
                                                }
                                            }}
                                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
                                        >
                                            Join & Pay KES {targetChama.price.toLocaleString()}
                                        </button>
                                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-purple-600">
                                            <span>{targetChama.members.length} / {targetChama.targetSize} Joined</span>
                                            <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                                            <span>Expires in 24h</span>
                                        </div>
                                    </div>
                                )}

                                <div className="prose prose-gray mb-8 text-gray-600 leading-relaxed">
                                    <p>{product.description}</p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-100 mt-auto">
                                    <div className="flex items-center border border-gray-200 rounded-full px-4 py-3 sm:w-32 justify-between">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-melagro-primary transition-colors text-xl font-medium"
                                        >
                                            -
                                        </button>
                                        <span className="font-bold text-gray-900">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-melagro-primary transition-colors text-xl font-medium"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleAddToCart}
                                        className="flex-1 btn-primary text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                                        disabled={!product.inStock}
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <button
                                        onClick={async () => {
                                            if (product) {
                                                try {
                                                    const chamaId = await createChama(product);
                                                    router.push(`/dashboard/user?tab=chamas`);
                                                } catch (e) { /* Error handled in context */ }
                                            }
                                        }}
                                        className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1"
                                    >
                                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">SAVE 15%</span>
                                        Start Chama Group Buy
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </button>
                                    <p className="text-center text-xs text-purple-600 mt-2 font-medium">Group buy with 2 friends to unlock wholesale price!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                        <div className="lg:col-span-2">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
                            <ReviewList reviews={reviews} />
                        </div>
                        <div>
                            <ReviewForm productId={String(product.id)} onReviewAdded={handleReviewAdded} />
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Products</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {relatedProducts.map((p) => (
                                    <ProductCard
                                        key={p.id}
                                        id={p.id}
                                        name={p.name}
                                        price={p.price}
                                        image={p.image}
                                        category={p.category}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
