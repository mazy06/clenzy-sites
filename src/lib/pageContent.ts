/**
 * Détection du format du contenu d'une page (`SitePage.blocks` / `publishedBlocks`).
 *
 * Le champ `blocks` est une STRING opaque servie telle quelle par le backend
 * (`SitePagePublicDto`, pass-through). Deux formats coexistent :
 *
 *  - NOUVEAU (Studio GrapesJS) : un OBJET enveloppé `{ format:'grapesjs', html, css, projectData }`.
 *    Le SSR rend `html` (assaini) + `css` (injecté en <style>), SANS embarquer GrapesJS.
 *  - LEGACY (builder de blocs) : un TABLEAU `[{ type, props, children?, data? }]` rendu par BlockRenderer.
 *
 * Discrimination sans ambiguïté : `Array.isArray` distingue le tableau legacy de l'objet enveloppé,
 * et `format === 'grapesjs'` identifie l'enveloppe GrapesJS. Tout le reste (parse KO, objet non
 * reconnu) retombe sur `null` → rien à rendre (parité avec le `catch` actuel de BlockRenderer).
 */

/** Page au format GrapesJS : HTML + CSS déjà extraits (rendu trivial côté SSR). */
export interface GrapesPageContent {
  kind: 'grapes';
  html: string;
  css: string;
}

/** Page au format legacy (liste de blocs) : on transmet le JSON brut à BlockRenderer. */
export interface BlocksPageContent {
  kind: 'blocks';
  blocksJson: string;
}

export type PageContent = GrapesPageContent | BlocksPageContent | null;

/**
 * Classe le contenu d'une page selon son format.
 *  - `{ format:'grapesjs', html, css }` → { kind:'grapes', html, css }
 *  - `[ ... ]` (tableau) → { kind:'blocks', blocksJson } (BlockRenderer s'occupe du parse)
 *  - parse KO / objet non reconnu / vide → null (rien à rendre)
 */
export function detectPageContent(blocksJson: string | null): PageContent {
  if (!blocksJson) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(blocksJson);
  } catch {
    return null;
  }
  if (Array.isArray(parsed)) {
    // Format legacy : on laisse BlockRenderer re-parser le JSON brut (logique inchangée).
    return { kind: 'blocks', blocksJson };
  }
  if (
    parsed
    && typeof parsed === 'object'
    && (parsed as { format?: unknown }).format === 'grapesjs'
  ) {
    const p = parsed as { html?: unknown; css?: unknown };
    return {
      kind: 'grapes',
      html: typeof p.html === 'string' ? p.html : '',
      css: typeof p.css === 'string' ? p.css : '',
    };
  }
  return null;
}
