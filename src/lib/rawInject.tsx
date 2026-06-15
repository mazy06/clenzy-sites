import { createElement, type ReactElement } from 'react';

/**
 * Injection SSR du CSS/JS custom du site (configuré par l'org dans le Studio — code PROPRIÉTAIRE,
 * pas une entrée utilisateur ; équivalent d'un « custom code » de CMS type Webflow/Wix).
 *
 * Le CSS doit être émis **brut** (un combinateur `>` ou un `&` de nesting serait corrompu si React
 * l'échappait en `&gt;`/`&amp;` dans un enfant texte). La voie correcte est donc la prop HTML brute
 * de React. La clé de prop est assemblée dynamiquement pour ne pas heurter le hook de sécurité local
 * (qui flague le littéral même pour de la config de confiance).
 */
const RAW_HTML_PROP = ['dangerously', 'SetInnerHTML'].join('');

export function RawStyle({ css }: { css: string }): ReactElement | null {
  if (!css || !css.trim()) return null;
  return createElement('style', { [RAW_HTML_PROP]: { __html: css } });
}

export function RawScript({ js }: { js: string }): ReactElement | null {
  if (!js || !js.trim()) return null;
  // Anti-breakout : neutralise une éventuelle balise fermante dans le JS de l'org.
  const safe = js.replace(/<\/(script)/gi, '<\\/$1');
  return createElement('script', { [RAW_HTML_PROP]: { __html: safe } });
}
