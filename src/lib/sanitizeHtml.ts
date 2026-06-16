/**
 * Assainisseur HTML conservateur côté SERVEUR (SSR) — SANS dépendance npm.
 *
 * Jumeau de `clenzy/client/.../studio/builder/import/sanitizeHtml.ts` (même esprit conservateur).
 * Le SSR DOIT assainir AVANT rendu (pas seulement le Studio) : tout HTML d'un bloc `rawHtml` passe
 * par ici côté serveur. Cf. ARCHI-IMPORT-TEMPLATES.md §4.4 (règles sécurité Z7-SEC-01/02).
 *
 * ⚠️ Volontairement minimal et conservateur. Le DURCISSEMENT (jsoup safelist côté Java pour l'import
 * backend, ou un parser DOM serveur) est prévu en repasse ultérieure. En attendant, on retire par
 * regex les vecteurs XSS les plus directs.
 */

/** Balises entièrement supprimées (contenu inclus) : exécution de code ou intégration arbitraire. */
const DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed', 'noscript', 'style', 'link', 'meta', 'base'];

function stripDangerousTags(html: string): string {
  let out = html;
  for (const tag of DANGEROUS_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, 'gi'), '');
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '');
  }
  return out;
}

/** Retire les attributs gestionnaires d'événements `on*=…`. */
function stripEventHandlers(html: string): string {
  return html.replace(/\son[a-z0-9_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/** Neutralise `javascript:` / `vbscript:` / `data:` (sauf `data:image/*`) dans les attributs. */
function stripDangerousUrls(html: string): string {
  return html.replace(/\b([a-z0-9_-]+)\s*=\s*("([^"]*)"|'([^']*)')/gi, (match, attr, _q, dq, sq) => {
    const value = (dq ?? sq ?? '').trim();
    const lower = value.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return `${attr}="#"`;
    if (lower.startsWith('data:') && !lower.startsWith('data:image/')) return `${attr}="#"`;
    return match;
  });
}

/**
 * Assainit un fragment HTML (serveur). Conservateur : retire scripts/iframes/objets, attributs
 * `on*=`, et schémas `javascript:`/`vbscript:`/`data:` (hors `data:image`). Aucune dépendance npm.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let out = String(html);
  out = stripDangerousTags(out);
  out = stripEventHandlers(out);
  out = stripDangerousUrls(out);
  return out;
}
