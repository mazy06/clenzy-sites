import type { CSSProperties } from 'react';
import { parseTokens, type SitePublic } from './api';

/**
 * Construit les variables CSS de thème d'un site à partir de ses design tokens (miroir de
 * `themeStyle` côté Studio/page publique). Appliquées sur le wrapper racine → les classes
 * `bkly-*` (globals.css) s'y réfèrent.
 */
export function buildThemeVars(site: SitePublic): CSSProperties {
  const t = parseTokens(site.designTokens) ?? {};
  const accent = t.primaryColor || site.primaryColor || '#6B8A9A';
  const body = t.bodyFontFamily || site.fontFamily || undefined;

  const vars: Record<string, string> = {
    '--accent': accent,
    '--accent-deep': `color-mix(in srgb, ${accent} 84%, #000)`,
    '--accent-soft': `color-mix(in srgb, ${accent} 12%, transparent)`,
    '--on-accent': '#ffffff',
  };
  if (body) vars['--font-display'] = t.headingFontFamily || body;
  if (t.backgroundColor) vars['--bg'] = t.backgroundColor;
  if (t.surfaceColor) vars['--card'] = t.surfaceColor;
  if (t.textColor) vars['--ink'] = t.textColor;
  if (t.textSecondaryColor) vars['--muted'] = t.textSecondaryColor;
  if (t.borderColor) vars['--line'] = t.borderColor;
  if (t.cardBorderRadius || t.borderRadius) vars['--radius-lg'] = (t.cardBorderRadius || t.borderRadius)!;
  if (t.borderRadius) vars['--radius-md'] = t.borderRadius;

  const style = { ...vars } as CSSProperties;
  if (body) style.fontFamily = body;
  if (t.baseFontSize) style.fontSize = t.baseFontSize;
  return style;
}
