'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface LanguageSwitcherProps {
  /** Langues du site (défaut + variantes), dédupliquées. */
  locales: string[];
  /** Langue par défaut (servie sans `?lang=`). */
  defaultLocale: string;
}

const LABEL: Record<string, string> = { fr: 'FR', en: 'EN', ar: 'AR' };

/**
 * Sélecteur de langue du site publié. Bascule la locale via `?lang=` (la page SSR sert alors la
 * variante traduite, cf. `resolveLocale`/`getPage`). Maintient aussi `dir`/`lang` du document (RTL pour
 * l'arabe) au fil des changements de `?lang=`. Ne s'affiche que si le site déclare ≥ 2 langues.
 */
export default function LanguageSwitcher({ locales, defaultLocale }: LanguageSwitcherProps) {
  const pathname = usePathname() || '/';
  const params = useSearchParams();
  const current = params.get('lang') || defaultLocale;

  // RTL/lang globaux : suivent la langue demandée (le SSR fixe déjà la valeur par défaut côté <html>).
  useEffect(() => {
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
  }, [current]);

  if (locales.length <= 1) return null;

  const hrefFor = (loc: string): string => {
    const sp = new URLSearchParams(params.toString());
    if (loc === defaultLocale) sp.delete('lang');
    else sp.set('lang', loc);
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="bkly-lang" role="group" aria-label="Langue">
      {locales.map((loc) => (
        <Link
          key={loc}
          href={hrefFor(loc)}
          className={`bkly-lang__item${loc === current ? ' bkly-lang__item--active' : ''}`}
          aria-current={loc === current ? 'true' : undefined}
          hrefLang={loc}
        >
          {LABEL[loc] ?? loc.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
