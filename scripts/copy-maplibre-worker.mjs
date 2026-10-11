// Carte Baitly · publie le worker de MapLibre 6 en fichier statique (public/maplibre/).
//
// MapLibre 6 est livré en ESM uniquement et son worker est un module autonome :
// le webpack de Next 14 ne sait pas l'empaqueter (« import/export outside of module
// code »). On le sert donc tel quel, en même origine, et la carte pointe dessus via
// setWorkerUrl. Lancé avant `next dev` et `next build` (scripts pre*).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('maplibre-gl/package.json'));
const target = join(process.cwd(), 'public', 'maplibre');
mkdirSync(target, { recursive: true });
copyFileSync(join(dist, 'dist', 'maplibre-gl-worker.mjs'), join(target, 'maplibre-gl-worker.mjs'));
