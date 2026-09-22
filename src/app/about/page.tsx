import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Metadata } from "next";
import { getLiveCmsPage } from "@/lib/cms-pages-server";
import type { AboutPageContent } from "@/lib/cms-pages";
import AboutPageView from "@/components/cms/AboutPageView";

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
  const page = content as AboutPageContent;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      <AboutPageView page={page} />
      <Footer />
    </div>
  );
}
