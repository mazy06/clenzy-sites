/**
 * Coordonnées d'une adresse, pour la carte Baitly du bloc « map ».
 *
 * <p>Géocodage OpenStreetMap (Nominatim) côté SERVEUR, mis en cache 30 jours par
 * Next : une adresse n'est demandée qu'une fois, quel que soit le trafic du site
 * — ce qu'exige la politique d'usage de Nominatim (pas d'appel par visiteur).</p>
 */
export interface LatLng {
  lat: number;
  lng: number;
}

const NOMINATIM = process.env.BAITLY_GEOCODER_URL ?? 'https://nominatim.openstreetmap.org/search';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const query = address.trim();
  if (!query) return null;
  const url = `${NOMINATIM}?${new URLSearchParams({ q: query, format: 'json', limit: '1' })}`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BaitlySites/1.0 (+https://baitly.fr)', Accept: 'application/json' },
      next: { revalidate: THIRTY_DAYS },
    });
    if (!response.ok) return null;
    const [first] = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    // Géocodeur injoignable : le bloc affiche l'adresse seule, la page n'échoue pas.
    return null;
  }
}
