/* eslint-disable @next/next/no-img-element -- ImageResponse renders standard image elements server-side. */
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

const ALLOWED_IMAGE_HOSTS = [
    'firebasestorage.googleapis.com',
    'firebasestorage.app',
    'images.unsplash.com',
    'placehold.co',
    'via.placeholder.com',
    'cdn-icons-png.flaticon.com',
];

function isAllowedImageUrl(raw: string | null): string | null {
    if (!raw) return null;
    try {
        const u = new URL(raw);
        if (u.protocol !== 'https:') return null;
        const host = u.hostname.toLowerCase();
        const allowed = ALLOWED_IMAGE_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
        return allowed ? u.toString() : null;
    } catch {
        return null;
    }
}

function sanitiseText(s: string | null, fallback: string, max = 120): string {
    if (!s) return fallback;
    return s.replace(/[<>]/g, '').slice(0, max);
}

// Raster formats the OG renderer (resvg via <img>) can safely decode.
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/**
 * Fetch the product image and return it as a data URI, but only when it is a
 * fetchable, supported raster image within a sane size. Returns null on any
 * problem (bad URL, network error, unsupported/SVG type, too large) so the
 * card falls back to the emoji instead of 500-ing the whole OG image.
 */
async function loadImageDataUrl(url: string | null): Promise<string | null> {
    if (!url) return null;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return null;
        const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!SUPPORTED_IMAGE_TYPES.includes(type)) return null;
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength === 0 || buffer.byteLength > 3_000_000) return null;
        return `data:${type};base64,${Buffer.from(buffer).toString('base64')}`;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const name = sanitiseText(searchParams.get('name'), 'High Quality Product', 120);
        const rawPrice = searchParams.get('price') || '';
        const price = /^\d+(\.\d+)?$/.test(rawPrice) ? rawPrice : '';
        const category = sanitiseText(searchParams.get('category'), 'Agriculture', 40);
        const image = await loadImageDataUrl(isAllowedImageUrl(searchParams.get('image')));

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                        fontFamily: 'sans-serif',
                        padding: '40px',
                    }}
                >
                    {/* Background Pattern (painted first, so it sits behind the content) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-10%',
                            right: '-10%',
                            width: '40%',
                            height: '40%',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '50%',
                            filter: 'blur(100px)',
                        }}
                    />

                    {/* Content Box */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#fff',
                            borderRadius: '32px',
                            border: '1px solid #e5e7eb',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        {/* Image Side */}
                        <div
                            style={{
                                display: 'flex',
                                width: '45%',
                                height: '100%',
                                backgroundColor: '#f8fcf9',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '40px',
                            }}
                        >
                            {image ? (
                                <img
                                    alt=""
                                    src={image}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : (
                                <div style={{ fontSize: 100 }}>🌱</div>
                            )}
                        </div>

                        {/* Details Side */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                width: '55%',
                                padding: '60px',
                                justifyContent: 'center',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: '18px',
                                    fontWeight: '900',
                                    color: '#16a34a',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2em',
                                    marginBottom: '16px',
                                }}
                            >
                                {category}
                            </div>
                            <div
                                style={{
                                    fontSize: '48px',
                                    fontWeight: 'bold',
                                    color: '#111827',
                                    lineHeight: '1.1',
                                    marginBottom: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                {name}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: '36px',
                                        fontWeight: '900',
                                        color: '#111827',
                                    }}
                                >
                                    {`KES ${price}`}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        marginLeft: 'auto',
                                        backgroundColor: '#16a34a',
                                        color: '#fff',
                                        padding: '12px 24px',
                                        borderRadius: '16px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Mel-Agri.COM
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
