import { resolveSiteByHost, getSitemap, listProperties } from '@/lib/api';

export const revalidate = 600;

const xmlEscape = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function urlTag(loc: string, lastmod?: string | null): string {
  const mod = lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : '';
  return `<url><loc>${xmlEscape(loc)}</loc>${mod}</url>`;
}

export async function GET(request: Request) {
  const host = request.headers.get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) {
    return new Response('Not found', { status: 404 });
  }
  const base = `https://${host}`;

  // Pages + articles (backend) + URLs dynamiques des fiches logement (API booking, P1.2).
  const entries = await getSitemap(site.id);
  const parts = entries.map((e) => urlTag(base + e.path, e.lastmod));

  if (site.bookingEngineApiKey) {
    const properties = await listProperties(site.bookingEngineApiKey);
    for (const p of properties) {
      parts.push(urlTag(`${base}/logement/${p.id}`));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${parts.join('')}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
