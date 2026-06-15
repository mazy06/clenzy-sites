import { resolveSiteByHost, listPosts } from '@/lib/api';

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
  const posts = await listPosts(site.id);
  const items = posts
    .map((p) => {
      const pub = p.publishedAt ? `<pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>` : '';
      return `<item><title>${xmlEscape(p.title)}</title><link>${base}/blog/${xmlEscape(p.slug)}</link>${pub}<description>${xmlEscape(p.excerpt ?? '')}</description></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xmlEscape(site.name)}</title><link>${base}</link><description>${xmlEscape(site.seoDescription ?? site.name)}</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
