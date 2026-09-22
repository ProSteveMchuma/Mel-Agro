import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroPreview from "@/components/cms/HeroPreview";
import { getDraftHomepage, getLiveHomepage } from "@/lib/cms-homepage-server";
import PreviewChrome, { parsePreviewMode } from "../PreviewChrome";

type Props = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function PreviewHomePage({ searchParams }: Props) {
  const params = await searchParams;
  const mode = parsePreviewMode(params.mode);
  const snapshot = mode === "live" ? await getLiveHomepage() : await getDraftHomepage();

  return (
    <PreviewChrome mode={mode} label="Homepage banners">
      <Header />
      <main className="flex-grow w-full bg-white">
        <HeroPreview banners={snapshot.banners} />
        <section className="container-custom py-10">
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Preview shows the hero banners only ({snapshot.banners.filter((b) => b.active).length} active of{" "}
            {snapshot.banners.length}). The rest of the homepage (featured products, categories) still uses live
            catalogue data.
          </p>
        </section>
      </main>
      <Footer />
    </PreviewChrome>
  );
}
