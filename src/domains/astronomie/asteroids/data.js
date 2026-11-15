/**
 * LES ASTÉROÏDES BRILLANTS ET LES PLANÈTES NAINES DU SITE
 * -------------------------------------------------------
 * data/asteroids.json, préparé par scripts/fetch-asteroids.mjs (base des petits corps du JPL) ; leurs positions et
 * leur éclat se calculent comme ceux des comètes (lib/comets.js, système H, G), et leur visibilité avec comets/sky.js.
 */
import DATA from '../data/asteroids.json'
import { addDays } from '../lib/astro'
import { cometPosition } from '../lib/comets'

export const UPDATED = DATA.updated
export const SOURCE = DATA.source

export const ASTEROIDS = DATA.asteroids.map((a) => ({ ...a, el: { ...a.orbit, H: a.H, G: a.G, kind: 'asteroid' } }))

export const getAsteroid = (id) => ASTEROIDS.find((a) => a.id === id)

export const asteroidPath = (a) => `/astronomie/asteroides/${a.id}`

/**
 * La prochaine opposition dans les 500 jours (l'astre au plus loin du Soleil dans le ciel) : sa date et la
 * magnitude prévue ce jour-là ; null si l'écart au Soleil ne fait que décroître (opposition juste passée).
 */
export function nextOpposition(asteroid, date) {
  let best = null
  for (let d = 0; d <= 500; d += 2) {
    const t = addDays(date, d)
    const p = cometPosition(asteroid.el, t)
    if (!best || p.elongation > best.elongation) best = { t, elongation: p.elongation, mag: p.mag, d }
  }
  return best && best.d > 2 ? best : null
}
