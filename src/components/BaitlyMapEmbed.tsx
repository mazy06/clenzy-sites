'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Carte Baitly des sites générés : remplace l'iframe Google Maps du bloc « map ».
 *
 * <p>Tout est servi en MÊME ORIGINE sous `/maps/` (rewrite Next vers le stockage
 * des cartes Baitly) : archive PMTiles, glyphes, sprites, plugin RTL et le style
 * « Papier » lui-même — publié par le PMS, la palette n'est donc pas dupliquée ici.</p>
 */
interface BaitlyMapEmbedProps {
  lat: number;
  lng: number;
  label: string;
  language?: string;
}

let runtimeReady = false;
function ensureRuntime() {
  if (runtimeReady) return;
  runtimeReady = true;
  maplibregl.addProtocol('pmtiles', new Protocol().tile);
  if (maplibregl.getRTLTextPluginStatus() === 'unavailable') {
    void maplibregl.setRTLTextPlugin(`${window.location.origin}/maps/assets/rtl/mapbox-gl-rtl-text.js`, true).catch(() => {
      /* sans plugin, seuls les libellés arabes seraient mal formés */
    });
  }
}

/** Remplace les jetons du style publié par les URL absolues de ce site (le worker MapLibre l'exige). */
async function loadStyle(language: string): Promise<StyleSpecification> {
  const origin = window.location.origin;
  const response = await fetch(`/maps/assets/styles/baitly-paper-${language}.json`);
  if (!response.ok) throw new Error(`Style indisponible (${response.status})`);
  const raw = await response.text();
  return JSON.parse(
    raw
      .replaceAll('__BAITLY_TILES__', `${origin}/maps/baitly.pmtiles`)
      .replaceAll('__BAITLY_TERRAIN__', `${origin}/maps/terrain.pmtiles`)
      .replaceAll('__BAITLY_ASSETS__', `${origin}/maps/assets`),
  ) as StyleSpecification;
}

/** La carte n'intercepte pas le défilement de la page : message d'aide dans la langue du site. */
const GESTURE_HELP: Record<string, Record<string, string>> = {
  fr: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + molette pour zoomer la carte',
    'CooperativeGesturesHandler.MacHelpText': '⌘ + molette pour zoomer la carte',
    'CooperativeGesturesHandler.MobileHelpText': 'Utilisez deux doigts pour déplacer la carte',
  },
  en: {
    'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + scroll to zoom the map',
    'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + scroll to zoom the map',
    'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map',
  },
  ar: {
    'CooperativeGesturesHandler.WindowsHelpText': 'استخدم Ctrl مع عجلة الفأرة لتكبير الخريطة',
    'CooperativeGesturesHandler.MacHelpText': 'استخدم ⌘ مع عجلة الفأرة لتكبير الخريطة',
    'CooperativeGesturesHandler.MobileHelpText': 'استخدم إصبعين لتحريك الخريطة',
  },
};

function pinElement(label: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'bkly-map__pin';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', label);
  const icon = document.createElement('span');
  icon.className = 'bkly-map__pin-icon';
  element.append(icon);
  return element;
}

export default function BaitlyMapEmbed({ lat, lng, label, language = 'fr' }: BaitlyMapEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let map: maplibregl.Map | null = null;
    let cancelled = false;
    ensureRuntime();
    const lang = ['fr', 'en', 'ar'].includes(language) ? language : 'fr';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    void loadStyle(lang).then((style) => {
      if (cancelled) return;
      map = new maplibregl.Map({
        container,
        style,
        center: [lng, lat],
        zoom: 15,
        pitch: 45,
        bearing: -15,
        attributionControl: false,
        cooperativeGestures: true,
        locale: GESTURE_HELP[lang],
        fadeDuration: reduceMotion ? 0 : 300,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.on('style.load', () => {
        if (map?.getSource('baitly-terrain')) map.setTerrain({ source: 'baitly-terrain', exaggeration: 1.15 });
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      new maplibregl.Marker({ element: pinElement(label), anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, label, language]);

  return <div ref={containerRef} className="bkly-map__canvas" />;
}
