"use client";
import { useState } from 'react';
import { useContent, Banner } from '@/context/ContentContext';
import Image from 'next/image';

export default function CMSPage() {
    const { banners, updateBanners, loading } = useContent();
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddBanner = () => {
        setEditingBanner({
            id: Date.now().toString(),
            title: '',
            subtitle: '',
            image: '',
            link: '',
            active: true
        });
        setIsModalOpen(true);
    };

    const handleEditBanner = (banner: Banner) => {
        setEditingBanner({ ...banner });
        setIsModalOpen(true);
    };

    const handleDeleteBanner = async (id: string) => {
        if (!confirm('Are you sure you want to delete this banner?')) return;
        const newBanners = banners.filter(b => b.id !== id);
        await updateBanners(newBanners);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBanner) return;

        let newBanners = [...banners];
        const index = newBanners.findIndex(b => b.id === editingBanner.id);

        if (index >= 0) {
            newBanners[index] = editingBanner;
        } else {
            newBanners.push(editingBanner);
        }

        await updateBanners(newBanners);
        setIsModalOpen(false);
        setEditingBanner(null);
    };

    const handleToggleActive = async (banner: Banner) => {
        const newBanners = banners.map(b =>
            b.id === banner.id ? { ...b, active: !b.active } : b
        );
        await updateBanners(newBanners);
    };

    if (loading) return <div>Loading CMS...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
                    <p className="text-gray-500 text-sm">Manage homepage banners and content.</p>
                </div>
                <button onClick={handleAddBanner} className="btn-primary flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Banner
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {banners.map(banner => (
                    <div key={banner.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
                        <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {banner.image ? (
                                <Image src={banner.image} alt={banner.title} fill className="object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Image</div>
                            )}
                        </div>

                        <div className="flex-grow text-center md:text-left">
                            <h3 className="font-bold text-lg text-gray-900">{banner.title || 'Untitled Banner'}</h3>
                            <p className="text-gray-500 text-sm mb-2">{banner.subtitle}</p>
                            <div className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">
                                Link: {banner.link || 'None'}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleToggleActive(banner)}
                                className={`px-3 py-1 rounded-full text-xs font-bold ${banner.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {banner.active ? 'Active' : 'Inactive'}
                            </button>
                            <button onClick={() => handleEditBanner(banner)} className="text-gray-500 hover:text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button onClick={() => handleDeleteBanner(banner.id)} className="text-gray-500 hover:text-red-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}

                {banners.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        No banners found. Add one to get started.
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isModalOpen && editingBanner && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{editingBanner.id ? 'Edit Banner' : 'Add Banner'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={editingBanner.title}
                                    onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                    placeholder="e.g., Summer Sale"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                                <input
                                    type="text"
                                    value={editingBanner.subtitle}
                                    onChange={e => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                    placeholder="e.g., Up to 50% off"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={editingBanner.description || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, description: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                    placeholder="Banner description..."
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                <input
                                    type="text"
                                    value={editingBanner.image}
                                    onChange={e => setEditingBanner({ ...editingBanner, image: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                                <input
                                    type="text"
                                    value={editingBanner.link}
                                    onChange={e => setEditingBanner({ ...editingBanner, link: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                    placeholder="/products/seeds"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editingBanner.active}
                                    onChange={e => setEditingBanner({ ...editingBanner, active: e.target.checked })}
                                    id="activeCheck"
                                    className="rounded border-gray-300 text-melagri-primary focus:ring-melagri-primary"
                                />
                                <label htmlFor="activeCheck" className="text-sm font-medium text-gray-700">Active</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary px-6 py-2 rounded-lg"
                                >
                                    Save Banner
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
