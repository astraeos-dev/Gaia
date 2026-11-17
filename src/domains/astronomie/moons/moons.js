/**
 * LES LUNES DE MARS, SATURNE, URANUS, NEPTUNE ET PLUTON, ET LES ANNEAUX DE SATURNE
 * -------------------------------------------------------------------------------
 * Comme planet_moons() et saturn_rings() d'engine.py dans Céleste (4.8 et 4.13). Les lunes : leurs états (position et
 * vitesse par rapport au centre de leur planète, axes ICRF) à 0 h TDB de chaque jour, d'après JPL Horizons (ses
 * éphémérides de satellites MAR097, SAT441, URA184, NEP097, PLU060), que scripts/fetch-moons.mjs télécharge pour les
 * deux mois qui viennent ; entre deux jours, l'état le plus proche est prolongé sur son orbite de Kepler autour de la
 * planète (douze heures au plus : une fraction de degré, même pour Phobos). Les satellites galiléens de Jupiter ont
 * leur propre page (jupiter/).
 *
 * Les anneaux : leur inclinaison vue de la Terre et du Soleil, d'après le pôle de Saturne de l'UAI, et leur taille
 * apparente (le bord extérieur de l'anneau A).
 *
 * Seuls Astronomy Engine et lib/time sont importés : scripts/fetch-moons.mjs se sert aussi de ce module.
 */
import * as Astronomy from 'astronomy-engine'
import { deltaT } from '../lib/time.js'

export const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'

/** Les lunes suivies : nom, numéro et centre chez Horizons, planète, magnitude V à l'opposition moyenne (approchée). */
export const MOONS = [
  { name: 'Phobos', id: '401', planet: 'Mars', centre: '499', mag: 11.4 },
  { name: 'Déimos', id: '402', planet: 'Mars', centre: '499', mag: 12.5 },
  { name: 'Mimas', id: '601', planet: 'Saturn', centre: '699', mag: 12.9 },
  { name: 'Encelade', id: '602', planet: 'Saturn', centre: '699', mag: 11.7 },
  { name: 'Téthys', id: '603', planet: 'Saturn', centre: '699', mag: 10.2 },
  { name: 'Dioné', id: '604', planet: 'Saturn', centre: '699', mag: 10.4 },
  { name: 'Rhéa', id: '605', planet: 'Saturn', centre: '699', mag: 9.7 },
  { name: 'Titan', id: '606', planet: 'Saturn', centre: '699', mag: 8.4 },
  { name: 'Hypérion', id: '607', planet: 'Saturn', centre: '699', mag: 14.4 },
  { name: 'Japet', id: '608', planet: 'Saturn', centre: '699', mag: 11 },
  { name: 'Miranda', id: '705', planet: 'Uranus', centre: '799', mag: 15.8 },
  { name: 'Ariel', id: '701', planet: 'Uranus', centre: '799', mag: 13.7 },
  { name: 'Umbriel', id: '702', planet: 'Uranus', centre: '799', mag: 14.5 },
  { name: 'Titania', id: '703', planet: 'Uranus', centre: '799', mag: 13.5 },
  { name: 'Obéron', id: '704', planet: 'Uranus', centre: '799', mag: 13.7 },
  { name: 'Triton', id: '801', planet: 'Neptune', centre: '899', mag: 13.5 },
  { name: 'Charon', id: '901', planet: 'Pluto', centre: '999', mag: 16.8 },
]
export const MOON_PLANETS = ['Mars', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

/** km³/s² (Pluton : Pluton et Charon) */
const GM = { Mars: 42828.37, Saturn: 37931206.2, Uranus: 5793951.3, Neptune: 6835099.5, Pluto: 975.5 }
/** Rayons équatoriaux (km) */
export const PLANET_RADIUS_KM = { Mars: 3389.5, Saturn: 60268, Uranus: 25559, Neptune: 24764, Pluto: 1188.3 }
const CHARON_MASS_RATIO = 106.1 / 975.5 // Charon / (Pluton + Charon) : Pluton n'est pas au barycentre
const SATURN_RING_KM = 136775 // le bord extérieur de l'anneau A
const SATURN_POLE = [40.589, -0.036, 83.537, -0.004] // UAI : α0, δ0 (°, ICRF) et leur variation par siècle
const KM_PER_AU = Astronomy.KM_PER_AU
const LIGHT_DAYS_PER_KM = 1 / 299_792.458 / 86_400
const ARCSEC_PER_RAD = (180 / Math.PI) * 3600
const DEG = Math.PI / 180
const JD_UNIX = 2_440_587.5

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a) => Math.hypot(a[0], a[1], a[2])
const scale = (a, k) => a.map((c) => c * k)

/** Les paramètres de la demande à Horizons : les états d'une lune par rapport au centre de sa planète, chaque jour. */
export const vectorsQuery = (moon, start, stop) => ({
  format: 'text',
  COMMAND: `'${moon.id}'`,
  EPHEM_TYPE: "'VECTORS'",
  CENTER: `'500@${moon.centre}'`,
  START_TIME: `'${start}'`,
  STOP_TIME: `'${stop}'`,
  STEP_SIZE: "'1d'",
  VEC_TABLE: "'2'",
  REF_PLANE: "'FRAME'",
  OUT_UNITS: "'KM-S'",
  CSV_FORMAT: "'YES'",
  VEC_LABELS: "'NO'",
  OBJ_DATA: "'NO'",
})

/** Les lignes d'une table de vecteurs d'Horizons (CSV) : [jd TDB, x, y, z (km), vx, vy, vz (km/s)]. */
export function parseVectors(text) {
  const start = text.indexOf('$$SOE')
  const end = text.indexOf('$$EOE')
  if (start < 0 || end < 0) throw new Error(text.split(/\s+/).join(' ').trim().slice(0, 200) || 'pas de vecteurs')
  return text
    .slice(start + 5, end)
    .split(/\r?\n/)
    .map((line) => line.split(',').map((c) => c.trim()))
    .filter((cells) => cells.length >= 8)
    .map((cells) => [cells[0], ...cells.slice(2, 8)].map(Number))
    .filter((row) => row.every(Number.isFinite))
}

/** La position (km) après `dt` secondes sur l'ellipse de Kepler de l'état (r km, v km/s) autour d'un corps de paramètre `mu`. */
export function twoBody(r, v, mu, dt) {
  const rn = norm(r)
  const a = 1 / (2 / rn - dot(v, v) / mu)
  const h = cross(r, v)
  const eVec = cross(v, h).map((c, i) => c / mu - r[i] / rn)
  const e = norm(eVec)
  const n = Math.sqrt(mu / a ** 3)
  const p = e > 1e-9 ? scale(eVec, 1 / e) : scale(r, 1 / rn)
  const q = cross(scale(h, 1 / norm(h)), p)
  const [cosNu, sinNu] = [dot(r, p) / rn, dot(r, q) / rn]
  const big0 = Math.atan2(Math.sqrt(1 - e * e) * sinNu, e + cosNu)
  const m = big0 - e * Math.sin(big0) + n * dt
  let big = m
  for (let i = 0; i < 30; i++) {
    const step = (big - e * Math.sin(big) - m) / (1 - e * Math.cos(big))
    big -= step
    if (Math.abs(step) < 1e-12) break
  }
  const [x, y] = [a * (Math.cos(big) - e), a * Math.sqrt(1 - e * e) * Math.sin(big)]
  return p.map((c, i) => x * c + y * q[i])
}

/** Le jour julien TDB (≈ TT) d'un instant UTC. */
const jdTdb = (date) => date.getTime() / 86_400_000 + JD_UNIX + deltaT(date) / 86_400

/** La position géocentrique astrométrique (km, ICRF) d'une planète, le temps de lumière compris. */
const geocentricKm = (planet, date) => {
  const v = Astronomy.GeoVector(planet, date, false)
  return [v.x * KM_PER_AU, v.y * KM_PER_AU, v.z * KM_PER_AU]
}

/**
 * Les lunes d'une planète vues du centre de la Terre, d'après `table` ({ jd0, moons: [{ name, planet, mag, states:
 * [[x, y, z, vx, vy, vz] à jd0 + k] }] }) : name, mag, east et north (secondes d'arc depuis le centre de la planète),
 * x et y (en rayons équatoriaux, x vers l'ouest comme pour Jupiter, y au nord), separation (″), state (« free »,
 * « transit » devant le disque, « occulted » derrière). Aucune hors de la table.
 */
export function planetMoons(date, planet, table) {
  const moons = table.moons.filter((m) => m.planet === planet)
  if (!moons.length) return []
  let p = geocentricKm(planet, date)
  const jd = jdTdb(date) - norm(p) * LIGHT_DAYS_PER_KM // les lunes telles que la lumière les a quittées
  const k = Math.round(jd - table.jd0)
  if (moons.some((m) => !(k >= 0 && k < m.states.length))) return []
  const dt = (jd - (table.jd0 + k)) * 86_400
  const offsets = new Map(moons.map((m) => [m.name, twoBody(m.states[k].slice(0, 3), m.states[k].slice(3), GM[planet], dt)]))
  const charon = planet === 'Pluto' ? offsets.get('Charon') : null
  if (charon) p = p.map((c, i) => c - CHARON_MASS_RATIO * charon[i]) // Pluton lui-même, hors du barycentre
  const distance = norm(p)
  const ra = Math.atan2(p[1], p[0])
  const dec = Math.asin(p[2] / distance)
  const eastHat = [-Math.sin(ra), Math.cos(ra), 0]
  const northHat = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)]
  const arcsec = ARCSEC_PER_RAD / distance
  const radius = PLANET_RADIUS_KM[planet] * arcsec
  return moons.map((moon) => {
    const m = charon ? offsets.get(moon.name).map((c, i) => c + CHARON_MASS_RATIO * charon[i]) : offsets.get(moon.name)
    const [east, north] = [dot(m, eastHat) * arcsec, dot(m, northHat) * arcsec]
    const onDisc = Math.hypot(east, north) < radius
    return {
      name: moon.name,
      mag: moon.mag,
      east,
      north,
      x: -east / radius,
      y: north / radius,
      separation: Math.hypot(east, north),
      positionAngle: ((Math.atan2(east, north) / DEG) % 360 + 360) % 360,
      state: onDisc ? (dot(m, p) > 0 ? 'occulted' : 'transit') : 'free',
    }
  })
}

/** Le rayon apparent d'une planète (secondes d'arc) à un instant. */
export const planetRadiusArcsec = (planet, date) => (PLANET_RADIUS_KM[planet] / norm(geocentricKm(planet, date))) * ARCSEC_PER_RAD

/**
 * Les anneaux de Saturne vus du centre de la Terre (le pôle de Saturne de l'UAI) : tilt (°, la latitude de la Terre
 * au-dessus du plan des anneaux, positive quand la face nord se montre), sunTilt (la même pour le Soleil), lit (la
 * face vue est-elle celle que le Soleil éclaire), majorArcsec et minorArcsec (les axes apparents du bord extérieur de
 * l'anneau A), poleAngle (°, l'angle de position du pôle nord de Saturne, compté du nord vers l'est).
 */
export function saturnRings(date) {
  const p = geocentricKm('Saturn', date)
  const distance = norm(p)
  const centuries = (jdTdb(date) - 2_451_545) / 36_525
  const [ra0, dra, dec0, ddec] = SATURN_POLE
  const [a0, d0] = [(ra0 + dra * centuries) * DEG, (dec0 + ddec * centuries) * DEG]
  const pole = [Math.cos(d0) * Math.cos(a0), Math.cos(d0) * Math.sin(a0), Math.sin(d0)]
  const emitted = new Date(date.getTime() - distance * LIGHT_DAYS_PER_KM * 86_400_000)
  const helio = Astronomy.HelioVector('Saturn', emitted)
  const fromSun = [helio.x, helio.y, helio.z]
  const latitude = (direction) => Math.asin(-dot(pole, direction) / norm(direction)) / DEG // de l'observateur d'où vient le vecteur
  const tilt = latitude(p)
  const sunTilt = latitude(fromSun)
  const major = 2 * Math.asin(SATURN_RING_KM / distance) * ARCSEC_PER_RAD
  const [ra, dec] = [Math.atan2(p[1], p[0]), Math.asin(p[2] / distance)]
  const poleAngle = Math.atan2(Math.cos(d0) * Math.sin(a0 - ra), Math.sin(d0) * Math.cos(dec) - Math.cos(d0) * Math.sin(dec) * Math.cos(a0 - ra)) / DEG
  return { tilt, sunTilt, lit: tilt * sunTilt > 0, majorArcsec: major, minorArcsec: major * Math.abs(Math.sin(tilt * DEG)), poleAngle }
}
