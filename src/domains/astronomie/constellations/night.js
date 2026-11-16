/**
 * UN POINT FIXE DU CIEL PENDANT LA NUIT
 * -------------------------------------
 * Le centre d'une constellation (ou une étoile) vu du lieu : sa meilleure hauteur dans la nuit noire, son lever, son
 * passage au méridien et son coucher. Les échantillons de la nuit viennent de nightSamples (comets/sky.js).
 */
import { makeJ2000ToHorizon } from '../lib/astro'

/**
 * La meilleure hauteur du point (`ra`, `dec` en degrés J2000) quand le Soleil est sous `sunMax`° : { t, alt, az },
 * null si la nuit ne descend pas assez (l'été aux hautes latitudes).
 */
export function bestInDarkness(ra, dec, samples, { sunMax = -12 } = {}) {
  let best = null
  for (const s of samples) {
    if (s.sunAlt > sunMax) continue
    const h = s.toHor(ra, dec)
    if (!best || h.alt > best.alt) best = { t: s.t, alt: h.alt, az: h.az }
  }
  return best
}

/**
 * Lever, passage au plus haut et coucher du point sur les 24 heures qui suivent `start`, au pas de `stepMinutes` :
 * { rise, transit: { t, alt }, set, always (jamais couché), never (jamais levé), points: [{ t, alt }] }.
 */
export function pointDay(ra, dec, observer, start, stepMinutes = 5) {
  const points = []
  for (let k = 0; k <= (24 * 60) / stepMinutes; k++) {
    const t = new Date(start.getTime() + k * stepMinutes * 60_000)
    points.push({ t, alt: makeJ2000ToHorizon(t, observer)(ra, dec).alt })
  }
  let rise = null
  let set = null
  let transit = points[0]
  for (let k = 1; k < points.length; k++) {
    const [a, b] = [points[k - 1], points[k]]
    if (b.alt > transit.alt) transit = b
    // l'instant du passage à l'horizon, par interpolation entre les deux échantillons
    const cross = () => new Date(a.t.getTime() + ((b.t - a.t) * a.alt) / (a.alt - b.alt))
    if (!rise && a.alt < 0 && b.alt >= 0) rise = cross()
    if (!set && a.alt >= 0 && b.alt < 0) set = cross()
  }
  const always = points.every((p) => p.alt >= 0)
  const never = points.every((p) => p.alt < 0)
  return { rise, transit, set, always, never, points }
}
