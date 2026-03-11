import { Metadata } from 'next';
import { getGuideBySlug, getGuides } from '@/lib/guides';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { notFound } from 'next/navigation';
import Image from 'next/image';

type Props = {
    params: Promise<{ slug: string }>;
};

// Generate static params if we want to statically export later
export async function generateStaticParams() {
    const guides = await getGuides();
    return guides.map((guide) => ({
        slug: guide.slug,
    }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const guide = await getGuideBySlug(slug);

    if (!guide) {
        return { title: 'Guide Not Found | Mel-Agri' };
    }

    return {
        title: `${guide.title} | Farmer's Knowledge Base`,
        description: guide.description,
        openGraph: {
            title: guide.title,
            description: guide.description,
            type: 'article',
            publishedTime: guide.publishedAt,
            authors: [guide.author],
        },
    };
}

// A simple recursive mock markdown renderer for MVP
function parseSimpleMarkdown(markdown: string) {
    let html = markdown
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-8 mb-4 text-gray-900">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black mt-12 mb-6 text-gray-900">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black mt-14 mb-8 text-gray-900">$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        // Basic list parsing
        .replace(/^\- (.*$)/gim, '<li class="ml-6 list-disc mb-2">$1</li>')
        .replace(/^[0-9]\. (.*$)/gim, '<li class="ml-6 list-decimal mb-2">$1</li>');

    // Basic table parsing (very naive for MVP)
    if (html.includes('|')) {
        const rows = html.split('\\n').filter(r => r.trim().startsWith('|'));
        if (rows.length > 0) {
            let tableHtml = '<div class="overflow-x-auto my-8"><table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">';
            rows.forEach((row, rowIndex) => {
                if (row.includes('---')) return; // skip divider
                const cells = row.split('|').filter(c => c.trim() !== '');
                tableHtml += '<tr class="' + (rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white') + '">';
                cells.forEach(cell => {
                    if (rowIndex === 0) {
                        tableHtml += \`<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200">\${cell.trim()}</th>\`;
                    } else {
                        tableHtml += \`<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-b border-gray-100">\${cell.trim()}</td>\`;
                    }
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</table></div>';
            
            // Replace the raw markdown table roughly with the HTML table
            html = html.replace(/\\|.*?\\|[\\s\\S]*?\\n(?=\\n|$)/im, tableHtml); // Naive replacement
        }
    }

    // Wrap un-tagged text in paragraphs
    const paragraphs = html.split('\\n\\n');
    html = paragraphs.map(p => {
        if (!p.trim().startsWith('<') && p.trim().length > 0) {
             return \`<p class="mb-6 leading-relaxed text-gray-700 text-lg">\${p}</p>\`;
        }
        return p;
    }).join('\\n');

    return html;
}

export default async function GuidePage({ params }: Props) {
    const { slug } = await params;
    const guide = await getGuideBySlug(slug);

    if (!guide) {
        notFound();
    }

    // 1. Article JSON-LD for Standard SEO
    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: guide.title,
        description: guide.description,
        image: \`https://mel-agri.com\${guide.image}\`,
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt,
        author: {
            '@type': 'Organization',
            name: guide.author,
            url: 'https://mel-agri.com',
        },
        publisher: {
            '@type': 'Organization',
            name: 'Mel-Agri',
            logo: {
                '@type': 'ImageObject',
                url: 'https://mel-agri.com/logo.png',
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': \`https://mel-agri.com/guides/\${guide.slug}\`,
        },
    };

    // 2. FAQPage JSON-LD strictly for AI Engines and Google Featured Snippets
    const faqJsonLd = guide.qaList && guide.qaList.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: guide.qaList.map(qa => ({
            '@type': 'Question',
            name: qa.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: qa.answer,
            }
        }))
    } : null;

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-green-100 selection:text-green-900">
            {/* Inject Structured Data for AIs */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
            {faqJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
                />
            )}

            <Header />
            <main className="flex-grow w-full py-10 md:py-20">
                <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header Section */}
                    <div className="text-center mb-12">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            {guide.tags.map(tag => (
                                <span key={tag} className="text-xs font-black uppercase tracking-widest text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
                            {guide.title}
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
                            {guide.description}
                        </p>
                        
                        <div className="flex items-center justify-center gap-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            <span>{new Date(guide.publishedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="text-gray-900">{guide.author}</span>
                        </div>
                    </div>

                    {/* Hero Image */}
                    <div className="relative w-full h-[300px] md:h-[500px] rounded-[2rem] overflow-hidden shadow-2xl mb-16">
                        <Image
                            src={guide.image || '/assets/blogs/placeholder.jpg'}
                            alt={guide.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>

                    {/* Quick Q&A Section (Optimized for AIO) */}
                    {guide.qaList && guide.qaList.length > 0 && (
                        <div className="bg-gray-50 rounded-3xl p-8 md:p-12 mb-16 border border-gray-100 shadow-sm">
                            <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                <span className="text-green-500">⚡</span> Quick Answers
                            </h2>
                            <div className="space-y-6">
                                {guide.qaList.map((qa, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
                                        <h3 className="font-bold text-gray-900 mb-2">{qa.question}</h3>
                                        <p className="text-gray-600 leading-relaxed">{qa.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Content Body */}
                    <div 
                        className="prose prose-lg prose-green max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(guide.content) }}
                    />
                </article>
            </main>
            <Footer />
            <WhatsAppButton />
        </div>
    );
}
