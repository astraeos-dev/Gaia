/**
 * LES PRÉDICTIONS DU SITE, MOIS PAR MOIS
 * --------------------------------------
 * Les évènements de data/occultations/<AAAA-MM>.json (préparés par scripts/fetch-occultations.mjs, chaque jour). Un
 * mois pèse une centaine de kilo-octets : chaque page ne charge que les mois qu'elle montre, à la demande.
 */
import { useEffect, useState } from 'react'
import * as Astronomy from 'astronomy-engine'

const FILES = import.meta.glob('../data/occultations/*.json', { import: 'default' })
const PATHS = Object.fromEntries(Object.keys(FILES).map((path) => [/(\d{4}-\d{2})\.json$/.exec(path)[1], path]))

/** Les mois qui ont des prédictions (« 2026-11 »…). */
export const MONTHS = Object.keys(PATHS).sort()

/** Un évènement d'un fichier, tel que occultations.js le lit (parseOccelmnt). */
function eventOf(fields, row) {
  const v = Object.fromEntries(fields.map((field, i) => [field, row[i]]))
  return {
    number: v.number,
    name: v.name,
    middle: new Date(v.middle),
    elements: [v.X, v.Y, v.dX, v.dY, v.d2X, v.d2Y, v.d3X, v.d3Y],
    substar: [v.substarLon, v.substarLat],
    subsolar: [v.subsolarLon, v.subsolarLat],
    star: v.star,
    starMag: v.starMag,
    ra: v.ra,
    dec: v.dec,
    ra2000: v.ra2000,
    dec2000: v.dec2000,
    mag: v.mag,
    diameterKm: v.diameterKm,
    maxDuration: v.maxDuration,
    orbit: v.orbit,
  }
}

const loaded = new Map()

/** Les évènements d'un mois (« 2026-11 ») : { updated, events } ; aucun pour un mois sans fichier. */
export function loadMonth(key) {
  if (!loaded.has(key)) {
    const load = FILES[PATHS[key]]
    loaded.set(key, load ? load().then((data) => ({ updated: data.updated, events: data.events.map((row) => eventOf(data.fields, row)) })) : Promise.resolve({ updated: null, events: [] }))
  }
  return loaded.get(key)
}

/** Les mois (UT) qui couvrent `start` à `end`, un jour de plus de chaque côté (comme near()). */
export function monthsBetween(start, end) {
  const keys = []
  const last = new Date(end.getTime() + 86_400_000)
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() - 1)); d <= last; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    keys.push(d.toISOString().slice(0, 7))
  }
  return [...new Set(keys)]
}

/** Les évènements de `start` à `end` : { events, updated } ; null pendant le chargement. */
export function useOccultationEvents(start, end) {
  const keys = monthsBetween(start, end).join(',')
  const [state, setState] = useState({ keys: null, value: null })
  useEffect(() => {
    let cancelled = false
    Promise.all(keys.split(',').map(loadMonth)).then((parts) => {
      if (cancelled) return
      const updated = parts.map((p) => p.updated).filter(Boolean).sort().at(-1) ?? null
      setState({ keys, value: { events: parts.flatMap((p) => p.events), updated } })
    })
    return () => {
      cancelled = true
    }
  }, [keys])
  return state.keys === keys ? state.value : null
}

/**
 * La Lune à chaque passage de `found` (la liste de near()) : moonFraction (sa part éclairée, 0 à 1) et moonSeparation
 * (son écart à l'étoile, degrés). L'éclat de la Lune noie les étoiles faibles.
 */
export function moonlight(found) {
  return found.map((seen) => {
    const moon = Astronomy.EquatorFromVector(Astronomy.GeoVector(Astronomy.Body.Moon, seen.date, true))
    const DEG = Math.PI / 180
    const [ra1, dec1, ra2, dec2] = [moon.ra * 15 * DEG, moon.dec * DEG, seen.event.ra2000 * 15 * DEG, seen.event.dec2000 * DEG]
    const cosine = Math.sin(dec1) * Math.sin(dec2) + Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2)
    return {
      ...seen,
      moonFraction: Astronomy.Illumination(Astronomy.Body.Moon, seen.date).phase_fraction,
      moonSeparation: Math.acos(Math.max(-1, Math.min(1, cosine))) / DEG,
    }
  })
}

/** « (593) Titania », « 2026 AB » (non numéroté). */
export const asteroidLabel = (event) => (event.number ? `(${event.number}) ${event.name}` : event.name)
