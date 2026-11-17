/**
 * LES PASSAGES DU SITE
 * --------------------
 * Les passages de data/neo.json (préparés par scripts/fetch-neo.mjs, chaque jour), relus pour neo/neo.js. Ce soir et
 * le calendrier n'en lisent que les remarquables ; les éphémérides d'Horizons, plus lourdes, sont dans
 * neo/ephemerides.js, que seule la page des géocroiseurs charge.
 */
import DATA from '../data/neo.json'
import { notable } from './neo'

export const UPDATED = new Date(DATA.updated)
export const SOURCE = DATA.source

/** Les passages, par date : ceux de neo/neo.js (parseCad). */
export const APPROACHES = DATA.approaches.map((a) => ({
  designation: a.des,
  name: a.name ?? a.des,
  date: new Date(a.date),
  distanceAu: a.dist,
  distanceMinAu: a.min ?? a.dist,
  distanceMaxAu: a.max ?? a.dist,
  speed: a.v ?? null,
  h: a.h ?? null,
  diameterKm: a.d ?? null,
  sigmaMinutes: a.sigma ?? null,
  orbit: a.orbit ?? null,
}))

/** Les passages remarquables (140 m et plus, ou plus près que la Lune) entre `start` et `end`. */
export const notableBetween = (start, end) => APPROACHES.filter((a) => a.date >= start && a.date < end && notable(a))
