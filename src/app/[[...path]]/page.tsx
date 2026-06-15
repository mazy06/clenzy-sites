import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveSiteByHost, getPage, listProperties } from '@/lib/api';
import { BlockRenderer } from '@/lib/blocks';
import { JsonLd, buildAlternates, resolveLocale, lodgingBusinessSchema, isHome } from '@/lib/seo';
import ReservationWidget from '@/components/ReservationWidget';

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

  // Vraies fiches dans le bloc grille (liens internes → /logement/{id}) : fetch seulement si la page
  // en contient un, et si le site a un booking engine.
  const apiKey = site.bookingEngineApiKey;
  const properties = apiKey && page.blocks?.includes('propertyGrid')
    ? await listProperties(apiKey)
    : [];

  return (
    // `bkly-page` = contexte de container query (visibilité responsive par bloc, 2.5).
    <div className="bkly-page">
      {isHome(page) ? <JsonLd data={lodgingBusinessSchema(site, `https://${host}/`)} /> : null}
      <BlockRenderer blocksJson={page.blocks} properties={properties} />
      {site.bookingEngineApiKey ? (
        <section id="reserver" className="bkly-reserve">
          <div className="bkly-reserve__title">Réservez votre séjour</div>
          <ReservationWidget
            apiKey={site.bookingEngineApiKey}
            primaryColor={site.primaryColor}
            language={site.defaultLocale}
          />
        </section>
      ) : null}
    </div>
  );
}
