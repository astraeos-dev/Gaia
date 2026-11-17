/**
 * LES ÉPHÉMÉRIDES D'HORIZONS
 * --------------------------
 * Les positions géocentriques et la magnitude des astéroïdes qui pourraient dépasser la magnitude 16 dans les 60
 * prochains jours, de deux jours avant leur passage à deux jours après (data/neo-ephemerides.json, préparé par
 * scripts/fetch-neo.mjs).
 */
import DATA from '../data/neo-ephemerides.json'
import { approachKey } from './neo'

export const STEP_MINUTES = DATA.step

/**
 * Les éphémérides d'un passage, comme neo/neo.js les lit (parseEphemeris) : { rows } ; { error } quand Horizons les
 * a refusées ; null quand elles n'ont pas été demandées.
 */
export function ephemerisOf(approach) {
  const key = approachKey(approach)
  const found = DATA.ephemerides[key]
  if (found) {
    const start = new Date(found.start).getTime()
    return {
      rows: found.rows.map(([minutes, ra, dec, mag, distanceAu]) => ({
        date: new Date(start + minutes * 60_000),
        ra: ra / 15,
        dec,
        mag,
        distanceAu,
      })),
    }
  }
  return DATA.errors?.[key] ? { error: DATA.errors[key] } : null
}
