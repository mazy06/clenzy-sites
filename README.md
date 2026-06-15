# Clenzy Sites — service SSR/ISR des sites hébergés

Service **Next.js 14 (App Router)** qui rend côté serveur les sites hébergés des organisations
(`{slug}.clenzy.site` + domaines custom), à partir du **contrat REST** du backend Clenzy. C'est le
volet P1.1 (c) du handoff `analyse-concurrentielle/HANDOFF-SSR-CLENZY-SITES.md` (repo `clenzy`).

## Architecture
```
Cloudflare for SaaS (TLS, custom hostnames) → fallback origin (nginx clenzy-infra) → ce service
ce service ──(server-side fetch)──► clenzy (Spring) /api/public/sites/*
```
- Résolution par hôte : `layout.tsx` + chaque page appellent `GET /api/public/sites/resolve?hostname=`.
- Pages composées : `GET /api/public/sites/{id}/page?path=&locale=` → blocs `bkly-*` (miroir du Studio).
- Blog : `/blog` + `/blog/[slug]` (`/posts`, `/posts/by-slug`). SEO : `sitemap.xml`, `robots.txt`, `rss.xml`.

## Développement local
```bash
npm install
cp .env.example .env.local         # CLENZY_API_BASE_URL=http://localhost:8084 (backend dev)
npm run dev                        # http://localhost:3000
```
Pour tester un site : créer un `Site` PUBLISHED + une `SitePage(HOME, PUBLISHED)` via `/api/sites`
(admin authentifié), puis visiter `http://{slug}.clenzy.site.localhost:3000` (ou forcer l'Host).

## Variables d'environnement
| Var | Rôle |
|---|---|
| `CLENZY_API_BASE_URL` | URL interne du backend (server-side only). |
| `CLENZY_SITES_BASE_DOMAIN` | Suffixe sous-domaines (`clenzy.site`). |
| `NEXT_PUBLIC_WIDGET_BASE_URL` | Base API publique pour le widget de réservation client. |

## À finaliser (intégrations)
1. **Widget de réservation** (`src/components/ReservationWidget.tsx`) : exposer la **clé publique**
   du booking engine du site dans le DTO `resolve` (`bookingEngineApiKey`) puis charger le SDK
   embarquable + `mount`.
2. **JSON-LD** (`LodgingBusiness`/`Offer`/`Article`/`AggregateRating`) : injection `<script>` revue
   (contenu JSON contrôlé + échappement `<`). Le SEO de base (title/meta/OG/canonical) est en place.
3. **Propriétés réelles** dans `propertyGrid` (aujourd'hui squelette) : fetch
   `/api/public/booking/{slug}/properties` + ajout des URLs propriétés au sitemap.
4. **hreflang** par locale (à partir de `site.locales`).

## Déploiement
- Image : `ghcr.io/mazy06/clenzy-sites:latest` (Dockerfile `output: standalone`).
- Orchestration : service `clenzy-sites` dans `clenzy-infra/docker-compose.prod.yml` + vhost nginx.
- TLS + domaines : **Cloudflare for SaaS** (wildcard `*.clenzy.site` + Custom Hostnames). Voir le
  handoff (repo `clenzy`) §4–§6.
