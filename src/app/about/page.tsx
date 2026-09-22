import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Metadata } from "next";
import { getLiveCmsPage } from "@/lib/cms-pages-server";
import AboutPageView from "@/components/cms/AboutPageView";
import type { AboutBlocksPage } from "@/lib/cms-blocks";

export const metadata: Metadata = {
  title: "About Our Premium Agritech & Agrovet Business in Kenya",
  description:
    "Bringing Quality Agricultural Inputs online in Kenya and Beyond. We are the online retail arm of Makamithi Enterprises Ltd, one of the largest distributors and retailers of Agricultural inputs (animal feeds, seeds, fertilizers, crop protection products and veterinary products) in Kenya.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Mel-Agri | Online Retail Arm of Makamithi Enterprises Ltd",
    description:
      "Bringing Quality Agricultural Inputs online in Kenya and Beyond. The online retail arm of Makamithi Enterprises Ltd.",
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
