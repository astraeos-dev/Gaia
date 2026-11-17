/**
 * LE CIEL DU MOIS, SUR UNE PAGE À IMPRIMER
 * ---------------------------------------
 * Comme month_sheet.py de Céleste (4.19) : une page A4 pour le lieu, aux couleurs du thème Jour (l'encre sur le
 * papier blanc) :
 *  - la carte du ciel du 15 à 22 h (heure locale), comme les cartes du mois des magazines, avec les heures où le même
 *    ciel se montre le premier et le dernier jour ;
 *  - la Lune jour par jour, dessinée comme elle est éclairée, et ses quatre phases ;
 *  - les planètes au milieu du mois : quand les voir, et leur éclat ;
 *  - les évènements du mois : planètes, Lune, éclipses, saisons, étoiles filantes, minima d'Algol vus du lieu.
 */
import { Astronomy, BODY, bodyConstellation, nightVisibility } from '../lib/astro'
import { findEvents } from '../calendar/events'

export const MAP_DAY = 15
export const MAP_HOUR = 22 // la carte : le 15 à 22 h, heure locale
export const MAP_MAG = 5 // les étoiles les plus faibles de la carte imprimée
export const SIDEREAL_DAY = 0.99726957 // jours : le même ciel revient 3 min 56 s plus tôt chaque jour
export const EVENT_LINES = 19 // lignes de chacune des deux colonnes d'évènements
const DAY_MS = 86_400_000
const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()

/** L'instant de la carte : le 15 du mois à 22 h, heure locale. */
export const mapTime = (year, month) => new Date(year, month, MAP_DAY, MAP_HOUR)

/** Les instants du premier et du dernier jour où le ciel est celui de la carte (3 min 56 s plus tôt chaque jour). */
export function sameSky(year, month) {
  const t = mapTime(year, month).getTime()
  return [1, daysInMonth(year, month)].map((day) => new Date(t + (day - MAP_DAY) * SIDEREAL_DAY * DAY_MS))
}

/** La Lune chaque jour du mois à l'heure de la carte : { date, phase (angle, 0 nouvelle, 180 pleine), quarter (0 à 3 si une phase principale tombe ce jour-là) }. */
export function moonDays(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  const quarters = []
  for (let q = Astronomy.SearchMoonQuarter(start); q.time.date < end; q = Astronomy.NextMoonQuarter(q)) quarters.push({ quarter: q.quarter, date: q.time.date })
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const date = new Date(year, month, i + 1, MAP_HOUR)
    const quarter = quarters.find((q) => q.date.getFullYear() === year && q.date.getMonth() === month && q.date.getDate() === i + 1)
    return { date, phase: Astronomy.MoonPhase(date), quarter: quarter?.quarter ?? null, quarterDate: quarter?.date ?? null }
  })
}

/** Les planètes visibles à l'œil nu au milieu du mois : quand les voir dans la nuit, leur éclat, leur constellation. */
export function planetsOfMonth(year, month, observer) {
  const middle = new Date(year, month, MAP_DAY)
  return PLANETS.map((id) => ({
    id,
    ...BODY[id],
    visibility: nightVisibility(id, observer, middle),
    constellation: bodyConstellation(id, new Date(year, month, MAP_DAY, MAP_HOUR), observer).name,
  }))
}

/** Tout ce que la fiche montre, calculé pour le lieu. */
export function collect(year, month, observer) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  return {
    year,
    month,
    mapTime: mapTime(year, month),
    sameSky: sameSky(year, month),
    moonDays: moonDays(year, month),
    planets: planetsOfMonth(year, month, observer),
    events: findEvents(start, end, observer),
  }
}
