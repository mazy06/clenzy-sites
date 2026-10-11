'use client';

import dynamic from 'next/dynamic';

/**
 * MapLibre (~800 Ko) n'est chargé que sur les pages qui ont un bloc carte, et
 * seulement côté navigateur (la carte n'a rien à rendre côté serveur).
 */
const BaitlyMapLazy = dynamic(() => import('./BaitlyMapEmbed'), {
  ssr: false,
  loading: () => <div className="bkly-map__canvas" aria-busy="true" />,
});

export default BaitlyMapLazy;
