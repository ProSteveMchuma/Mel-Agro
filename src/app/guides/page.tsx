import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { getGuides } from '@/lib/guides';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Farmer's Knowledge Base | Mel-Agri Kenya",
    description: 'Expert agricultural guides, pest control protocols, and yield-boosting techniques tailored for Kenyan farmers.',
};

export default async function GuidesPage() {
    const guides = await getGuides();

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans selection:bg-green-100 selection:text-green-900">
            <Header />
            <main className="flex-grow w-full py-16">
                <div className="container-custom">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">The Farmer's <span className="text-green-600">Knowledge Base</span></h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Actionable, expert advice for Kenyan farmers. From pest eradication to climate-smart fertilizing, we help you maximize your yield.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {guides.map((guide) => (
                            <Link href={`/guides/${guide.slug}`} key={guide.id} className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 border border-gray-100 flex flex-col">
                                <div className="relative h-60 w-full bg-gray-200 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10" />
                                    <Image
                                        src={guide.image || '/assets/blogs/placeholder.jpg'}
                                        alt={guide.title}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                                        {guide.tags.slice(0, 2).map(tag => (
                                            <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-green-500 text-white px-3 py-1 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col flex-grow">
                                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">
                                        {new Date(guide.publishedAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <h2 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors leading-tight">
                                        {guide.title}
                                    </h2>
                                    <p className="text-gray-600 text-sm mb-6 line-clamp-3">
                                        {guide.description}
                                    </p>
                                    <div className="mt-auto flex items-center gap-3 text-sm font-semibold text-green-600 group-hover:translate-x-2 transition-transform">
                                        Read Guide <span>→</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
            <Footer />
            <WhatsAppButton />
        </div>
    );
}
