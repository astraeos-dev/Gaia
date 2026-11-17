/**
 * LES NOVAE ET LES SUPERNOVAE CETTE NUIT
 * -------------------------------------
 * Quand chaque objet est au plus haut dans le noir (le Soleil sous −12°) depuis le lieu, comme tonight() de
 * transients.py dans Céleste. Les échantillons de la nuit viennent de nightSamples (comets/sky.js).
 */
import DATA from '../data/transients.json'
import { bestInDarkness } from '../constellations/night'
import { DARK_SUN, VISIBLE_ALT, merge } from './transients'

export const UPDATED = DATA.updated
export const SOURCES = DATA.sources

// Le fichier omet les champs vides : ils reprennent leur valeur de transients.js
const filled = (o) => ({ host: null, mag: null, magDate: null, stale: false, peak: null, peakDate: null, discovered: null, discoverer: '', aka: [], z: null, ...o })

/** Les objets des deux listes, une nova présente dans les deux une seule fois (transients.js, merge). */
export const OBJECTS = merge(DATA.supernovae.map(filled), DATA.novae.map(filled))

/**
 * Le meilleur moment de la nuit pour un objet : { t, alt, az } ; null s'il ne monte pas à 20° dans le noir. Des
 * échantillons toutes les 5 minutes : un objet qui culmine à l'aube est au plus haut au tout dernier moment noir.
 */
export function bestTonight(object, samples, { minAlt = VISIBLE_ALT } = {}) {
  const best = bestInDarkness(object.ra * 15, object.dec, samples, { sunMax: DARK_SUN })
  return best && best.alt >= minAlt ? best : null
}

/** « Supernova Ia », « Nova ». */
export const kindText = (o) => (o.kind === 'supernova' ? `Supernova ${o.type}` : 'Nova')
