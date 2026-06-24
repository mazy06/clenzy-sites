'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';

export interface SiteNavItem {
  path: string;
  label: string;
}

interface SiteNavProps {
  brandName: string;
  logoUrl: string | null;
  homePath: string;
  items: SiteNavItem[];
  /** Lien vers le widget de réservation (ancre #reserver), ou null si pas de booking engine. */
  reserveHref: string | null;
  reserveLabel: string;
  /** Langues du site (défaut + variantes) — affiche un sélecteur de langue si ≥ 2. */
  locales: string[];
  /** Langue par défaut (servie sans `?lang=`). */
  defaultLocale: string;
}

/**
 * En-tête de navigation inter-pages d'un site hébergé (SSR). Liste les pages navigables du site
 * (HOME / PROPERTY_LIST / BLOG / CUSTOM) avec état actif, + CTA « Réserver » optionnel. Client
 * component pour `usePathname()` (surlignage de la page courante) et le menu mobile ; les données
 * proviennent du layout serveur (site déjà résolu par hôte).
 */
export default function SiteNav({ brandName, logoUrl, homePath, items, reserveHref, reserveLabel, locales, defaultLocale }: SiteNavProps) {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);

  const isActive = (path: string): boolean => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header className="bkly-nav">
      <div className="bkly-nav__inner">
        <Link href={homePath} className="bkly-nav__brand" onClick={() => setOpen(false)}>
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="bkly-nav__logo" />
          ) : (
            <span className="bkly-nav__brand-name">{brandName}</span>
          )}
        </Link>

        {items.length > 0 ? (
          <button
            type="button"
            className="bkly-nav__toggle"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="bkly-nav__toggle-bar" />
            <span className="bkly-nav__toggle-bar" />
            <span className="bkly-nav__toggle-bar" />
          </button>
        ) : null}

        <nav className={`bkly-nav__menu${open ? ' bkly-nav__menu--open' : ''}`}>
          {items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`bkly-nav__link${isActive(item.path) ? ' bkly-nav__link--active' : ''}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {reserveHref ? (
            <Link href={reserveHref} className="bkly-nav__cta" onClick={() => setOpen(false)}>
              {reserveLabel}
            </Link>
          ) : null}
          <LanguageSwitcher locales={locales} defaultLocale={defaultLocale} />
        </nav>
      </div>
    </header>
  );
}
