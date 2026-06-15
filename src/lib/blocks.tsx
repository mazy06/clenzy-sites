import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { absoluteMedia, type ApiPropertySummary } from './api';

/**
 * Rendu serveur des blocs composés (miroir du registre `bkly-*` du Studio). Le format est le même
 * JSON que `pageLayout` / `SitePage.blocks` : [{ type, props }]. Les classes `bkly-*` sont stylées
 * par globals.css. Tenu à parité avec `clenzy/.../studio/builder/blockRegistry.tsx` :
 *  - blocs : hero, propertyGrid, amenities, richText, testimonial, cta, footer,
 *            faq, gallery, stats, video, map, pricing, logos, columns
 *  - 2.4 : `sectionStyle` (align / bgColor / bgImage) + lien CTA personnalisable
 *  - 2.5 : visibilité responsive par bloc (classes `bkly-vis--hide-*` + container queries)
 *  - 2.7 : conteneur `columns` (enfants dans `children` : un tableau de blocs par colonne)
 *
 * NOTE : `propertyGrid` rend l'en-tête + des cartes squelette (les VRAIES propriétés = enrichissement).
 */

type Props = Record<string, string | number | boolean>;
interface Block { type: string; props: Props; children?: Block[][] }

const s = (v: unknown) => String(v ?? '');
function lines(v: unknown): string[] {
  return s(v).split('\n').map((l) => l.trim()).filter(Boolean);
}
/** Découpe des lignes « a | b » en paires (FAQ, Stats, Table de prix). */
function pairs(v: unknown): { a: string; b: string }[] {
  return lines(v).map((l) => {
    const i = l.indexOf('|');
    return i >= 0 ? { a: l.slice(0, i).trim(), b: l.slice(i + 1).trim() } : { a: l.trim(), b: '' };
  });
}
/** URL YouTube/Vimeo → URL d'embed ; sinon l'URL telle quelle. */
function toEmbedUrl(raw: string): string {
  const yt = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return raw;
}
/** Style de section (2.4) : alignement + fond couleur/image. */
function sectionStyle(p: Props): CSSProperties {
  const style: CSSProperties = {};
  if (p.align) style.textAlign = s(p.align) as CSSProperties['textAlign'];
  if (p.bgImage) {
    style.backgroundImage = `url("${s(p.bgImage)}")`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  } else if (p.bgColor) {
    style.background = s(p.bgColor);
  }
  return style;
}
/** Classes du bloc : base `bkly-section bkly-X` + visibilité responsive (2.5). */
function cls(base: string, p: Props): string {
  const out = ['bkly-section', base];
  if (p.hideMobile) out.push('bkly-vis--hide-mobile');
  if (p.hideTablet) out.push('bkly-vis--hide-tablet');
  if (p.hideDesktop) out.push('bkly-vis--hide-desktop');
  return out.join(' ');
}

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const QuoteIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="bkly-testimonial__icon">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .25-1 1v1c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
  </svg>
);

function renderBlock(b: Block, i: number, properties: ApiPropertySummary[]): ReactNode {
  const p = b.props ?? {};
  const style = sectionStyle(p);
  switch (b.type) {
    case 'hero':
      return (
        <div key={i} className={cls('bkly-hero', p)} style={style}>
          {p.eyebrow ? <div className="bkly-hero__eyebrow">{s(p.eyebrow)}</div> : null}
          <div className="bkly-hero__title">{s(p.title)}</div>
          {p.subtitle ? <div className="bkly-hero__subtitle">{s(p.subtitle)}</div> : null}
          {p.showSearch ? (
            <a href="#reserver" className="bkly-hero__search">
              <span className="bkly-hero__search-icon"><SearchIcon /></span>
              <span className="bkly-hero__search-text">Quand souhaitez-vous partir ?</span>
              <span className="bkly-hero__search-btn">Rechercher</span>
            </a>
          ) : null}
        </div>
      );
    case 'propertyGrid': {
      const cols = Math.min(4, Math.max(1, Number(p.columns) || 3));
      // Vraies propriétés (cartes cliquables → /logement/{id}) ; repli squelette si liste vide.
      return (
        <div key={i} className={cls('bkly-property-grid', p)} style={style}>
          <div className="bkly-property-grid__heading">{s(p.heading)}</div>
          {p.subheading ? <div className="bkly-property-grid__subheading">{s(p.subheading)}</div> : null}
          <div className="bkly-property-grid__list" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {properties.length > 0
              ? properties.slice(0, 12).map((prop) => {
                  const photo = absoluteMedia(prop.mainPhotoUrl);
                  const loc = [prop.city, prop.country].filter(Boolean).join(', ');
                  return (
                    <Link key={prop.id} href={`/logement/${prop.id}`} className="bkly-property-card">
                      {photo
                        ? <img className="bkly-property-card__image" src={photo} alt={prop.name} loading="lazy" />
                        : <div className="bkly-property-card__image" />}
                      <div className="bkly-property-card__body">
                        <div className="bkly-property-card__name">{prop.name}</div>
                        {loc ? <div className="bkly-property-card__loc">{loc}</div> : null}
                        {prop.priceFrom != null ? (
                          <div className="bkly-property-card__price">{prop.priceFrom} {prop.currency} <span className="bkly-property-card__price-unit">/ nuit</span></div>
                        ) : null}
                      </div>
                    </Link>
                  );
                })
              : Array.from({ length: cols }).map((_, k) => (
                  <div key={k} className="bkly-property-card">
                    <div className="bkly-property-card__image" />
                    <div className="bkly-property-card__body">
                      <div className="bkly-property-card__line" />
                      <div className="bkly-property-card__line bkly-property-card__line--sub" />
                      <div className="bkly-property-card__price">120 € <span className="bkly-property-card__price-unit">/ nuit</span></div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      );
    }
    case 'amenities':
      return (
        <div key={i} className={cls('bkly-amenities', p)} style={style}>
          <div className="bkly-amenities__heading">{s(p.heading)}</div>
          <div className="bkly-amenities__list">
            {lines(p.items).map((item, k) => (
              <div key={k} className="bkly-amenities__item">
                <span className="bkly-amenities__icon"><CheckIcon /></span>
                {item}
              </div>
            ))}
          </div>
        </div>
      );
    case 'richText':
      return (
        <div key={i} className={cls('bkly-rich-text', p)} style={style}>
          <div className="bkly-rich-text__content">{s(p.content)}</div>
        </div>
      );
    case 'testimonial':
      return (
        <div key={i} className={cls('bkly-testimonial', p)} style={style}>
          <QuoteIcon />
          <div className="bkly-testimonial__quote">« {s(p.quote)} »</div>
          {p.author ? <div className="bkly-testimonial__author">{s(p.author)}</div> : null}
        </div>
      );
    case 'cta':
      return (
        <div key={i} className={cls('bkly-cta', p)} style={style}>
          <div className="bkly-cta__title">{s(p.title)}</div>
          <a href={p.buttonUrl ? s(p.buttonUrl) : '#reserver'} className="bkly-cta__button">{s(p.buttonLabel)}</a>
        </div>
      );
    case 'footer':
      return <div key={i} className={cls('bkly-footer', p)} style={style}>{s(p.text)}</div>;
    case 'faq':
      return (
        <div key={i} className={cls('bkly-faq', p)} style={style}>
          {p.heading ? <div className="bkly-faq__heading">{s(p.heading)}</div> : null}
          <div className="bkly-faq__list">
            {pairs(p.items).map((qa, k) => (
              <div key={k} className="bkly-faq__item">
                <div className="bkly-faq__q">{qa.a}</div>
                {qa.b ? <div className="bkly-faq__a">{qa.b}</div> : null}
              </div>
            ))}
          </div>
        </div>
      );
    case 'gallery': {
      const cols = Math.min(4, Math.max(1, Number(p.columns) || 3));
      const imgs = lines(p.images);
      const cells = imgs.length ? imgs : ['', '', ''];
      return (
        <div key={i} className={cls('bkly-gallery', p)} style={style}>
          {p.heading ? <div className="bkly-gallery__heading">{s(p.heading)}</div> : null}
          <div className="bkly-gallery__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {cells.map((src, k) => (
              src
                ? <img key={k} className="bkly-gallery__img" src={src} alt="" loading="lazy" />
                : <div key={k} className="bkly-gallery__img bkly-gallery__img--empty" />
            ))}
          </div>
        </div>
      );
    }
    case 'stats':
      return (
        <div key={i} className={cls('bkly-stats', p)} style={style}>
          <div className="bkly-stats__row">
            {pairs(p.items).map((st, k) => (
              <div key={k} className="bkly-stats__item">
                <div className="bkly-stats__value">{st.a}</div>
                {st.b ? <div className="bkly-stats__label">{st.b}</div> : null}
              </div>
            ))}
          </div>
        </div>
      );
    case 'video': {
      const url = s(p.url).trim();
      return (
        <div key={i} className={cls('bkly-video', p)} style={style}>
          {p.heading ? <div className="bkly-video__heading">{s(p.heading)}</div> : null}
          <div className="bkly-video__frame">
            {url ? (
              <iframe className="bkly-video__iframe" src={toEmbedUrl(url)} title={s(p.heading) || 'Vidéo'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <div className="bkly-video__placeholder">Vidéo non configurée</div>
            )}
          </div>
        </div>
      );
    }
    case 'map': {
      const addr = s(p.address).trim();
      return (
        <div key={i} className={cls('bkly-map', p)} style={style}>
          {p.heading ? <div className="bkly-map__heading">{s(p.heading)}</div> : null}
          <div className="bkly-map__frame">
            {addr ? (
              <iframe className="bkly-map__iframe" title="Carte" loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`} />
            ) : (
              <div className="bkly-map__placeholder">Adresse non configurée</div>
            )}
          </div>
        </div>
      );
    }
    case 'pricing':
      return (
        <div key={i} className={cls('bkly-pricing', p)} style={style}>
          {p.heading ? <div className="bkly-pricing__heading">{s(p.heading)}</div> : null}
          <div className="bkly-pricing__list">
            {pairs(p.items).map((row, k) => (
              <div key={k} className="bkly-pricing__row">
                <span className="bkly-pricing__label">{row.a}</span>
                <span className="bkly-pricing__price">{row.b}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'logos': {
      const imgs = lines(p.images);
      const cells = imgs.length ? imgs : ['', '', '', ''];
      return (
        <div key={i} className={cls('bkly-logos', p)} style={style}>
          {p.heading ? <div className="bkly-logos__heading">{s(p.heading)}</div> : null}
          <div className="bkly-logos__row">
            {cells.map((src, k) => (
              src
                ? <img key={k} className="bkly-logos__img" src={src} alt="" loading="lazy" />
                : <div key={k} className="bkly-logos__img bkly-logos__img--empty" />
            ))}
          </div>
        </div>
      );
    }
    case 'columns': {
      const n = Math.min(4, Math.max(1, Number(p.columnCount) || 2));
      const gapMap: Record<string, string> = { sm: '12px', md: '24px', lg: '40px' };
      const gap = gapMap[s(p.gap)] ?? gapMap.md;
      const cols = b.children ?? [];
      return (
        <div key={i} className={cls('bkly-columns', p)} style={style}>
          <div className="bkly-columns__grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap }}>
            {Array.from({ length: n }).map((_, ci) => (
              <div key={ci} className="bkly-columns__col">
                {(cols[ci] ?? []).map((child, k) => renderBlock(child, k, properties))}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'bookingWidget': {
      // Bloc de réservation posé sur la page : point d'entrée vers le widget interactif (#reserver).
      // (Le funnel complet reste monté dans la section #reserver ; ce bloc y renvoie.)
      const preset = s(p.preset) || 'searchBar';
      const isSearch = preset === 'searchBar' || preset === 'searchFull';
      const label = preset === 'propertyResults' ? 'Voir les logements'
        : preset === 'cart' ? 'Voir le panier'
        : preset === 'guestForm' ? 'Réserver'
        : preset === 'account' ? 'Mon compte'
        : preset === 'priceSummary' ? 'Voir le récapitulatif'
        : 'Rechercher';
      return (
        <div key={i} className={cls('bkly-bookingwidget', p)} style={{ ...style, padding: '40px 24px' }}>
          <div style={{ display: 'flex', justifyContent: p.align === 'left' ? 'flex-start' : p.align === 'right' ? 'flex-end' : 'center' }}>
            {isSearch ? (
              <a href="#reserver" className="bkly-hero__search">
                <span className="bkly-hero__search-icon"><SearchIcon /></span>
                <span className="bkly-hero__search-text">Quand souhaitez-vous partir ?</span>
                <span className="bkly-hero__search-btn">{label}</span>
              </a>
            ) : (
              <a href="#reserver" className="bkly-cta__button">{label}</a>
            )}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

/**
 * Parse + rend une liste de blocs depuis le JSON `pageLayout`/`SitePage.blocks`. `properties` (si
 * fourni) alimente le bloc `propertyGrid` en vraies fiches cliquables (sinon : squelette).
 */
export function BlockRenderer(
  { blocksJson, properties = [] }: { blocksJson: string | null; properties?: ApiPropertySummary[] },
) {
  let blocks: Block[] = [];
  if (blocksJson) {
    try {
      const arr = JSON.parse(blocksJson);
      if (Array.isArray(arr)) blocks = arr as Block[];
    } catch {
      blocks = [];
    }
  }
  return <>{blocks.map((b, i) => renderBlock(b, i, properties))}</>;
}
