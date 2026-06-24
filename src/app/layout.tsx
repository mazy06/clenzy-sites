import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { resolveSiteByHost } from '@/lib/api';
import { buildThemeVars } from '@/lib/theme';
import { buildNavModel } from '@/lib/nav';
import SiteNav from '@/components/SiteNav';
import SiteConcierge from '@/components/SiteConcierge';
import { RawStyle, RawScript } from '@/lib/rawInject';

// Le site dépend de l'hôte → rendu dynamique (résolution par requête).
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  const lang = site?.defaultLocale || 'fr';
  const nav = site ? buildNavModel(site) : null;
  // Langues du site (défaut + variantes déclarées), dédupliquées — alimente le sélecteur de langue.
  const locales = Array.from(new Set([
    lang,
    ...(site?.locales || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  ]));
  // `dir` par défaut côté serveur (le sélecteur l'ajuste ensuite selon `?lang=`).
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <div style={site ? buildThemeVars(site) : undefined}>
          {/* CSS custom du site (importé depuis le template / Studio) — injecté brut en tête. */}
          {site?.customCss ? <RawStyle css={site.customCss} /> : null}
          {nav ? (
            <SiteNav
              brandName={nav.brandName}
              logoUrl={nav.logoUrl}
              homePath={nav.homePath}
              items={nav.items}
              reserveHref={nav.reserveHref}
              reserveLabel={nav.reserveLabel}
              locales={locales}
              defaultLocale={lang}
            />
          ) : null}
          {children}
          {site?.bookingEngineApiKey ? <SiteConcierge apiKey={site.bookingEngineApiKey} /> : null}
          {/* JS custom du site — en fin de body (DOM prêt). */}
          {site?.customJs ? <RawScript js={site.customJs} /> : null}
        </div>
      </body>
    </html>
  );
}
