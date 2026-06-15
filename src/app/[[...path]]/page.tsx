import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveSiteByHost, getPage } from '@/lib/api';
import { BlockRenderer } from '@/lib/blocks';
import ReservationWidget from '@/components/ReservationWidget';

export const revalidate = 300; // ISR

function pathFromParams(params: { path?: string[] }): string {
  return '/' + (params.path?.join('/') ?? '');
}

export async function generateMetadata({ params }: { params: { path?: string[] } }): Promise<Metadata> {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) return {};
  const path = pathFromParams(params);
  const page = await getPage(site.id, path, site.defaultLocale);
  const title = page?.seoTitle || page?.title || site.seoTitle || site.name;
  const description = page?.seoDescription || site.seoDescription || undefined;
  const ogImage = page?.seoOgImageUrl || site.seoOgImageUrl || undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: title ?? undefined,
      description,
      type: 'website',
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function Page({ params }: { params: { path?: string[] } }) {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) notFound();
  const path = pathFromParams(params);
  const page = await getPage(site.id, path, site.defaultLocale);
  if (!page) notFound();

  return (
    // `bkly-page` = contexte de container query (visibilité responsive par bloc, 2.5).
    <div className="bkly-page">
      <BlockRenderer blocksJson={page.blocks} />
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
