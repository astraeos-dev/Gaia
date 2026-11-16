/**
 * LES MINIMA D'ALGOL
 * ------------------
 * Comme variables.py de Céleste (4.18). Algol (β Persei), l'étoile du Démon, est une binaire à éclipses : toutes les
 * 2 j 20 h 49 min, sa compagne plus faible passe devant l'étoile brillante, qui tombe de la magnitude 2,1 à 3,4 en
 * cinq heures environ et remonte en cinq autres, un changement que l'œil suit en la comparant à ses voisines.
 *
 * Les minima viennent d'une éphéméride linéaire ajustée aux 39 minima CCD et photoélectriques de 2006 à 2017 de la
 * base Lichtenknecker du BAV (Bundesdeutsche Arbeitsgemeinschaft für Veränderliche Sterne ; résidus de 7 minutes) :
 *
 *     Min I = JJH 2458065,6768 + 2,8673382 E
 *
 * La période d'Algol dérive lentement (une troisième étoile, les cycles magnétiques des étoiles) : les instants
 * donnés ici tiennent à une demi-heure près environ (UNCERTAINTY_MIN). Les instants héliocentriques sont ramenés à
 * la Terre : la lumière traverse l'orbite de la Terre en 8 minutes au plus, dans un sens ou dans l'autre.
 */
import { Astronomy, bodyPosition, makeJ2000ToHorizon, unitVector } from '../lib/astro'

export const ALGOL = {
  name: 'Algol',
  designation: 'β Persei',
  ra: 3.136148, // J2000, heures
  dec: 40.955647, // degrés
  epoch: 2458065.6768, // jour julien héliocentrique d'un minimum principal
  period: 2.8673382, // jours
  bright: 2.1, // magnitudes V hors éclipse et au minimum
  faint: 3.4,
}
export const UNCERTAINTY_MIN = 30 // l'erreur possible sur les minima prévus, en minutes
export const VISIBLE_ALT = 15 // l'étoile au moins à cette hauteur au minimum…
export const DARK_SUN = -12 // …dans un ciel assez noir pour la comparer à ses voisines

const LIGHT_DAYS_PER_AU = 499.004784 / 86_400
const JD_UNIX = 2440587.5

/** Jour julien (UT) d'un instant, et l'inverse. */
export const jdOf = (date) => date.getTime() / 86_400_000 + JD_UNIX
export const dateOfJd = (jd) => new Date((jd - JD_UNIX) * 86_400_000)

/**
 * JJH − JJ (jours) au jour julien `jd` : le temps que met la lumière de l'étoile entre la Terre et le plan du Soleil
 * perpendiculaire à sa direction, positif quand la Terre est du côté de l'étoile (elle voit l'éclipse la première).
 * 8,3 minutes au plus.
 */
export function lightTimeDays(jd, star = ALGOL) {
  const earth = Astronomy.HelioVector(Astronomy.Body.Earth, dateOfJd(jd))
  const [x, y, z] = unitVector(star.ra * 15, star.dec)
  return (earth.x * x + earth.y * y + earth.z * z) * LIGHT_DAYS_PER_AU
}

/** Les minima principaux entre les instants `start` et `end`, vus de la Terre. */
export function minima(start, end, star = ALGOL) {
  const [jd0, jd1] = [jdOf(start), jdOf(end)]
  const first = Math.ceil((jd0 - 0.01 - star.epoch) / star.period) // 0,01 j : la place du temps de lumière
  const last = Math.floor((jd1 + 0.01 - star.epoch) / star.period)
  const dates = []
  for (let cycle = first; cycle <= last; cycle++) {
    const hjd = star.epoch + star.period * cycle
    let jd = hjd - lightTimeDays(hjd, star)
    jd = hjd - lightTimeDays(jd, star) // le temps de lumière de l'instant lui-même
    const date = dateOfJd(jd)
    if (date >= start && date < end) dates.push(date)
  }
  return dates
}

/**
 * Les minima entre `start` et `end` vus du lieu : { date, alt, az (de l'étoile), sun (hauteur du Soleil), visible }.
 * Visible : l'étoile à `minAlt`° au moins et le Soleil à `darkSun`° sous l'horizon au minimum.
 */
export function minimaFrom(start, end, observer, { star = ALGOL, minAlt = VISIBLE_ALT, darkSun = DARK_SUN } = {}) {
  return minima(start, end, star).map((date) => {
    const { alt, az } = makeJ2000ToHorizon(date, observer)(star.ra * 15, star.dec)
    const sun = bodyPosition(Astronomy.Body.Sun, date, observer).alt
    return { date, alt, az, sun, visible: alt >= minAlt && sun <= darkSun }
  })
}

/** Les minima qui valent d'être observés depuis le lieu (comme visible_minima de Céleste). */
export const visibleMinima = (start, end, observer, options) => minimaFrom(start, end, observer, options).filter((m) => m.visible)

/**
 * L'allure de la courbe de lumière autour d'un minimum : la magnitude à `hours` heures du minimum (une gaussienne
 * de 1,7 h d'écart type, qui retrouve les 2,1 → 3,4 → 2,1 en une dizaine d'heures). Un schéma, pour savoir quand
 * regarder, pas une mesure.
 */
export const lightCurve = (hours, star = ALGOL) => star.bright + (star.faint - star.bright) * Math.exp(-((hours / 1.7) ** 2) / 2)
