'use client';

import { useEffect } from 'react';

/**
 * Bootstrap du SDK de réservation pour les pages GrapesJS.
 *
 * Une page GrapesJS contient ses propres marqueurs `data-clenzy-widget="<step>"` dans le HTML SSR.
 * Ce composant charge le bundle standalone `clenzy-booking.min.js` (exposant `window.BaitlyBooking`)
 * UNE fois, puis appelle `BaitlyBooking.hydrate(...)` — idempotent : le SDK scanne le DOM SSR et
 * monte un widget sur chaque marqueur. À distinguer de `ReservationWidget` qui, lui, appelle `init`
 * (montage MONOLITHE mono-conteneur sur la section #reserver).
 *
 * Monté uniquement pour une page GrapesJS et si le site a une clé booking engine.
 */

// `window.BaitlyBooking` est déclaré globalement par ReservationWidget.tsx (avec `init` + `hydrate`).
interface BaitlyHandle { destroy?: () => void }

const WIDGET_BASE = process.env.NEXT_PUBLIC_WIDGET_BASE_URL ?? 'https://app.clenzy.fr';
const SCRIPT_SRC = `${WIDGET_BASE}/booking/v1/clenzy-booking.min.js`;

// Chargement idempotent du script (identique à ReservationWidget : un seul <script> par src).
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Échec du chargement du widget'));
    document.head.appendChild(el);
  });
}

export default function BookingSDKBootstrap({
  apiKey,
  primaryColor,
  currency,
  language,
  componentConfig,
  leadCapture,
}: {
  apiKey: string;
  primaryColor?: string | null;
  currency?: string;
  language?: string;
  /** Composition de micro-widgets (JSON) — transmise au SDK si présente. */
  componentConfig?: string | null;
  /** Popup exit-intent (opt-in) — affiché par le SDK uniquement si true. */
  leadCapture?: boolean;
}) {
  useEffect(() => {
    let cancelled = false;
    let handle: BaitlyHandle | undefined;
    loadScript(SCRIPT_SRC)
      .then(() => {
        if (cancelled || !window.BaitlyBooking?.hydrate) return;
        // hydrate scanne les marqueurs `data-clenzy-widget` du DOM SSR (idempotent).
        handle = window.BaitlyBooking.hydrate({
          apiKey,
          baseUrl: WIDGET_BASE,
          theme: primaryColor ? { primaryColor } : undefined,
          currency: currency || 'EUR',
          language: (['fr', 'en', 'ar'].includes(language ?? '') ? language : 'fr'),
          ...(componentConfig ? { componentConfig } : {}),
          ...(leadCapture ? { leadCapture: true } : {}),
        });
      })
      .catch(() => {
        /* widget indisponible : les marqueurs restent vides (best-effort) */
      });
    return () => {
      cancelled = true;
      handle?.destroy?.();
    };
  }, [apiKey, primaryColor, currency, language, componentConfig, leadCapture]);

  return null;
}
