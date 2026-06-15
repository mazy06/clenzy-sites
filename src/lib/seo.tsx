import type { SitePublic, SitePagePublic, BlogPostPublic } from './api';

/**
 * Helpers SEO du SSR (P1.2) : JSON-LD (schema.org) + alternates hreflang. Le JSON-LD est rendu en
 * enfant texte d'un `<script type="application/ld+json">` avec `&`/`<`/`>` pré-échappés en `\uXXXX`
 * (les parseurs JSON les décodent ; React ne les ré-échappe pas) → sortie valide, sans HTML brut ni
 * risque d'échappement de balise `</script>`.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
  return <script type="application/ld+json">{json}</script>;
}

/** Locales déclarées du site (CSV), normalisées + dédupliquées, avec la locale par défaut en tête. */
export function siteLocales(site: SitePublic): string[] {
  const def = site.defaultLocale || 'fr';
  const list = (site.locales || '')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  const ordered = [def, ...list.filter((l) => l !== def)];
  return [...new Set(ordered)];
}

/** Locale effective d'une requête : `?lang=` si déclarée par le site, sinon la locale par défaut. */
export function resolveLocale(site: SitePublic, lang: string | string[] | undefined): string {
  const requested = Array.isArray(lang) ? lang[0] : lang;
  const locales = siteLocales(site);
  return requested && locales.includes(requested) ? requested : (site.defaultLocale || 'fr');
}

function localeUrl(path: string, locale: string, defaultLocale: string): string {
  if (locale === defaultLocale) return path;
  return `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`;
}

/**
 * Alternates Next (canonical auto-référent par locale + hreflang). hreflang n'est émis que si le
 * site déclare ≥ 2 locales (sinon inutile). La page sert réellement la locale via `?lang=` (repli
 * backend vers la variante locale-null si la traduction manque).
 */
export function buildAlternates(path: string, site: SitePublic, currentLocale: string) {
  const def = site.defaultLocale || 'fr';
  const canonical = localeUrl(path, currentLocale, def);
  const locales = siteLocales(site);
  if (locales.length <= 1) {
    return { canonical };
  }
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = localeUrl(path, loc, def);
  }
  languages['x-default'] = localeUrl(path, def, def);
  return { canonical, languages };
}

/** schema.org/LodgingBusiness — identité de l'hébergeur (rendu sur la page d'accueil du site). */
export function lodgingBusinessSchema(site: SitePublic, url: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: site.name,
    url,
  };
  if (site.seoDescription) data.description = site.seoDescription;
  if (site.logoUrl) data.image = site.logoUrl;
  return data;
}

/** schema.org/Article — article de blog. */
export function articleSchema(site: SitePublic, post: BlogPostPublic, url: string): Record<string, unknown> {
  const image = post.seoOgImageUrl || post.coverImageUrl || undefined;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    mainEntityOfPage: url,
    publisher: { '@type': 'Organization', name: site.name },
    author: { '@type': 'Organization', name: site.name },
  };
  if (post.seoDescription || post.excerpt) data.description = post.seoDescription || post.excerpt;
  if (image) data.image = image;
  if (post.publishedAt) data.datePublished = post.publishedAt;
  return data;
}

/** Type d'une page : utilisé pour ne rendre LodgingBusiness que sur l'accueil. */
export function isHome(page: SitePagePublic): boolean {
  return page.type === 'HOME' || page.path === '/';
}
