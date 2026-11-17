/**
 * LES ÉTOILES CACHÉES PAR DES ASTÉROÏDES, VUES DU LIEU
 * ---------------------------------------------------
 * Comme occultations.py de Céleste (4.20). Quand un astéroïde passe devant une étoile, son ombre balaie la Terre dans
 * une bande aussi large que lui, de quelques kilomètres à quelques centaines : là, l'étoile disparaît quelques
 * secondes. Chronométrées par des observateurs répartis en travers de la bande, ces occultations donnent la taille et
 * la forme de l'astéroïde au kilomètre près.
 *
 * Les prédictions sont celles de l'International Occultation Timing Association (IOTA) : les fichiers « occelmnt »
 * que Steve Preston calcule chaque année avec Occult (David Herald), d'après les étoiles de Gaia DR3 et les orbites
 * du JPL. La sélection de l'IOTA, environ 5 000 évènements par an aux étoiles assez brillantes et aux trajets bien
 * connus, est sur asteroidoccultation.com ; scripts/fetch-occultations.mjs en garde les mois qui viennent.
 *
 * Chaque évènement donne le trajet de l'ombre en éléments de Bessel : sur le plan fondamental, qui passe par le centre
 * de la Terre perpendiculairement à la direction de l'étoile, l'axe de l'ombre est en X(t), Y(t) rayons terrestres,
 * des polynômes du troisième degré du temps en heures depuis le milieu de l'évènement (UT). X pointe vers l'est et Y
 * vers le nord de la direction de l'étoile (de la date). Le lieu est porté sur le même plan (ξ, η), qui tourne avec
 * la Terre, et on cherche quand l'ombre passe au plus près. Le lieu est dans la bande quand cette distance est
 * inférieure au rayon de l'astéroïde. La distance au sol, et la largeur de la bande là, viennent de la pente locale
 * de la projection : la bande est plus large au sol quand l'étoile est basse.
 *
 * Ces prédictions sont faites des mois à l'avance. La bande peut se déplacer de plus que sa largeur quand l'orbite de
 * l'astéroïde est affinée : OccultWatcher donne les trajets à jour dans les deux mois qui précèdent un évènement.
 *
 * Aucune dépendance : le script se sert de ce module.
 */
export const URL_OF_YEAR = (year) => `https://asteroidoccultation.com/${year}/${year}-iota.zip`
export const SOURCE_URL = 'https://asteroidoccultation.com/'
export const OCCULT_WATCHER_URL = 'https://cloud.occultwatcher.net/'
export const MAX_KM = 100 // les bandes qui passent à moins de cette distance du lieu
export const MIN_ALT = 10 // l'étoile au moins à cette hauteur…
export const DARK_SUN = -12 // …dans un ciel assez noir
export const EARTH_KM = 6378.137 // l'unité des éléments, le rayon équatorial de la Terre
const FLATTENING = 1 / 298.257223563
const SIDEREAL = (15.04106864 * Math.PI) / 180 // la Terre tourne sous les étoiles, en radians par heure
const SOLAR = (15 * Math.PI) / 180 // et sous le Soleil
const KM_PER_RAD = 6371 // les pas au sol pour la pente locale (rayon moyen)
const DEG = Math.PI / 180
const HOUR_MS = 3_600_000

const EVENT = /<Event>(.*?)<\/Event>/gs
const FIELD = /<(Elements|Earth|Star|Object|Errors|ID)>(.*?)<\/\1>/gs

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const unescape = (text) => text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name])

/** Un nombre ; `fallback` pour un texte vide ou illisible. */
const number = (text, fallback = null) => {
  if (text == null || String(text).trim() === '') return fallback
  const x = Number(text)
  return Number.isFinite(x) ? x : fallback
}
const required = (text) => {
  const x = number(text)
  if (x == null) throw new Error(`nombre illisible : ${text}`)
  return x
}

/**
 * Les évènements d'un texte occelmnt (le XML d'Occult), sans ceux qui ne se lisent pas : id ; name, number (texte,
 * vide pour un astéroïde non numéroté) ; middle (instant UT de l'origine des éléments) ; elements (X, Y, dX, dY, d2X,
 * d2Y, d3X, d3Y : rayons terrestres et heures) ; substar, subsolar ([longitude est, latitude] au milieu, degrés) ;
 * star (nom du catalogue), starMag (V), ra, dec (de la date : heures, degrés), ra2000, dec2000 ; mag (celle de
 * l'astéroïde), diameterKm, distanceAu, maxDuration (s), orbit (sa source).
 */
export function parseOccelmnt(text) {
  const events = []
  for (const [, block] of text.matchAll(EVENT)) {
    const fields = Object.fromEntries([...block.matchAll(FIELD)].map(([, tag, value]) => [tag, value.trim()]))
    try {
      const el = fields.Elements.split(',')
      const earth = fields.Earth.split(',')
      const star = fields.Star.split(',')
      const obj = fields.Object.split(',')
      const [year, month, day, hours] = [required(el[2]), required(el[3]), required(el[4]), required(el[5])]
      const event = {
        id: (fields.ID ?? '').split(',')[0],
        number: obj[0].trim(),
        name: unescape(obj[1].trim()),
        middle: new Date(Date.UTC(year, month - 1, day) + hours * HOUR_MS),
        elements: el.slice(6, 14).map(required),
        substar: [required(earth[0]), required(earth[1])],
        subsolar: [required(earth[2]), required(earth[3])],
        star: unescape(star[0].trim()),
        starMag: number(star[4]),
        ra2000: required(star[1]),
        dec2000: required(star[2]),
        ra: required(star[9]),
        dec: required(star[10]),
        mag: number(obj[2]),
        diameterKm: required(obj[3]),
        distanceAu: number(obj[4]),
        maxDuration: number(el[1]),
        orbit: el[0].trim(),
      }
      if (event.elements.length === 8 && event.diameterKm > 0) events.push(event)
    } catch {
      // un évènement illisible est laissé de côté
    }
  }
  return events
}

/** De combien l'étoile et l'astéroïde ensemble faiblissent quand l'étoile est cachée (magnitudes) ; null sans les deux éclats. */
export function magDrop(starMag, asteroidMag) {
  if (starMag == null || asteroidMag == null) return null
  const both = -2.5 * Math.log10(10 ** (-0.4 * starMag) + 10 ** (-0.4 * asteroidMag))
  return asteroidMag - both
}

/** ρ cos φ′ et ρ sin φ′ du lieu, en rayons terrestres (WGS84). */
export function placeOnEarth(lat, lon, elevationM = 0) {
  const phi = lat * DEG
  const c = 1 / Math.sqrt(Math.cos(phi) ** 2 + (1 - FLATTENING) ** 2 * Math.sin(phi) ** 2)
  const s = (1 - FLATTENING) ** 2 * c
  const h = elevationM / 1000 / EARTH_KM
  return [(c + h) * Math.cos(phi), (s + h) * Math.sin(phi)]
}

/** X, Y de l'axe de l'ombre à `tau` heures du milieu, et leurs deux premières dérivées. */
export function shadow(e, tau) {
  const [x, y, dx, dy, d2x, d2y, d3x, d3y] = e
  return [
    x + tau * (dx + tau * (d2x + tau * d3x)),
    y + tau * (dy + tau * (d2y + tau * d3y)),
    dx + tau * (2 * d2x + 3 * d3x * tau),
    dy + tau * (2 * d2y + 3 * d3y * tau),
    2 * d2x + 6 * d3x * tau,
    2 * d2y + 6 * d3y * tau,
  ]
}

/** ξ, η du lieu sur le plan fondamental (l'angle horaire de l'étoile en radians) et leurs deux premières dérivées (la Terre tourne). */
export function observerOnPlane(pc, ps, dec, hourAngle) {
  const [sinH, cosH, sinD, cosD] = [Math.sin(hourAngle), Math.cos(hourAngle), Math.sin(dec), Math.cos(dec)]
  const w = SIDEREAL
  return [pc * sinH, ps * cosD - pc * sinD * cosH, pc * cosH * w, pc * sinD * sinH * w, -pc * sinH * w * w, pc * sinD * cosH * w * w]
}

/** L'angle horaire de l'étoile au lieu (radians), `tau` heures après le milieu. */
export const hourAngleAt = (lon, substarLon, tau) => (lon - substarLon) * DEG + SIDEREAL * tau

/** Hauteur et azimut (degrés, l'azimut compté du nord vers l'est) pour une déclinaison et un angle horaire (radians). */
export function altitudeAzimuth(lat, dec, hourAngle) {
  const phi = lat * DEG
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle)
  const az = Math.atan2(-Math.cos(dec) * Math.sin(hourAngle), Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(hourAngle))
  return [Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG, (((az / DEG) % 360) + 360) % 360]
}

const SAMPLES = 161

/**
 * L'instant (heures depuis le milieu) où l'axe de l'ombre passe au plus près du lieu sur le plan fondamental, et
 * cette distance (rayons terrestres) ; une distance NaN pour une ombre qui passe à plus de `margin` du disque de la
 * Terre.
 */
export function nearest(event, pc, ps, lon, margin) {
  const e = event.elements
  const [x0, y0, dx, dy] = e
  const speed2 = Math.max(dx * dx + dy * dy, 1e-9)
  const centre = -(x0 * dx + y0 * dy) / speed2 // la traversée du disque en ligne droite
  const impact = Math.abs(x0 * dy - y0 * dx) / Math.sqrt(speed2)
  const reach = 1 + margin
  const half = Math.sqrt(Math.max(reach * reach - impact * impact, 0)) / Math.sqrt(speed2) + 0.05
  const dec = event.dec * DEG
  const lon0 = event.substar[0]
  const gap = (tau) => {
    const [x, y] = shadow(e, tau)
    const [xi, eta] = observerOnPlane(pc, ps, dec, hourAngleAt(lon, lon0, tau))
    return (x - xi) ** 2 + (y - eta) ** 2
  }
  let best = centre - half
  let smallest = Infinity
  for (let k = 0; k < SAMPLES; k++) {
    const tau = centre + half * (-1 + (2 * k) / (SAMPLES - 1))
    const g = gap(tau)
    if (g < smallest) [best, smallest] = [tau, g]
  }
  for (let i = 0; i < 5; i++) {
    // Newton sur d(distance²)/dt = 0
    const [x, y, x1, y1, x2, y2] = shadow(e, best)
    const [xi, eta, xi1, eta1, xi2, eta2] = observerOnPlane(pc, ps, dec, hourAngleAt(lon, lon0, best))
    const [ux, uy, vx, vy] = [x - xi, y - eta, x1 - xi1, y1 - eta1]
    const slope = vx * vx + vy * vy + ux * (x2 - xi2) + uy * (y2 - eta2)
    const step = (ux * vx + uy * vy) / (Math.abs(slope) > 1e-12 ? slope : 1e-12)
    best = Math.min(centre + half, Math.max(centre - half, best - step))
  }
  return { tau: best, distance: impact <= reach ? Math.sqrt(gap(best)) : Number.NaN }
}

/**
 * Le lieu face à la bande à `tau` : sa distance signée à la ligne centrale sur le plan fondamental (rayons
 * terrestres), son taux par kilomètre au sol vers l'est et vers le nord, et la vitesse relative (rayons terrestres
 * par heure).
 */
function ground(event, tau, lat, lon, elevationM) {
  const dec = event.dec * DEG
  const [x, y, x1, y1] = shadow(event.elements, tau)
  const plane = (la, lo) => {
    const [pc, ps] = placeOnEarth(la, lo, elevationM)
    return observerOnPlane(pc, ps, dec, hourAngleAt(lo, event.substar[0], tau))
  }
  const [xi, eta, xi1, eta1] = plane(lat, lon)
  const [vx, vy] = [x1 - xi1, y1 - eta1]
  const speed = Math.hypot(vx, vy)
  const [px, py] = [-vy / speed, vx / speed] // en travers de la bande
  const signed = px * (xi - x) + py * (eta - y)
  const stepLat = 1 / KM_PER_RAD / DEG
  const stepLon = 1 / (KM_PER_RAD * Math.max(Math.cos(lat * DEG), 1e-6)) / DEG
  const east = plane(lat, lon + stepLon)
  const north = plane(lat + stepLat, lon)
  return {
    signed,
    rateE: px * (east[0] - xi) + py * (east[1] - eta),
    rateN: px * (north[0] - xi) + py * (north[1] - eta),
    speed,
  }
}

/**
 * L'évènement vu du lieu à `tau` : date (UT), distanceKm (à la ligne centrale), halfWidthKm, inside, edgeKm (au bord
 * de la bande ; 0 dedans), direction (azimut du lieu vers la ligne centrale, degrés ; null dessus), duration
 * (secondes où l'étoile est cachée ici ; 0 dehors), band (de quoi dessiner la bande autour du lieu), alt, az (de
 * l'étoile), sun (hauteur du Soleil), drop.
 */
function describe(event, tau, lat, lon, elevationM) {
  const { signed, rateE, rateN, speed } = ground(event, tau, lat, lon, elevationM)
  const rate = Math.hypot(rateE, rateN)
  const radius = event.diameterKm / 2 / EARTH_KM
  const distance = Math.abs(signed) / rate
  const half = radius / rate
  const side = signed < 0 ? -1 : 1
  const [alt, az] = altitudeAzimuth(lat, event.dec * DEG, hourAngleAt(lon, event.substar[0], tau))
  const [sunLon, sunLat] = event.subsolar
  const [sun] = altitudeAzimuth(lat, sunLat * DEG, (lon - sunLon) * DEG + SOLAR * tau)
  return {
    event,
    date: new Date(event.middle.getTime() + tau * HOUR_MS),
    distanceKm: distance,
    halfWidthKm: half,
    inside: Math.abs(signed) < radius,
    edgeKm: Math.max(distance - half, 0),
    // la ligne centrale, vue du lieu
    direction: distance > 0.05 ? ((((Math.atan2(-side * rateE, -side * rateN) / DEG) % 360) + 360) % 360) : null,
    duration: ((2 * Math.sqrt(Math.max(radius * radius - signed * signed, 0))) / speed) * 3600,
    // pour dessiner la bande autour du lieu : sa distance signée à la ligne centrale et son taux par km au sol
    band: { signed, rateE, rateN, radius },
    alt,
    az,
    sun,
    drop: magDrop(event.starMag, event.mag),
  }
}

/** L'évènement vu du lieu : quand l'ombre passe au plus près, à quelle distance de la ligne centrale, et la largeur de la bande là. */
export function passAt(event, lat, lon, elevationM = 0) {
  const [pc, ps] = placeOnEarth(lat, lon, elevationM)
  return describe(event, nearest(event, pc, ps, lon, 1).tau, lat, lon, elevationM)
}

/**
 * Les évènements dont la bande passe à moins de `maxKm` du lieu entre `start` et `end` (dates UT, null : sans
 * limite), l'étoile à `minAlt` au moins et le Soleil plus bas que `darkSun` là. Par date : ceux de passAt().
 */
export function near(events, lat, lon, elevationM = 0, { start = null, end = null, maxKm = MAX_KM, minAlt = MIN_ALT, darkSun = DARK_SUN } = {}) {
  const day = 24 * HOUR_MS
  const chosen = events.filter((e) => (start == null || e.middle >= start - day) && (end == null || e.middle < end.getTime() + day))
  const [pc, ps] = placeOnEarth(lat, lon, elevationM)
  const margin = (maxKm + 600) / EARTH_KM // le rayon des plus gros astéroïdes, et un peu plus
  const found = []
  for (const event of chosen) {
    const { tau, distance } = nearest(event, pc, ps, lon, margin)
    // au sol, une bande n'est jamais plus étroite, ni un lieu plus proche, que sur le plan
    if (!Number.isFinite(distance) || (distance - event.diameterKm / 2 / EARTH_KM) * EARTH_KM > maxKm) continue
    const seen = describe(event, tau, lat, lon, elevationM)
    if (seen.edgeKm <= maxKm && seen.alt >= minAlt && seen.sun <= darkSun && (start == null || seen.date >= start) && (end == null || seen.date < end)) found.push(seen)
  }
  return found.sort((a, b) => a.date - b.date)
}
