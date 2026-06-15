import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveSiteByHost, getPropertyDetail, absoluteMedia, type ApiPropertyDetail } from '@/lib/api';
import { renderMarkdown } from '@/lib/markdown';
import { JsonLd, propertySchema } from '@/lib/seo';

export const revalidate = 300;

async function load(id: string) {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site || !site.bookingEngineApiKey) return null;
  const property = await getPropertyDetail(site.bookingEngineApiKey, id);
  return property ? { host, site, property } : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await load(params.id);
  if (!data) return {};
  const { property } = data;
  const description = property.description ? property.description.slice(0, 160) : undefined;
  const ogImage = absoluteMedia(property.photos?.[0]?.url) ?? undefined;
  return {
    title: property.name,
    description,
    alternates: { canonical: `/logement/${property.id}` },
    openGraph: {
      title: property.name,
      description,
      type: 'website',
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const data = await load(params.id);
  if (!data) notFound();
  const { host, property } = data;

  const photos = (property.photos ?? []).map((p) => absoluteMedia(p.url)).filter((u): u is string => !!u);
  const facts = capacityFacts(property);
  const price = property.nightlyPrice != null ? `${property.nightlyPrice} ${property.currency || 'EUR'}` : null;

  return (
    <article className="bkly-listing">
      <JsonLd data={propertySchema(property, `https://${host}/logement/${property.id}`)} />

      {photos.length > 0 ? (
        <div className="bkly-listing__gallery">
          <img className="bkly-listing__hero" src={photos[0]} alt={property.name} />
          {photos.length > 1 ? (
            <div className="bkly-listing__thumbs">
              {photos.slice(1, 5).map((src, i) => (
                <img key={i} src={src} alt={`${property.name} — photo ${i + 2}`} loading="lazy" />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <header className="bkly-listing__head">
        <h1>{property.name}</h1>
        {(property.city || property.country) ? (
          <div className="bkly-listing__loc">{[property.city, property.country].filter(Boolean).join(', ')}</div>
        ) : null}
        {facts.length ? <div className="bkly-listing__facts">{facts.join(' · ')}</div> : null}
      </header>

      {price ? (
        <div className="bkly-listing__price"><strong>{price}</strong> <span>/ nuit</span></div>
      ) : null}

      {property.description ? (
        <section className="bkly-listing__section bkly-article__body">{renderMarkdown(property.description)}</section>
      ) : null}

      {property.amenities && property.amenities.length ? (
        <section className="bkly-listing__section">
          <h2>Équipements</h2>
          <ul className="bkly-listing__amenities">
            {property.amenities.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>
      ) : null}

      {property.host?.firstName ? (
        <section className="bkly-listing__host">
          {property.host.profilePictureUrl ? (
            <img src={absoluteMedia(property.host.profilePictureUrl) ?? ''} alt="" className="bkly-listing__host-avatar" />
          ) : null}
          <span>Hôte : {property.host.firstName}{property.host.lastInitial ? ` ${property.host.lastInitial}` : ''}</span>
        </section>
      ) : null}

      <Link href="/#reserver" className="bkly-listing__cta">Vérifier les disponibilités</Link>
    </article>
  );
}

function capacityFacts(p: ApiPropertyDetail): string[] {
  const facts: string[] = [];
  if (p.bedroomCount != null) facts.push(`${p.bedroomCount} chambre${p.bedroomCount > 1 ? 's' : ''}`);
  if (p.bathroomCount != null) facts.push(`${p.bathroomCount} salle${p.bathroomCount > 1 ? 's' : ''} de bain`);
  if (p.maxGuests != null) facts.push(`${p.maxGuests} voyageur${p.maxGuests > 1 ? 's' : ''}`);
  if (p.squareMeters != null) facts.push(`${p.squareMeters} m²`);
  return facts;
}
