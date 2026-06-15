import type { ReactNode } from 'react';

/**
 * Rendu markdown → éléments React (1.3) pour le corps des articles de blog. Sans dépendance et sans
 * injection de HTML brut : on ne produit que des éléments React, dont React échappe le texte → aucune
 * injection HTML possible. Couvre le sous-ensemble produit par l'éditeur / l'IA : titres, paragraphes,
 * listes, citations, blocs de code, gras/italique/code inline, liens (href assaini : http(s) ou relatif).
 */

const SAFE_HREF = /^(https?:\/\/|\/|mailto:|#)/i;

export function renderMarkdown(markdown: string | null | undefined): ReactNode {
  if (!markdown || !markdown.trim()) return null;
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Ligne vide → séparateur de blocs.
    if (!line.trim()) {
      i++;
      continue;
    }

    // Bloc de code ``` … ```
    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++; // ferme le fence
      blocks.push(<pre key={key++} className="bkly-md__pre"><code>{buf.join('\n')}</code></pre>);
      continue;
    }

    // Titre #..###### → décalé d'un cran (le H1 est le titre de l'article).
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      blocks.push(<Tag key={key++}>{renderInline(heading[2])}</Tag>);
      i++;
      continue;
    }

    // Citation > …
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(<blockquote key={key++}>{renderInline(buf.join(' '))}</blockquote>);
      continue;
    }

    // Liste non ordonnée - / * ou ordonnée 1.
    const ordered = /^\d+\.\s+/.test(line);
    if (ordered || /^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      const marker = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      while (i < lines.length && marker.test(lines[i])) {
        items.push(<li key={items.length}>{renderInline(lines[i].replace(marker, ''))}</li>);
        i++;
      }
      blocks.push(ordered ? <ol key={key++}>{items}</ol> : <ul key={key++}>{items}</ul>);
      continue;
    }

    // Paragraphe : regroupe les lignes consécutives non vides.
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{renderInline(buf.join(' '))}</p>);
  }

  return blocks;
}

function isBlockStart(line: string): boolean {
  return /^(#{1,6}\s|>\s?|[-*]\s|\d+\.\s|```)/.test(line);
}

/** Inline : **gras**, *italique* / _italique_, `code`, [texte](url). */
function renderInline(text: string): ReactNode {
  const tokens: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(regex)) {
    const at = m.index ?? 0;
    if (at > last) tokens.push(text.slice(last, at));
    if (m[2] !== undefined || m[3] !== undefined) {
      tokens.push(<strong key={key++}>{m[2] ?? m[3]}</strong>);
    } else if (m[4] !== undefined || m[5] !== undefined) {
      tokens.push(<em key={key++}>{m[4] ?? m[5]}</em>);
    } else if (m[6] !== undefined) {
      tokens.push(<code key={key++}>{m[6]}</code>);
    } else if (m[7] !== undefined && m[8] !== undefined) {
      const href = m[8].trim();
      tokens.push(
        SAFE_HREF.test(href)
          ? <a key={key++} href={href} rel="noopener noreferrer">{m[7]}</a>
          : m[7],
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}
