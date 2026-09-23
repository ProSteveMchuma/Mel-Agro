import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarketingPageView from "@/components/cms/MarketingPageView";
import { getDraftCmsPage, getLiveCmsPage } from "@/lib/cms-pages-server";
import type { MarketingBlocksPage } from "@/lib/cms-marketing";
import { isMarketingPageSlug } from "@/lib/cms-marketing";
import { notFound } from "next/navigation";
import PreviewChrome, { parsePreviewMode } from "../PreviewChrome";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
};

const LABELS: Record<string, string> = {
  delivery: "Delivery",
  returns: "Returns",
  privacy: "Privacy",
  terms: "Terms",
  contact: "Contact",
  bulk: "Bulk orders",
};

export default async function PreviewMarketingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!isMarketingPageSlug(slug)) notFound();

  const mode = parsePreviewMode((await searchParams).mode);
  const snapshot = mode === "live" ? await getLiveCmsPage(slug) : await getDraftCmsPage(slug);

  return (
    <PreviewChrome mode={mode} label={LABELS[slug] || slug}>
      <Header />
      <main className="flex-grow bg-gray-50 py-10">
        <div className="container-custom">
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:p-10">
            <MarketingPageView content={snapshot.content as MarketingBlocksPage} />
          </div>
        </div>
      </main>
      <Footer />
    </PreviewChrome>
  );
}
