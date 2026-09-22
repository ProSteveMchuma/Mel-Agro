import { adminDb } from '@/lib/firebase-admin';

export type HomepageBanner = {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  image: string;
  link: string;
  active: boolean;
};

export type HomepageSnapshot = {
  banners: HomepageBanner[];
  version: number;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

function parseBanners(raw: unknown): HomepageBanner[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || ''),
      title: String(item.title || ''),
      subtitle: String(item.subtitle || ''),
      description: item.description != null ? String(item.description) : undefined,
      image: String(item.image || ''),
      link: String(item.link || '/products'),
      active: Boolean(item.active),
    }))
    .filter((item) => item.id && item.title && item.image);
}

export async function getLiveHomepage(): Promise<HomepageSnapshot> {
  try {
    const snap = await adminDb.collection('content').doc('homepage').get();
    const data = snap.data() || {};
    return {
      banners: parseBanners(data.banners),
      version: Number(data.version || 0),
      publishedAt: (data.publishedAt as string) || null,
    };
  } catch (error) {
    console.warn('Failed to load live homepage content:', error);
    return { banners: [], version: 0, publishedAt: null };
  }
}

export async function getDraftHomepage(): Promise<HomepageSnapshot> {
  try {
    const [live, draft] = await Promise.all([
      adminDb.collection('content').doc('homepage').get(),
      adminDb.collection('content').doc('homepageDraft').get(),
    ]);
    const liveData = live.data() || {};
    const draftData = draft.exists ? draft.data() || {} : liveData;
    const source = draft.exists ? draftData : liveData;
    return {
      banners: parseBanners(source.banners),
      version: Number(draftData.version ?? liveData.version ?? 0),
      updatedAt: (draftData.updatedAt as string) || null,
      publishedAt: (liveData.publishedAt as string) || null,
    };
  } catch (error) {
    console.warn('Failed to load draft homepage content:', error);
    return { banners: [], version: 0, publishedAt: null };
  }
}
