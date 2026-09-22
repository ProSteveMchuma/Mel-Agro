import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AboutPageView from "@/components/cms/AboutPageView";
import { getDraftCmsPage, getLiveCmsPage } from "@/lib/cms-pages-server";
import type { AboutBlocksPage } from "@/lib/cms-blocks";
import PreviewChrome, { parsePreviewMode } from "../PreviewChrome";

type Props = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function PreviewAboutPage({ searchParams }: Props) {
  const params = await searchParams;
  const mode = parsePreviewMode(params.mode);
  const snapshot = mode === "live" ? await getLiveCmsPage("about") : await getDraftCmsPage("about");

  return (
    <PreviewChrome mode={mode} label="About Mel-Agri">
      <Header />
      <AboutPageView page={snapshot.content as AboutBlocksPage} />
      <Footer />
    </PreviewChrome>
  );
}
