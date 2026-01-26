"use client";
import { useState, useEffect } from 'react';
import { useOrders } from '@/context/OrderContext';
import { useProducts } from '@/context/ProductContext';
import { useUsers } from '@/context/UserContext'; // Assuming this exists and exposes users
import { useRouter } from 'next/navigation';

export default function CreateOrderPage() {
    const { addOrder } = useOrders();
    const { products } = useProducts();
    const { users } = useUsers(); // Need to verify this
    const router = useRouter();

    const [selectedUser, setSelectedUser] = useState('');
    const [cart, setCart] = useState<{ productId: string; quantity: number }[]>([]);
    const [shippingDetails, setShippingDetails] = useState({ county: '', details: '' });
    const [shippingCost, setShippingCost] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleAddToCart = (productId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === productId);
            if (existing) {
                return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { productId, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const handleQuantityChange = (productId: string, qty: number) => {
        if (qty < 1) return;
        setCart(prev => prev.map(item => item.productId === productId ? { ...item, quantity: qty } : item));
    };

    const calculateSubtotal = () => {
        return cart.reduce((total, item) => {
            const product = products.find(p => String(p.id) === item.productId);
            return total + (product ? product.price * item.quantity : 0);
        }, 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + shippingCost;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || cart.length === 0) return;

        setLoading(true);
        try {
            const user = users.find(u => u.id === selectedUser);
            const orderItems = cart.map(item => {
                const product = products.find(p => String(p.id) === item.productId);
                return {
                    id: item.productId,
                    name: product?.name || 'Unknown Product',
                    price: product?.price || 0,
                    quantity: item.quantity,
                    image: product?.image
                };
            });

            await addOrder({
                userId: selectedUser,
                userEmail: user?.email,
                items: orderItems,
                total: calculateTotal(),
                shippingCost: shippingCost,
                paymentMethod: 'Manual',
                shippingAddress: shippingDetails,
                paymentStatus: 'Unpaid'
            });

            router.push('/dashboard/admin/orders');
        } catch (error) {
            console.error(error);
            alert('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Create Manual Order</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Customer Selection */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="font-bold text-lg mb-4">1. Select Customer</h2>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                        required
                    >
                        <option value="">Select a customer...</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name} ({user.email})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Product Selection */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="font-bold text-lg mb-4">2. Add Products</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {products.map(product => (
                            <div key={product.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-melagri-primary transition-colors">
                                <div>
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-sm text-gray-500">KES {product.price.toLocaleString()}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleAddToCart(String(product.id))}
                                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-melagri-primary hover:text-white rounded-lg transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Cart Items */}
                    {cart.length > 0 && (
                        <div className="border-t border-gray-100 pt-4">
                            <h3 className="font-bold text-sm text-gray-700 mb-2">Selected Items</h3>
                            <div className="space-y-2">
                                {cart.map(item => {
                                    const product = products.find(p => String(p.id) === item.productId);
                                    return (
                                        <div key={item.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                            <div className="font-medium">{product?.name}</div>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value))}
                                                    className="w-16 px-2 py-1 rounded border border-gray-200"
                                                />
                                                <div className="font-bold w-24 text-right">
                                                    KES {((product?.price || 0) * item.quantity).toLocaleString()}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFromCart(item.productId)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="flex justify-end pt-4 space-y-1 flex-col items-end">
                                    <div className="text-gray-600">Subtotal: KES {calculateSubtotal().toLocaleString()}</div>
                                    <div className="text-gray-600">Shipping: KES {shippingCost.toLocaleString()}</div>
                                    <div className="text-xl font-bold text-gray-900">Total: KES {calculateTotal().toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Shipping Details */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="font-bold text-lg mb-4">3. Shipping Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">County</label>
                            <input
                                type="text"
                                value={shippingDetails.county}
                                onChange={(e) => setShippingDetails({ ...shippingDetails, county: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address/Details</label>
                            <input
                                type="text"
                                value={shippingDetails.details}
                                onChange={(e) => setShippingDetails({ ...shippingDetails, details: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Cost (KES)</label>
                            <input
                                type="number"
                                min="0"
                                value={shippingCost}
                                onChange={(e) => setShippingCost(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedUser || cart.length === 0}
                        className="btn-primary px-8 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating Order...' : 'Create Order'}
                    </button>
                </div>
            </form>
        </div>
    );
}
