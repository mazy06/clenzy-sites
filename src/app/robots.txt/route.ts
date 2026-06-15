export const revalidate = 3600;

export async function GET(request: Request) {
  const host = request.headers.get('host') ?? '';
  const body = `User-agent: *\nAllow: /\nSitemap: https://${host}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
