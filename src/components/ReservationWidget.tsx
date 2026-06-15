'use client';

import { useEffect, useRef } from 'react';

/**
 * Monte le widget de réservation (BaitlyWidget) sur la page SSR. Charge le bundle standalone
 * `clenzy-booking.min.js` (exposant `window.BaitlyBooking`, buildé par `npm run build:sdk` côté
 * app principale) puis l'initialise avec la clé publique du booking engine du site.
 */

interface BaitlyHandle { destroy?: () => void }
declare global {
  interface Window {
    BaitlyBooking?: { init: (config: Record<string, unknown>) => BaitlyHandle };
  }
}

const WIDGET_BASE = process.env.NEXT_PUBLIC_WIDGET_BASE_URL ?? 'https://app.clenzy.fr';
const SCRIPT_SRC = `${WIDGET_BASE}/booking/v1/clenzy-booking.min.js`;

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

export default function ReservationWidget({
  apiKey,
  primaryColor,
  currency,
  language,
}: {
  apiKey: string;
  primaryColor?: string | null;
  currency?: string;
  language?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let widget: BaitlyHandle | undefined;
    loadScript(SCRIPT_SRC)
      .then(() => {
        if (cancelled || !ref.current || !window.BaitlyBooking) return;
        widget = window.BaitlyBooking.init({
          container: ref.current,
          apiKey,
          baseUrl: WIDGET_BASE,
          theme: primaryColor ? { primaryColor } : undefined,
          currency: currency || 'EUR',
          language: (['fr', 'en', 'ar'].includes(language ?? '') ? language : 'fr'),
        });
      })
      .catch(() => {
        /* widget indisponible : la section reste vide (best-effort) */
      });
    return () => {
      cancelled = true;
      widget?.destroy?.();
    };
  }, [apiKey, primaryColor, currency, language]);

  return <div ref={ref} />;
}
