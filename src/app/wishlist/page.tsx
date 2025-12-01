"use client";
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function WishlistPage() {
    const { wishlist, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleAddToCart = (product: any) => {
        addToCart(product);
        removeFromWishlist(product.id);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />

            <main className="flex-grow container-custom py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>

                {wishlist.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
                        <p className="text-gray-500 mb-8">Explore our products and save your favorites for later.</p>
                        <Link href="/products" className="btn-primary px-8 py-3 rounded-xl inline-block">
                            Start Shopping
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wishlist.map((product) => (
                            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-all">
                                <div className="relative aspect-square">
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <button
                                        onClick={() => removeFromWishlist(product.id)}
                                        className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                                        title="Remove from Wishlist"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="p-6">
                                    <div className="text-sm text-melagro-primary font-medium mb-1">{product.category}</div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-2">{product.name}</h3>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-xl font-bold text-gray-900">KES {product.price.toLocaleString()}</span>
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="btn-primary px-4 py-2 rounded-lg text-sm"
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
