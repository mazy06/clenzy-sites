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
  customCss: string | null;
  customJs: string | null;
  /** Composition de réservation (JSON `{widgetLayout,styleMode}`) — rendue par le SDK au montage. */
  componentConfig: string | null;
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

// ─── Hébergements (API publique du Booking Engine, X-Booking-Key) ──────────────
// Détail-propriété SSR (P1.2) : on consomme l'API booking publique côté serveur (clé du site).

/** Base media (photos servies par le PMS) — les URLs renvoyées sont relatives, à rendre absolues. */
export const MEDIA_BASE = (process.env.NEXT_PUBLIC_WIDGET_BASE_URL ?? 'https://app.clenzy.fr').replace(/\/$/, '');

/** Rend une URL média absolue (http(s) tel quel, sinon préfixée par MEDIA_BASE). */
export function absoluteMedia(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${MEDIA_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export interface ApiPropertySummary {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  priceFrom: number | null;
  currency: string;
  mainPhotoUrl: string | null;
}

export interface ApiPropertyPhoto {
  id: number;
  url: string;
  caption: string | null;
}

export interface ApiPropertyDetail {
  id: number;
  name: string;
  description: string | null;
  type: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  bedroomCount: number | null;
  bathroomCount: number | null;
  maxGuests: number | null;
  squareMeters: number | null;
  nightlyPrice: number | null;
  minimumNights: number | null;
  currency: string;
  photos: ApiPropertyPhoto[];
  amenities: string[] | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  host: { firstName: string | null; lastInitial: string | null; profilePictureUrl: string | null } | null;
}

async function getBookingJson<T>(apiKey: string, path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/booking/widget${path}`, {
      headers: { 'X-Booking-Key': apiKey },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Liste des hébergements publics du site (pour le sitemap + liens internes). */
export async function listProperties(apiKey: string): Promise<ApiPropertySummary[]> {
  return (await getBookingJson<ApiPropertySummary[]>(apiKey, '/properties', 600)) ?? [];
}

/** Détail d'un hébergement (description, photos, équipements, géo…). */
export function getPropertyDetail(apiKey: string, id: string | number): Promise<ApiPropertyDetail | null> {
  return getBookingJson<ApiPropertyDetail>(apiKey, `/properties/${encodeURIComponent(String(id))}`, 300);
}
