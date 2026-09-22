import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HelpCenterClient from "@/components/HelpCenterClient";
import { getDraftCmsPage, getLiveCmsPage } from "@/lib/cms-pages-server";
import { helpBlocksToFlat, type HelpBlocksPage } from "@/lib/cms-blocks";
import PreviewChrome, { parsePreviewMode } from "../PreviewChrome";

type Props = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function PreviewHelpPage({ searchParams }: Props) {
  const params = await searchParams;
  const mode = parsePreviewMode(params.mode);
  const snapshot = mode === "live" ? await getLiveCmsPage("help") : await getDraftCmsPage("help");
  const page = helpBlocksToFlat((snapshot.content as HelpBlocksPage).blocks);

  return (
    <PreviewChrome mode={mode} label="Help centre">
      <div className="min-h-screen flex flex-col bg-gray-50 font-sans flex-1">
        <Header />
        <main className="flex-grow py-12 px-4">
          <HelpCenterClient content={page} />
        </main>
        <Footer />
      </div>
    </PreviewChrome>
  );
}
