import type { SitePublic, PageSummary } from './api';
import type { SiteNavItem } from '@/components/SiteNav';

/** Types de pages exposés dans la navigation inter-pages (PROPERTY_DETAIL = dynamique, exclu). */
const NAV_TYPES = new Set(['HOME', 'PROPERTY_LIST', 'BLOG', 'CUSTOM']);

const LABELS: Record<string, { home: string; blog: string; reserve: string }> = {
  fr: { home: 'Accueil', blog: 'Blog', reserve: 'Réserver' },
  en: { home: 'Home', blog: 'Blog', reserve: 'Book now' },
  ar: { home: 'الرئيسية', blog: 'المدونة', reserve: 'احجز' },
};

function labels(locale: string) {
  return LABELS[locale] ?? LABELS.fr;
}

function labelFor(page: PageSummary, locale: string): string {
  if (page.title && page.title.trim()) return page.title.trim();
  const l = labels(locale);
  if (page.type === 'HOME') return l.home;
  if (page.type === 'BLOG') return l.blog;
  return page.path === '/' ? l.home : page.path.replace(/^\//, '');
}

export interface SiteNavModel {
  brandName: string;
  logoUrl: string | null;
  homePath: string;
  items: SiteNavItem[];
  reserveHref: string | null;
  reserveLabel: string;
}

/**
 * Construit le modèle de navigation d'un site : pages navigables triées (sortOrder), dédupliquées
 * par path, + lien « Réserver » (ancre #reserver sur l'accueil) si un booking engine est branché.
 */
export function buildNavModel(site: SitePublic): SiteNavModel {
  const locale = site.defaultLocale || 'fr';
  const seen = new Set<string>();
  const navigable = [...site.pages]
    .filter((p) => NAV_TYPES.has(p.type))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((p) => {
      if (seen.has(p.path)) return false;
      seen.add(p.path);
      return true;
    });

  const homePage = navigable.find((p) => p.type === 'HOME');
  const homePath = homePage?.path ?? '/';

  const items: SiteNavItem[] = navigable.map((p) => ({ path: p.path, label: labelFor(p, locale) }));

  const reserveHref = site.bookingEngineApiKey
    ? `${homePath === '/' ? '' : homePath}/#reserver`.replace('//#', '/#')
    : null;

  return {
    brandName: site.name,
    logoUrl: site.logoUrl,
    homePath,
    items,
    reserveHref,
    reserveLabel: labels(locale).reserve,
  };
}
