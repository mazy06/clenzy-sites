// Couche d'accès au contrat REST « Clenzy Sites » exposé par le backend Spring.
// Tous les appels sont SERVER-SIDE (jamais exposer CLENZY_API_BASE_URL au client).

const API_BASE = process.env.CLENZY_API_BASE_URL ?? 'http://localhost:8084';

// ─── Types (miroir des DTO backend) ──────────────────────────────────────────

export interface PageSummary {
  path: string;
  type: string;
  title: string | null;
  locale: string | null;
  sortOrder: number;
}

export interface SitePublic {
  id: number;
  slug: string;
  name: string;
  defaultLocale: string;
  locales: string; // CSV "fr,en,ar"
  designTokens: string | null;
  primaryColor: string | null;
  fontFamily: string | null;
  logoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageUrl: string | null;
  bookingEngineConfigId: number | null;
  bookingEngineApiKey: string | null;
  pages: PageSummary[];
}

export interface SitePagePublic {
  path: string;
  type: string;
  title: string | null;
  blocks: string | null; // JSON (liste de blocs)
  locale: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageUrl: string | null;
}

export interface BlogPostSummary {
  slug: string;
  locale: string | null;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  tags: string | null;
  publishedAt: string | null;
}

export interface BlogPostPublic extends BlogPostSummary {
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageUrl: string | null;
}

export interface SitemapEntry {
  path: string;
  type: string;
  locale: string | null;
  lastmod: string | null;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function getJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${url}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Résout le site servi pour un hostname (sous-domaine ou domaine custom). */
export function resolveSiteByHost(hostname: string): Promise<SitePublic | null> {
  return getJson<SitePublic>(`/api/public/sites/resolve?hostname=${encodeURIComponent(hostname)}`, 60);
}

export function getPage(siteId: number, path: string, locale?: string): Promise<SitePagePublic | null> {
  const q = `path=${encodeURIComponent(path)}${locale ? `&locale=${encodeURIComponent(locale)}` : ''}`;
  return getJson<SitePagePublic>(`/api/public/sites/${siteId}/page?${q}`, 300);
}

export async function listPosts(siteId: number): Promise<BlogPostSummary[]> {
  return (await getJson<BlogPostSummary[]>(`/api/public/sites/${siteId}/posts`, 300)) ?? [];
}

export function getPost(siteId: number, slug: string, locale?: string): Promise<BlogPostPublic | null> {
  const q = `slug=${encodeURIComponent(slug)}${locale ? `&locale=${encodeURIComponent(locale)}` : ''}`;
  return getJson<BlogPostPublic>(`/api/public/sites/${siteId}/posts/by-slug?${q}`, 300);
}

export async function getSitemap(siteId: number): Promise<SitemapEntry[]> {
  return (await getJson<SitemapEntry[]>(`/api/public/sites/${siteId}/sitemap`, 600)) ?? [];
}

/** Parse les design tokens (JSON) en objet, ou null. */
export function parseTokens(json: string | null): Record<string, string> | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return null;
  }
}
