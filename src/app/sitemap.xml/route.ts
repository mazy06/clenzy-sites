import { resolveSiteByHost, getSitemap } from '@/lib/api';

export const revalidate = 600;

const xmlEscape = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET(request: Request) {
  const host = request.headers.get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) {
    return new Response('Not found', { status: 404 });
  }
  const base = `https://${host}`;
  const entries = await getSitemap(site.id);
  const urls = entries
    .map((e) => {
      const loc = xmlEscape(base + e.path);
      const lastmod = e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : '';
      return `<url><loc>${loc}</loc>${lastmod}</url>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
