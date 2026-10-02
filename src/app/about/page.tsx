import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Metadata } from "next";
import { getLiveCmsPage } from "@/lib/cms-pages-server";
import AboutPageView from "@/components/cms/AboutPageView";
import type { AboutBlocksPage } from "@/lib/cms-blocks";

export const metadata: Metadata = {
  title: "About Our Premium Agritech & Agrovet Business in Kenya",
  description:
    "Mel-Agri is the online shop of Makamithi Enterprises Ltd in Machakos. Seeds, fertilizers, crop protection, and animal health, delivered across Kenya.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Mel-Agri | Online shop of Makamithi in Machakos",
    description:
      "Mel-Agri is the online shop of Makamithi Enterprises Ltd, based in Machakos.",
    url: "/about",
  },
};

export default async function AboutPage() {
  const { content } = await getLiveCmsPage("about");

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      <AboutPageView page={content as AboutBlocksPage} />
      <Footer />
    </div>
  );
}
