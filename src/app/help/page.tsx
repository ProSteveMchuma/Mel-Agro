import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HelpCenterClient from "@/components/HelpCenterClient";
import { getLiveCmsPage } from "@/lib/cms-pages-server";
import type { HelpPageContent } from "@/lib/cms-pages";

export default async function HelpCenterPage() {
    const { content } = await getLiveCmsPage("help");
    const page = content as HelpPageContent;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />
            <main className="flex-grow py-12 px-4">
                <HelpCenterClient content={page} />
            </main>
            <Footer />
        </div>
    );
}
