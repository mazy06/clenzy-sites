import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveSiteByHost, getPage, listProperties } from '@/lib/api';
import { BlockRenderer, GrapesPageRenderer } from '@/lib/blocks';
import { detectPageContent } from '@/lib/pageContent';
import { JsonLd, buildAlternates, resolveLocale, lodgingBusinessSchema, isHome } from '@/lib/seo';
import ReservationWidget from '@/components/ReservationWidget';
import BookingSDKBootstrap from '@/components/BookingSDKBootstrap';

export const revalidate = 300; // ISR

type SearchParams = { [key: string]: string | string[] | undefined };

function pathFromParams(params: { path?: string[] }): string {
  return '/' + (params.path?.join('/') ?? '');
}

export async function generateMetadata(
  { params, searchParams }: { params: { path?: string[] }; searchParams: SearchParams },
): Promise<Metadata> {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) return {};
  const path = pathFromParams(params);
  const locale = resolveLocale(site, searchParams.lang);
  const page = await getPage(site.id, path, locale);
  const title = page?.seoTitle || page?.title || site.seoTitle || site.name;
  const description = page?.seoDescription || site.seoDescription || undefined;
  const ogImage = page?.seoOgImageUrl || site.seoOgImageUrl || undefined;
  return {
    title,
    description,
    alternates: buildAlternates(path, site, locale),
    openGraph: {
      title: title ?? undefined,
      description,
      type: 'website',
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function Page(
  { params, searchParams }: { params: { path?: string[] }; searchParams: SearchParams },
) {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) notFound();
  const path = pathFromParams(params);
  const locale = resolveLocale(site, searchParams.lang);
  const page = await getPage(site.id, path, locale);
  if (!page) notFound();

  // Détection du format de la page : GrapesJS (HTML+CSS extraits) vs legacy (liste de blocs).
  const content = detectPageContent(page.blocks);
  const isGrapes = content?.kind === 'grapes';

  // Vraies fiches dans le bloc grille (liens internes → /logement/{id}) : fetch seulement pour une
  // page legacy qui contient `propertyGrid`, et si le site a un booking engine. Une page GrapesJS
  // n'a pas de bloc `propertyGrid` → 0 fetch.
  const apiKey = site.bookingEngineApiKey;
  const properties = !isGrapes && apiKey && page.blocks?.includes('propertyGrid')
    ? await listProperties(apiKey)
    : [];

  return (
    // `bkly-page` = contexte de container query (visibilité responsive par bloc, 2.5).
    <div className="bkly-page">
      {isHome(page) ? <JsonLd data={lodgingBusinessSchema(site, `https://${host}/`)} /> : null}
      {isGrapes ? (
        // Page GrapesJS : HTML assaini + CSS scopé. Le SDK hydrate ensuite les marqueurs
        // `data-clenzy-widget` présents dans ce HTML (voir BookingSDKBootstrap plus bas).
        <GrapesPageRenderer html={content.html} css={content.css} />
      ) : (
        <BlockRenderer
          blocksJson={page.blocks}
          properties={properties}
          widget={{
            apiKey: site.bookingEngineApiKey,
            componentConfig: site.componentConfig,
            primaryColor: site.primaryColor,
            language: site.defaultLocale,
            leadCapture: site.leadCapturePopupEnabled,
          }}
        />
      )}
      {/* Hydratation des marqueurs `data-clenzy-widget` du HTML GrapesJS (idempotent, page GrapesJS seule). */}
      {isGrapes && site.bookingEngineApiKey ? (
        <BookingSDKBootstrap
          apiKey={site.bookingEngineApiKey}
          primaryColor={site.primaryColor}
          language={site.defaultLocale}
          componentConfig={site.componentConfig}
          leadCapture={site.leadCapturePopupEnabled}
        />
      ) : null}
      {/* Embed monolithe (#reserver) UNIQUEMENT sur les pages legacy : une page GrapesJS utilise les
          marqueurs hydratés (BookingSDKBootstrap ci-dessus) → évite un DOUBLE montage du widget. */}
      {!isGrapes && site.bookingEngineApiKey ? (
        <section id="reserver" className="bkly-reserve">
          <div className="bkly-reserve__title">Réservez votre séjour</div>
          <ReservationWidget
            apiKey={site.bookingEngineApiKey}
            primaryColor={site.primaryColor}
            language={site.defaultLocale}
            componentConfig={site.componentConfig}
            customCss={site.customCss}
            leadCapture={site.leadCapturePopupEnabled}
          />
        </section>
      ) : null}
    </div>
  );
}
