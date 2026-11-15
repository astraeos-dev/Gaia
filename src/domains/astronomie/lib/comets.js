/**
 * LES COMÈTES : positions et éclat
 * --------------------------------
 * Orbites à deux corps à partir des éléments du Minor Planet Center (fichier CometEls.txt), comme Céleste
 * (mpc.py) : précises à quelques minutes d'arc près de l'époque des éléments, assez pour trouver une comète.
 * Magnitude totale prévue par les paramètres du MPC : m = H + 5 log Δ + 2,5 G log r.
 *
 * Seul Astronomy Engine est importé (la Terre) : le script qui prépare les données (scripts/fetch-comets.mjs)
 * s'en sert aussi.
 *
 * Un élément d'orbite : { q (UA), e, i, node, peri (degrés, écliptique J2000), tp (jour julien TT du périhélie),
 * H, G (paramètres de magnitude, null si inconnus) }.
 */
import * as Astronomy from 'astronomy-engine'

const K = 0.01720209895 // constante de Gauss (UA^1,5 par jour)
const DEG = Math.PI / 180
const OBLIQUITY = 23.4392911 * DEG // obliquité de J2000
const COS_E = Math.cos(OBLIQUITY)
const SIN_E = Math.sin(OBLIQUITY)
const LIGHT_DAYS_PER_AU = 0.0057755183
const KM_PER_AU = 149_597_870.7
const J2000 = 2451545

/** Jour julien d'une date du calendrier grégorien (jour décimal). */
export function julianDay(year, month, day) {
  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const a = Math.floor(y / 100)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + 2 - a + Math.floor(a / 4) - 1524.5
}

/** Jour julien (TT) d'un instant. */
export const jdOf = (date) => Astronomy.MakeTime(date).tt + J2000

/** L'instant d'un jour julien (à la minute près : l'écart TT − UT est négligé). */
export const dateOfJd = (jd) => new Date((jd - 2440587.5) * 86_400_000)

const wrapPi = (x) => x - 2 * Math.PI * Math.floor((x + Math.PI) / (2 * Math.PI))

/** Distance au Soleil et anomalie vraie (radians) au jour julien TT `jd`. */
function anomaly(el, jd) {
  const { q, e } = el
  const dt = jd - el.tp
  if (e < 0.9999) {
    const a = q / (1 - e)
    const M = wrapPi((K / a ** 1.5) * dt)
    let E = e > 0.8 ? Math.PI * Math.sign(M) : M
    for (let k = 0; k < 60; k++) {
      const step = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
      E -= step
      if (Math.abs(step) < 1e-13) break
    }
    return {
      r: a * (1 - e * Math.cos(E)),
      nu: 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)),
    }
  }
  if (e > 1.0001) {
    const a = q / (e - 1)
    const M = (K / a ** 1.5) * dt
    let H = Math.asinh(M / e)
    for (let k = 0; k < 60; k++) {
      const step = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1)
      H -= step
      if (Math.abs(step) < 1e-13) break
    }
    return { r: a * (e * Math.cosh(H) - 1), nu: 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2)) }
  }
  // presque parabolique : équation de Barker
  const W = ((3 * K) / Math.sqrt(2 * q ** 3)) * dt
  const Y = Math.cbrt(W / 2 + Math.sqrt((W * W) / 4 + 1))
  const s = Y - 1 / Y
  return { r: q * (1 + s * s), nu: 2 * Math.atan(s) }
}

/** Position héliocentrique écliptique J2000 (UA) pour une anomalie vraie et une distance au Soleil. */
export function positionAt(el, nu, r) {
  const u = el.peri * DEG + nu
  const node = el.node * DEG
  const inc = el.i * DEG
  const cu = Math.cos(u)
  const su = Math.sin(u)
  const cn = Math.cos(node)
  const sn = Math.sin(node)
  const ci = Math.cos(inc)
  return { x: r * (cn * cu - sn * su * ci), y: r * (sn * cu + cn * su * ci), z: r * su * Math.sin(inc) }
}

/** Position héliocentrique écliptique J2000 (UA) et distance au Soleil au jour julien TT `jd`. */
export function heliocentric(el, jd) {
  const { r, nu } = anomaly(el, jd)
  return { ...positionAt(el, nu, r), r, nu }
}

const toEquatorial = ({ x, y, z }) => ({ x, y: y * COS_E - z * SIN_E, z: y * SIN_E + z * COS_E })

/** Magnitude totale prévue, ou null sans paramètres de magnitude. */
export function predictedMagnitude(el, r, delta) {
  if (el.H == null || el.G == null || !(r > 0) || !(delta > 0)) return null
  return el.H + 5 * Math.log10(delta) + 2.5 * el.G * Math.log10(r)
}

/**
 * La comète vue du centre de la Terre à un instant : ascension droite (degrés et heures) et déclinaison J2000,
 * distances à la Terre (delta) et au Soleil (r) en UA, élongation, latitude écliptique, magnitude prévue ;
 * la position héliocentrique écliptique (sans le temps de lumière) pour les vues de l'orbite.
 */
export function cometPosition(el, date) {
  const time = Astronomy.MakeTime(date)
  const jd = time.tt + J2000
  const earth = Astronomy.HelioVector(Astronomy.Body.Earth, time)
  let tau = 0
  let helio
  let geo
  let delta
  for (let k = 0; k < 3; k++) {
    helio = toEquatorial(heliocentric(el, jd - tau))
    geo = { x: helio.x - earth.x, y: helio.y - earth.y, z: helio.z - earth.z }
    delta = Math.hypot(geo.x, geo.y, geo.z)
    tau = delta * LIGHT_DAYS_PER_AU
  }
  const r = Math.hypot(helio.x, helio.y, helio.z)
  let ra = Math.atan2(geo.y, geo.x) / DEG
  if (ra < 0) ra += 360
  const dec = Math.asin(geo.z / delta) / DEG
  const sun = Math.hypot(earth.x, earth.y, earth.z)
  const cosElong = -(geo.x * earth.x + geo.y * earth.y + geo.z * earth.z) / (delta * sun)
  const elongation = Math.acos(Math.max(-1, Math.min(1, cosElong))) / DEG
  const eclLat = Math.asin((-geo.y * SIN_E + geo.z * COS_E) / delta) / DEG
  const here = heliocentric(el, jd)
  return {
    ra,
    raHours: ra / 15,
    dec,
    delta,
    r,
    elongation,
    eclLat,
    // au-dessus ou au-dessous du plan de l'écliptique, vue du Soleil (la « latitude écliptique » de Heavens-Above)
    helioLat: Math.asin(here.z / here.r) / DEG,
    mag: predictedMagnitude(el, r, delta),
    helio: here,
    earth: { x: earth.x, y: earth.y * COS_E + earth.z * SIN_E, z: -earth.y * SIN_E + earth.z * COS_E },
  }
}

/** Demi-grand axe (UA), aphélie (UA) et période (années) d'une orbite elliptique ; null sinon. */
export function orbitInfo(el) {
  if (el.e >= 1) return { a: null, aphelion: null, period: null }
  const a = el.q / (1 - el.e)
  return { a, aphelion: a * (1 + el.e), period: a ** 1.5 }
}

/** Vitesse par rapport au Soleil (km/s) à la distance r (UA), d'après l'équation de l'énergie. */
export const speedKmS = (el, r) => ((K * Math.sqrt(Math.max(0, 2 / r - (1 - el.e) / el.q))) * KM_PER_AU) / 86_400

/**
 * Points de l'orbite (héliocentriques écliptiques), pour la dessiner : l'ellipse entière, ou la branche d'une
 * orbite ouverte jusqu'à `rMax` UA du Soleil.
 */
export function orbitPoints(el, n = 360, rMax = 40) {
  const points = []
  if (el.e < 1) {
    const a = el.q / (1 - el.e)
    for (let k = 0; k <= n; k++) {
      const E = -Math.PI + (2 * Math.PI * k) / n
      const r = a * (1 - el.e * Math.cos(E))
      const nu = 2 * Math.atan2(Math.sqrt(1 + el.e) * Math.sin(E / 2), Math.sqrt(1 - el.e) * Math.cos(E / 2))
      points.push({ ...positionAt(el, nu, r), r })
    }
    return points
  }
  const p = el.q * (1 + el.e)
  const nuMax = Math.acos(Math.max(-1, Math.min(1, (p / rMax - 1) / el.e)))
  for (let k = 0; k <= n; k++) {
    const nu = -nuMax + (2 * nuMax * k) / n
    const r = p / (1 + el.e * Math.cos(nu))
    points.push({ ...positionAt(el, nu, r), r })
  }
  return points
}
