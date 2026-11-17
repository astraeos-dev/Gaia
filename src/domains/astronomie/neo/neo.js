/**
 * LES ASTÉROÏDES QUI PASSENT PRÈS DE LA TERRE
 * ------------------------------------------
 * Comme neo.py de Céleste (4.20). Chaque jour, les relevés du ciel trouvent de petits astéroïdes qui frôlent la
 * Terre. Le Center for Near-Earth Object Studies (CNEOS, NASA/JPL) donne leurs passages au plus près, calculés sur
 * les orbites de sa base des petits corps : scripts/fetch-neo.mjs lui demande ceux à moins de 0,05 ua (19,5 distances
 * lunaires, la limite des astéroïdes « potentiellement dangereux ») d'une semaine avant à un an après, à chaque
 * construction du site.
 *
 * La plupart ne mesurent que quelques mètres ou dizaines de mètres. La taille se déduit de la magnitude absolue H,
 * pour les surfaces sombres et claires (albédos 0,05 à 0,25), à moins qu'un diamètre soit mesuré. Ceux de 140 m et
 * plus, ou qui passent plus près que la Lune, sont les remarquables.
 *
 * Leur éclat dépend de leur phase autant que de leur distance : un astéroïde qui arrive du côté du Soleil se montre
 * en croissant. Pour ceux qui pourraient dépasser la magnitude 16, le script demande à JPL Horizons leurs positions
 * géocentriques et leur magnitude autour du passage ; la vue depuis le lieu (le rayon de la Terre déplace un
 * astéroïde proche de plusieurs degrés) est calculée ici, dans le navigateur : le lieu n'est envoyé nulle part.
 *
 * Seuls Astronomy Engine et lib/time sont importés : scripts/fetch-neo.mjs se sert aussi de ce module.
 */
import * as Astronomy from 'astronomy-engine'
import { deltaT } from '../lib/time.js'

export const CAD_URL = 'https://ssd-api.jpl.nasa.gov/cad.api'
export const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'
export const SOURCE_URL = 'https://cneos.jpl.nasa.gov/ca/'
export const AU_KM = 149_597_870.7
export const LUNAR_DISTANCE_KM = 384_400
export const LD_AU = LUNAR_DISTANCE_KM / AU_KM
export const DIST_MAX_AU = 0.05 // 19,5 distances lunaires
export const PAST_DAYS = 7
export const AHEAD_DAYS = 366
export const NOTABLE_H = 22 // 140 m environ et plus
export const FAINTEST = 16 // pourrait devenir plus brillant : Horizons est consulté
const ALBEDOS = [0.25, 0.05] // surfaces claires et sombres
export const VISIBLE_ALT = 15 // assez haut…
export const DARK_SUN = -12 // …dans un ciel noir
export const WINDOW_DAYS = 2 // les éphémérides : deux jours avant et après le passage
export const STEP_MINUTES = 20

const DEG = Math.PI / 180
const DAY_MS = 86_400_000
const JD_UNIX = 2_440_587.5

/** Un nombre lu dans un texte de l'API ; null pour un texte vide ou illisible. */
const number = (text) => {
  if (text == null || String(text).trim() === '') return null
  const x = Number(text)
  return Number.isFinite(x) ? x : null
}

/** L'incertitude de l'heure à 3 sigmas, « < 00:01 », « 00:14 » ou « 2_19:21 » (j_hh:mm), en minutes. */
export function sigmaMinutes(text) {
  if (!text) return null
  const t = String(text).trim()
  if (t.startsWith('<')) return 0
  const m = /^(?:(\d+)_)?(\d+):(\d+)$/.exec(t)
  if (!m) return null
  return Number(m[1] ?? 0) * 1440 + Number(m[2]) * 60 + Number(m[3])
}

/**
 * « 99942 Apophis » pour « 99942 Apophis (2004 MN4) », « 2026 VP8 » pour « (2026 VP8) » ; « 137108 (1999 AN10) »
 * tel quel (numéroté, sans nom).
 */
export function asteroidName(fullname, designation) {
  const name = String(fullname ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
  if (name.startsWith('(') && name.endsWith(')')) return name.slice(1, -1)
  const named = /^(\d+) ([^(].*?) \([^)]*\)$/.exec(name)
  if (named) return `${named[1]} ${named[2]}`
  return name || designation
}

/** L'instant (UT, à la seconde) d'un jour julien en temps dynamique barycentrique (TDB ≈ TT = UT + ΔT). */
export function utFromTdb(jd) {
  const tdb = (jd - JD_UNIX) * DAY_MS
  const seconds = Math.round((tdb - deltaT(new Date(tdb)) * 1000) / 1000)
  return new Date(seconds * 1000)
}

/** Les paramètres de la demande au CNEOS : d'une semaine avant `now` à un an après, à moins de 0,05 ua. */
export function cadQuery(now) {
  const day = (offset) => new Date(now.getTime() + offset * DAY_MS).toISOString().slice(0, 10)
  return {
    'date-min': day(-PAST_DAYS),
    'date-max': day(AHEAD_DAYS),
    'dist-max': String(DIST_MAX_AU),
    fullname: 'true',
    diameter: 'true',
  }
}

/**
 * Les passages d'une réponse de la Close-Approach Data API, par date : designation, name, date (UT), distanceAu et
 * l'intervalle à 3 sigmas (distanceMinAu, distanceMaxAu), speed (km/s, relative), h (magnitude absolue ou null),
 * diameterKm (mesuré, ou null), sigmaMinutes (incertitude de l'heure à 3 sigmas, ou null), orbit. Les lignes
 * illisibles sont omises.
 */
export function parseCad(payload) {
  const fields = payload?.fields ?? []
  const found = []
  for (const row of payload?.data ?? []) {
    const item = Object.fromEntries(fields.map((field, i) => [field, row[i]]))
    const designation = String(item.des ?? '').trim()
    const jd = number(item.jd)
    const distance = number(item.dist)
    if (!designation || jd == null || distance == null) continue
    found.push({
      designation,
      name: asteroidName(item.fullname, designation),
      date: utFromTdb(jd),
      distanceAu: distance,
      distanceMinAu: number(item.dist_min) || distance,
      distanceMaxAu: number(item.dist_max) || distance,
      speed: number(item.v_rel),
      h: number(item.h),
      diameterKm: number(item.diameter),
      sigmaMinutes: sigmaMinutes(item.t_sigma_f),
      orbit: item.orbit_id ?? null,
    })
  }
  return found.sort((a, b) => a.date - b.date)
}

// ── Ce que les chiffres veulent dire ─────────────────────────────────────────

export const lunarDistances = (au) => au / LD_AU

/** Le plus petit et le plus grand diamètre (m) : le mesuré deux fois, ou d'après H pour les surfaces claires et sombres ; null sans H. */
export function sizeM(approach) {
  if (approach.diameterKm) return [approach.diameterKm * 1000, approach.diameterKm * 1000]
  if (approach.h == null) return null
  return ALBEDOS.map((p) => (1329e3 / Math.sqrt(p)) * 10 ** (-approach.h / 5))
}

/** La magnitude qu'il atteindrait vu plein à son passage : une borne (il l'est rarement) ; null sans H. */
export const bestMagnitude = (approach) => (approach.h == null ? null : approach.h + 5 * Math.log10(approach.distanceAu))

/** Gros (H ≤ 22, 140 m environ et plus) ou plus près que la Lune. */
export const notable = (approach) => approach.distanceAu <= LD_AU || (approach.h != null && approach.h <= NOTABLE_H)

/** Pourrait devenir plus brillant que la magnitude 16 : Horizons vaut d'être consulté. */
export function worthAnEphemeris(approach) {
  const best = bestMagnitude(approach)
  return best != null && best <= FAINTEST
}

/** La clé d'un passage (un astéroïde peut passer deux fois dans l'année). */
export const approachKey = (approach) => `${approach.designation}|${approach.date.toISOString().slice(0, 16)}`

// ── Où on le voit (JPL Horizons) ─────────────────────────────────────────────

/** Le nom d'un petit corps pour Horizons : son numéro (« 99942; ») ou sa désignation (« DES=2016 NV; »). */
export const horizonsCommand = (designation) => (/^\d+$/.test(designation) ? `'${designation};'` : `'DES=${designation};'`)

/**
 * Les paramètres de la demande à Horizons : positions géocentriques (le lieu n'est pas envoyé) et magnitude, de deux
 * jours avant le passage à deux jours après, toutes les 20 minutes.
 */
export function horizonsQuery(approach) {
  const middle = Math.floor(approach.date.getTime() / 60_000) * 60_000
  const stamp = (t) => new Date(t).toISOString().slice(0, 16).replace('T', ' ')
  return {
    format: 'json',
    COMMAND: horizonsCommand(approach.designation),
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    START_TIME: `'${stamp(middle - WINDOW_DAYS * DAY_MS)}'`,
    STOP_TIME: `'${stamp(middle + WINDOW_DAYS * DAY_MS)}'`,
    STEP_SIZE: `'${STEP_MINUTES} m'`,
    QUANTITIES: "'1,9,20'",
    ANG_FORMAT: "'DEG'",
    EXTRA_PREC: "'YES'",
    TIME_TYPE: "'UT'",
    CSV_FORMAT: "'YES'",
  }
}

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }

/**
 * Les lignes d'une table d'observateur d'Horizons (quantités 1, 9, 20 en CSV, UT) : date (UT), ra (heures), dec
 * (degrés), géocentriques et astrométriques (ICRF) ; mag (null quand Horizons n'en donne pas), distanceAu.
 * Une réponse sans table (astéroïde inconnu…) lève une erreur.
 */
export function parseEphemeris(text) {
  const start = text.indexOf('$$SOE')
  const end = text.indexOf('$$EOE')
  if (start < 0 || end < 0) throw new Error(text.split(/\s+/).join(' ').trim().slice(0, 200) || 'pas d’éphémérides')
  const header = text.slice(0, start).split(/\r?\n/).reverse().find((line) => line.includes('Date__(UT)')) ?? ''
  const names = header.split(',').map((c) => c.trim())
  const column = (...prefixes) => {
    const i = names.findIndex((n) => prefixes.some((p) => n.startsWith(p)))
    return i < 0 ? null : i
  }
  const [raI, decI, magI, distI] = [column('R.A.'), column('DEC'), column('APmag', 'T-mag'), column('delta')]
  if (raI == null || decI == null || distI == null) throw new Error('colonnes d’éphémérides inattendues')
  const rows = []
  for (const line of text.slice(start + 5, end).split(/\r?\n/)) {
    const cells = line.split(',').map((c) => c.trim())
    if (cells.length <= Math.max(raI, decI, distI)) continue
    const when = /^(\d{4})-([A-Z][a-z]{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(cells[0])
    const [ra, dec, dist] = [number(cells[raI]), number(cells[decI]), number(cells[distI])]
    if (!when || !(when[2] in MONTHS) || ra == null || dec == null || dist == null) continue
    rows.push({
      date: new Date(Date.UTC(Number(when[1]), MONTHS[when[2]], Number(when[3]), Number(when[4]), Number(when[5]))),
      ra: ra / 15,
      dec,
      mag: magI == null ? null : number(cells[magI]),
      distanceAu: dist,
    })
  }
  return rows
}

/**
 * Les éphémérides vues du lieu : les positions géocentriques ramenées au lieu (la parallaxe d'un astéroïde proche
 * atteint des degrés), puis tournées vers l'horizon (précession, nutation, rotation de la Terre ; sans réfraction,
 * comme Horizons « airless »). Ajoute à chaque ligne alt, az, sun (hauteur du Soleil), ra, dec (vus du lieu,
 * astrométriques), distanceKm (depuis le lieu) et rate (mouvement sur le ciel, en secondes d'arc par minute).
 */
export function seenFrom(rows, observer) {
  const units = []
  const seen = rows.map((r) => {
    const time = Astronomy.MakeTime(r.date)
    const a = r.ra * 15 * DEG
    const d = r.dec * DEG
    const place = Astronomy.ObserverVector(time, observer, false) // équateur J2000, ua
    const topo = [
      r.distanceAu * Math.cos(d) * Math.cos(a) - place.x,
      r.distanceAu * Math.cos(d) * Math.sin(a) - place.y,
      r.distanceAu * Math.sin(d) - place.z,
    ]
    const au = Math.hypot(...topo)
    const unit = topo.map((c) => c / au)
    units.push(unit)
    const { rot } = Astronomy.Rotation_EQJ_HOR(time, observer)
    const north = rot[0][0] * unit[0] + rot[1][0] * unit[1] + rot[2][0] * unit[2]
    const west = rot[0][1] * unit[0] + rot[1][1] * unit[1] + rot[2][1] * unit[2]
    const up = rot[0][2] * unit[0] + rot[1][2] * unit[1] + rot[2][2] * unit[2]
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true)
    return {
      ...r,
      alt: Math.asin(Math.max(-1, Math.min(1, up))) / DEG,
      az: (((Math.atan2(-west, north) / DEG) % 360) + 360) % 360,
      sun: Astronomy.Horizon(time, observer, sunEq.ra, sunEq.dec).altitude,
      ra: (((Math.atan2(unit[1], unit[0]) / DEG / 15) % 24) + 24) % 24,
      dec: Math.asin(unit[2]) / DEG,
      distanceKm: au * AU_KM,
    }
  })
  // le mouvement entre deux lignes, puis la moyenne des deux intervalles autour de chacune
  const steps = seen.slice(1).map((b, i) => {
    const [u, v] = [units[i], units[i + 1]]
    const cosine = Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))
    const minutes = Math.max((b.date - seen[i].date) / 60_000, 1e-9)
    return ((Math.acos(cosine) / DEG) * 3600) / minutes
  })
  return seen.map((row, i) => {
    const before = steps[i - 1] ?? steps[i]
    const after = steps[i] ?? steps[i - 1]
    return { ...row, rate: before == null ? 0 : (before + after) / 2 }
  })
}

/**
 * Les moments des éphémérides où l'astéroïde est assez haut dans un ciel noir : start, end (UT) et best (la ligne
 * où il paraît le plus brillant à travers l'air : sa magnitude plus 0,25 par masse d'air).
 */
export function windows(seen, { minAlt = VISIBLE_ALT, darkSun = DARK_SUN } = {}) {
  const throughTheAir = (row) => (row.mag ?? 0) + 0.25 / Math.sin(row.alt * DEG)
  const found = []
  let current = []
  for (const row of [...seen, null]) {
    if (row && row.alt >= minAlt && row.sun <= darkSun) {
      current.push(row)
      continue
    }
    if (current.length) {
      found.push({
        start: current[0].date,
        end: current.at(-1).date,
        best: current.reduce((a, b) => (throughTheAir(b) < throughTheAir(a) ? b : a)),
      })
      current = []
    }
  }
  return found
}
