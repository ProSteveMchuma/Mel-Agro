import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />
            <main className="flex-grow flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 max-w-lg w-full">
                    <div className="text-8xl mb-6">🤔</div>
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Page Not Found</h1>
                    <p className="text-gray-500 mb-8 text-lg">
                        Oops! The page you are looking for seems to have wandered off into the fields.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/"
                            className="px-8 py-3 bg-melagro-primary text-white rounded-xl font-bold hover:bg-melagro-secondary transition-all shadow-lg hover:translate-y-[-2px]"
                        >
                            Go Home
                        </Link>
                        <Link
                            href="/products"
                            className="px-8 py-3 bg-white text-gray-900 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all"
                        >
                            Browse Shop
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
