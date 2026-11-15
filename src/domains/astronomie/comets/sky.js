/**
 * LES COMÈTES DU SITE, VUES D'UN LIEU
 * -----------------------------------
 * Les comètes de data/comets.json (préparées par scripts/fetch-comets.mjs), leur position vue du lieu choisi
 * et leur visibilité pendant la nuit.
 */
import DATA from '../data/comets.json'
import { Astronomy, addDays, addHours, bodyPosition, constellationAt, makeJ2000ToHorizon, startOfDay } from '../lib/astro'
import { cometPosition } from '../lib/comets'

export const UPDATED = DATA.updated
export const SOURCES = DATA.sources

/** Les comètes, avec leurs éléments prêts pour lib/comets (orbite et paramètres de magnitude). */
export const COMETS = DATA.comets.map((c) => ({ ...c, el: { ...c.orbit, H: c.H, G: c.G } }))

export const getComet = (id) => COMETS.find((c) => c.id === id)

/** L'adresse de la fiche d'une comète. */
export const cometPath = (comet) => `/astronomie/cometes/${comet.id}`

/** « 29P/Schwassmann-Wachmann », « C/2026 A2 (Bok) » : la désignation complète, telle que le MPC l'écrit. */
export const cometTitle = (comet) => comet.designation

/** La comète vue du lieu à un instant : position (lib/comets), hauteur et azimut (réfraction comprise), constellation. */
export function cometSky(comet, date, observer) {
  const p = cometPosition(comet.el, date)
  const { alt, az } = makeJ2000ToHorizon(date, observer)(p.ra, p.dec)
  return { ...p, alt, az, constellation: constellationAt(p.raHours, p.dec) }
}

/** Le début de la nuit qui contient `date` (ou qui suit, l'après-midi) : midi local, la veille avant midi. */
export const nightStart = (date) => addHours(startOfDay(date.getHours() < 12 ? addDays(date, -1) : date), 12)

/**
 * La nuit de `date` échantillonnée toutes les `stepMinutes` minutes : la hauteur du Soleil et la conversion
 * J2000 → horizon de chaque instant, calculées une fois pour toutes les comètes.
 */
export function nightSamples(observer, date, stepMinutes = 15) {
  const start = nightStart(date)
  const samples = []
  for (let k = 0; k <= (24 * 60) / stepMinutes; k++) {
    const t = new Date(start.getTime() + k * stepMinutes * 60_000)
    samples.push({ t, sunAlt: bodyPosition(Astronomy.Body.Sun, t, observer).alt, toHor: makeJ2000ToHorizon(t, observer) })
  }
  return samples
}

/**
 * Visibilité d'une comète pendant la nuit : le créneau où elle est à plus de `minAlt`° pendant que le Soleil est
 * sous `sunMax`° (nuit nautique), et l'instant où elle est le plus haut dans ce créneau. Sa position change peu en
 * une nuit : elle est calculée une fois, au milieu de la nuit.
 */
export function cometNight(comet, samples, { minAlt = 15, sunMax = -12 } = {}) {
  const middle = samples[Math.floor(samples.length / 2)].t
  const { ra, dec } = cometPosition(comet.el, middle)
  let start = null
  let end = null
  let best = null
  for (const s of samples) {
    if (s.sunAlt > sunMax) continue
    const { alt, az } = s.toHor(ra, dec)
    if (alt < minAlt) continue
    if (!start) start = s.t
    end = s.t
    if (!best || alt > best.alt) best = { t: s.t, alt, az }
  }
  return { visible: Boolean(best), start, end, best }
}
