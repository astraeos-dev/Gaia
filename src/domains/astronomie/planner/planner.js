/**
 * QUE VOIR CETTE NUIT : LE PLANIFICATEUR
 * -------------------------------------
 * Comme planner.py de Céleste (4.10), à la manière d'uptonight (github.com/mawinkler/uptonight) : pour une nuit et un
 * lieu, les objets du ciel profond d'un catalogue qui répondent aux contraintes de l'observateur, les planètes et la
 * Lune, et les comètes assez brillantes.
 *
 *  1. la nuit : nuit astronomique (le Soleil à 18° sous l'horizon), ou nautique puis civile là où il ne descend pas
 *     si bas ;
 *  2. chaque cible échantillonnée toutes les 10 minutes de la nuit : hauteur et azimut (réfraction comprise), masque
 *     d'horizon, masse d'air et distance à la Lune ;
 *  3. un objet du ciel profond est retenu quand il est observable (entre les hauteurs limites, sous la masse d'air
 *     limite, assez loin de la Lune et au-dessus du masque d'horizon) une part assez grande de la nuit, et quand sa
 *     taille, son type et sa magnitude passent les filtres ; ceux « à voir » sont toujours montrés (s'ils se lèvent),
 *     ceux « déjà vus » jamais ;
 *  4. les cibles sont classées par cette part de la nuit, puis par leur plus grande hauteur.
 *
 * Catalogue : data/deep-sky.json (OpenNGC, CC BY-SA 4.0) : Messier (110), Caldwell (109) et, pour « tous », les autres
 * objets plus brillants que la magnitude 9.
 */
import { Astronomy, makeJ2000ToHorizon } from '../lib/astro'
import { DEEP_SKY_OBJECTS } from '../constellations/scene'

export const CATALOGS = ['messier', 'caldwell', 'all']

/** Les contraintes, avec leur nom chez uptonight en commentaire. */
export const DEFAULTS = {
  catalog: 'messier',
  altitudeMin: 30, // altitude_constraint_min, degrés
  altitudeMax: 80, // altitude_constraint_max
  airmassMax: 2, // airmass_constraint (sécante de la distance zénithale)
  sizeMin: 10, // size_constraint_min, minutes d'arc
  sizeMax: 300, // size_constraint_max
  fractionMin: 0.5, // fraction_of_time_observable_threshold
  moonSeparationMin: 45, // moon_separation_min, degrés
  moonSeparationFromIllumination: false, // moon_separation_use_illumination : 1 % = 1°
  magnitudeMax: null, // (Céleste) magnitude la plus faible, null pour toutes
  types: [], // type_filter : vide pour tous les types
  maxTargets: 60, // max_number_within_threshold
  cometMagnitudeMax: 12,
}
export const STEP_MINUTES = 10
export const PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
const SIDEREAL_DEG_PER_HOUR = 15.04107
const DEG = Math.PI / 180
const MINUTE = 60_000

// ── Les catalogues ──────────────────────────────────────────────────────────

/** « M31 », « C14 », « NGC 7000 », ou le nom d'une cible de l'observateur. */
export const label = (o) => (o.custom ? o.id : o.m ? `M${o.m}` : o.c ? `C${o.c}` : o.id)

/** Les objets du catalogue `name` (CATALOGS), les cibles de l'observateur à la suite. */
export function catalog(name, custom = []) {
  let objects
  if (name === 'messier') objects = DEEP_SKY_OBJECTS.filter((o) => o.m).sort((a, b) => a.m - b.m)
  else if (name === 'caldwell') objects = DEEP_SKY_OBJECTS.filter((o) => o.c).sort((a, b) => a.c - b.c)
  else objects = [...DEEP_SKY_OBJECTS]
  return [...objects, ...custom]
}

/** Une cible de l'observateur : `ra`, `dec` J2000 en degrés, `size` en minutes d'arc. */
export const customTarget = (name, ra, dec, { type = 'nebula', constellation = '', size = null, mag = null, description = '' } = {}) => ({
  id: String(name),
  label: String(name),
  type,
  ra: ((Number(ra) % 360) + 360) % 360,
  dec: Number(dec),
  constellation,
  mag: mag === '' || mag == null ? null : Number(mag),
  size: size === '' || size == null ? null : Number(size),
  m: null,
  c: null,
  name: description,
  custom: true,
})

const key = (text) => String(text ?? '').toLowerCase().replace(/\s+/g, '')

/** L'objet est-il un de `names` (son étiquette, sa désignation ou son nom) ? */
export function matches(o, names) {
  const keys = new Set(names.map(key))
  return [label(o), o.id, o.name].map(key).some((k) => k && keys.has(k))
}

// ── La nuit ─────────────────────────────────────────────────────────────────

/** La hauteur du Soleil (degrés, sans réfraction) à un instant. */
function sunAltitude(date, observer) {
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true)
  return Astronomy.Horizon(date, observer, eq.ra, eq.dec).altitude
}

/** Le midi local qui ouvre la nuit de `date` (la veille, le matin : la nuit en cours). */
export function nightNoon(date) {
  const local = new Date(date.getTime() - 12 * 3_600_000)
  return new Date(local.getFullYear(), local.getMonth(), local.getDate(), 12)
}

/**
 * La nuit de `date` : du Soleil à `depth` sous l'horizon à son retour, pour la plus sombre des profondeurs qu'il
 * atteint. { kind (« astro », « naut », « civil », ou null pendant le jour polaire), start, end } ; la nuit polaire
 * va de midi à midi.
 */
export function nightWindow(date, observer, depths = [[-18, 'astro'], [-12, 'naut'], [-6, 'civil']]) {
  const noon = nightNoon(date)
  const times = Array.from({ length: 721 }, (_, i) => new Date(noon.getTime() + i * 2 * MINUTE)) // toutes les 2 minutes
  const sun = times.map((t) => sunAltitude(t, observer))
  for (const [depth, kind] of depths) {
    // la plus longue période sous `depth` (une seule, sauf si la fenêtre touche deux nuits)
    let best = null
    let run = null
    sun.forEach((alt, i) => {
      if (alt < depth) {
        run = run ? [run[0], i] : [i, i]
        if (!best || run[1] - run[0] > best[1] - best[0]) best = [...run]
      } else run = null
    })
    if (!best) continue
    const [i0, i1] = best
    const edge = (i, j) => new Date(times[i].getTime() + ((depth - sun[i]) / (sun[j] - sun[i])) * (times[j] - times[i]))
    return {
      kind,
      start: i0 > 0 ? edge(i0 - 1, i0) : times[0],
      end: i1 < times.length - 1 ? edge(i1, i1 + 1) : times.at(-1),
    }
  }
  return { kind: null, start: null, end: null }
}

/** Les instants des échantillons de la nuit, ses deux bouts compris. */
export function grid(window, stepMinutes = STEP_MINUTES) {
  const n = Math.max(2, Math.ceil((window.end - window.start) / (stepMinutes * MINUTE)) + 1)
  return Array.from({ length: n }, (_, i) => new Date(window.start.getTime() + ((window.end - window.start) * i) / (n - 1)))
}

// ── La géométrie ────────────────────────────────────────────────────────────

/** La sécante de la distance zénithale, comme uptonight (infinie sous l'horizon). */
export const airmass = (alt) => (alt > 0 ? 1 / Math.sin(Math.max(alt, 1e-9) * DEG) : Infinity)

/** La hauteur du masque d'horizon à l'azimut `az` : points [azimut, hauteur], interpolés en ligne droite tout autour ; 0 sans points. */
export function horizonAltitude(az, points) {
  if (!points?.length) return 0
  const pts = points.map(([a, h]) => [((a % 360) + 360) % 360, h]).sort((p, q) => p[0] - q[0])
  const ring = [...pts.map(([a, h]) => [a - 360, h]), ...pts, ...pts.map(([a, h]) => [a + 360, h])]
  const x = ((az % 360) + 360) % 360
  for (let i = 1; i < ring.length; i++) {
    const [a0, h0] = ring[i - 1]
    const [a1, h1] = ring[i]
    if (x >= a0 && x <= a1) return a1 === a0 ? h1 : h0 + ((x - a0) / (a1 - a0)) * (h1 - h0)
  }
  return 0
}

/** L'angle entre deux positions (degrés). */
export function separation(ra1, dec1, ra2, dec2) {
  const c = Math.sin(dec1 * DEG) * Math.sin(dec2 * DEG) + Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.cos((ra1 - ra2) * DEG)
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG
}

/** L'ascension droite de la date (degrés) d'une position J2000, à un instant (précession et nutation). */
function raOfDate(raDeg, decDeg, date) {
  const v = Astronomy.VectorFromSphere(new Astronomy.Spherical(decDeg, raDeg, 1), Astronomy.MakeTime(date))
  return Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(date), v)).ra * 15
}

// ── Le plan ─────────────────────────────────────────────────────────────────

/** Ce que les tableaux montrent d'une cible : position au début, point le plus haut, meilleure période, part de la nuit. */
function summary(alt, az, ok, times) {
  let k = 0
  alt.forEach((a, i) => {
    if (a > alt[k]) k = i
  })
  let best = null
  let run = null
  ok.forEach((good, i) => {
    if (good) {
      run = run ? [run[0], i] : [i, i]
      if (!best || run[1] - run[0] > best[1] - best[0]) best = [...run]
    } else run = null
  })
  return {
    altStart: alt[0],
    azStart: az[0],
    altMax: alt[k],
    azMax: az[k],
    timeMax: times[k],
    fraction: ok.filter(Boolean).length / ok.length,
    best: best ? [times[best[0]], times[best[1]]] : null,
    altitudes: alt,
    azimuths: az,
  }
}

/**
 * Le planificateur de nuit. `date` : un instant de la nuit voulue (le matin : la nuit en cours) ; `constraints` : des
 * clés de DEFAULTS ; `horizon` : les points [azimut, hauteur] du masque d'horizon ; `custom` : les cibles de
 * l'observateur ; `bucket`, `done` : les noms des cibles toujours montrées, jamais montrées ; `comets` : les comètes du
 * site ({ name, position(date) → { ra, dec (degrés J2000), mag, earthAu, sunAu } }).
 *
 * Renvoie { window, times, moon: { illumination (%), separationMin }, constraints, deepSky, bodies, comets, considered }.
 */
export function plan(date, observer, { constraints = {}, horizon = [], custom = [], bucket = [], done = [], comets = [], stepMinutes = STEP_MINUTES } = {}) {
  const c = { ...DEFAULTS, ...constraints }
  const window = nightWindow(date, observer)
  const out = { window, constraints: c, horizon, times: [], moon: null, deepSky: [], bodies: [], comets: [], considered: 0 }
  if (window.kind == null) return out
  const times = grid(window, stepMinutes)
  out.times = times
  const middle = times[Math.floor(times.length / 2)]
  const toHorizon = times.map((t) => makeJ2000ToHorizon(t, observer))
  const moon = times.map((t) => Astronomy.Equator(Astronomy.Body.Moon, t, observer, false, true)) // J2000, vue du lieu
  const illumination = 100 * Astronomy.Illumination(Astronomy.Body.Moon, middle).phase_fraction
  const separationMin = c.moonSeparationFromIllumination ? illumination : c.moonSeparationMin
  out.moon = { illumination, separationMin }
  const lastMiddle = (Astronomy.SiderealTime(middle) * 15 + observer.longitude + 720) % 360
  const transit = (raDateDeg) => new Date(middle.getTime() + ((((raDateDeg - lastMiddle + 180) % 360) + 360) % 360 - 180) / SIDEREAL_DEG_PER_HOUR * 3_600_000)
  const above = (alt, az) => alt > horizonAltitude(az, horizon)

  // Le ciel profond
  const objects = catalog(c.catalog, custom).filter((o) => !(done.length && matches(o, done)))
  const types = new Set(c.types ?? [])
  const passes = (o) => {
    if (o.size != null && !(o.size >= c.sizeMin && o.size <= c.sizeMax)) return false
    if (o.size == null && c.sizeMin > 0 && !o.custom) return false
    if (types.size && !types.has(o.type)) return false
    if (c.magnitudeMax != null && (o.mag == null || o.mag > c.magnitudeMax)) return false
    return true
  }
  const candidates = objects.map((o) => ({ o, wanted: bucket.length > 0 && matches(o, bucket) })).filter(({ o, wanted }) => wanted || passes(o))
  out.considered = candidates.length
  const rated = candidates.map(({ o, wanted }) => {
    const alt = []
    const az = []
    const ok = []
    let moonSep = Infinity
    let rises = false
    times.forEach((_, i) => {
      const h = toHorizon[i](o.ra, o.dec)
      const sep = separation(o.ra, o.dec, moon[i].ra * 15, moon[i].dec)
      moonSep = Math.min(moonSep, sep)
      alt.push(h.alt)
      az.push(h.az)
      const visible = above(h.alt, h.az)
      rises ||= visible && h.alt > 0
      ok.push(h.alt >= c.altitudeMin && h.alt <= c.altitudeMax && airmass(h.alt) <= c.airmassMax && visible && sep >= separationMin)
    })
    return { o, wanted, alt, az, ok, rises, moonSep, fraction: ok.filter(Boolean).length / ok.length }
  })
  const chosen = rated
    .filter((r) => (r.fraction >= c.fractionMin && r.fraction > 0) || (r.wanted && r.rises))
    .sort((a, b) => b.fraction - a.fraction || Math.max(...b.alt) - Math.max(...a.alt))
  const inBucket = chosen.filter((r) => r.wanted)
  const others = chosen.filter((r) => !r.wanted).slice(0, Math.max(0, c.maxTargets))
  const kept = new Set([...inBucket, ...others])
  out.deepSky = chosen
    .filter((r) => kept.has(r))
    .map((r) => ({
      ...r.o,
      label: label(r.o),
      bucket: r.wanted,
      transit: transit(raOfDate(r.o.ra, r.o.dec, middle)),
      moonSeparation: r.moonSep,
      ...summary(r.alt, r.az, r.ok, times),
    }))

  // La Lune et les planètes qui passent au-dessus du masque d'horizon pendant la nuit
  for (const body of ['Moon', ...PLANETS]) {
    const alt = []
    const az = []
    const up = []
    for (const t of times) {
      const eq = Astronomy.Equator(body, t, observer, true, true)
      const h = Astronomy.Horizon(t, observer, eq.ra, eq.dec)
      alt.push(h.altitude)
      az.push(h.azimuth)
      up.push(above(h.altitude, h.azimuth) && h.altitude > 0)
    }
    if (!up.some(Boolean)) continue
    const eqMiddle = Astronomy.Equator(body, middle, observer, true, true)
    out.bodies.push({
      body,
      mag: body === 'Moon' ? null : Astronomy.Illumination(body, middle).mag,
      transit: transit(eqMiddle.ra * 15),
      ...summary(alt, az, up, times),
    })
  }

  // Les comètes plus brillantes que cometMagnitudeMax, au-dessus du masque quand le Soleil est à 6° sous l'horizon
  const civil = nightWindow(date, observer, [[-6, 'civil']])
  if (civil.kind && comets.length) {
    const civilTimes = grid(civil, 15)
    const civilMiddle = civilTimes[Math.floor(civilTimes.length / 2)]
    const civilHorizon = civilTimes.map((t) => makeJ2000ToHorizon(t, observer))
    for (const comet of comets) {
      const p = comet.position(civilMiddle)
      if (p.mag == null || !(p.mag <= c.cometMagnitudeMax)) continue
      const alt = []
      const az = []
      const up = []
      civilTimes.forEach((t, i) => {
        const h = civilHorizon[i](p.ra, p.dec) // la comète bouge peu en une nuit
        alt.push(h.alt)
        az.push(h.az)
        up.push(above(h.alt, h.az) && h.alt > 0)
      })
      if (!up.some(Boolean)) continue
      const s = summary(alt, az, up, civilTimes)
      const rise = civilTimes.find((t, i) => i > 0 && up[i] && !up[i - 1]) ?? null
      const set = civilTimes.find((t, i) => i > 0 && up[i - 1] && !up[i]) ?? null
      out.comets.push({ ...comet, mag: p.mag, earthAu: p.earthAu, sunAu: p.sunAu, rise, set, ...s })
    }
    out.comets.sort((a, b) => a.mag - b.mag)
  }
  return out
}

/** Le plan en JSON, comme le rapport d'uptonight : les heures en UT. */
export function reportJson(result, place = '') {
  const iso = (d) => (d ? `${d.toISOString().slice(0, 19)}Z` : null)
  const round = (x) => (typeof x === 'number' ? Math.round(x * 10_000) / 10_000 : x)
  const pick = (item, keys) => Object.fromEntries(keys.map((k) => [k, item[k] instanceof Date ? iso(item[k]) : Array.isArray(item[k]) && item[k][0] instanceof Date ? item[k].map(iso) : round(item[k] ?? null)]))
  return JSON.stringify(
    {
      place,
      night: { kind: result.window.kind, start: iso(result.window.start), end: iso(result.window.end) },
      moon: result.moon,
      constraints: result.constraints,
      horizon: result.horizon,
      deep_sky: result.deepSky.map((o) => pick(o, ['label', 'id', 'name', 'type', 'constellation', 'mag', 'size', 'ra', 'dec', 'altStart', 'azStart', 'altMax', 'timeMax', 'transit', 'fraction', 'best', 'moonSeparation', 'bucket'])),
      bodies: result.bodies.map((b) => pick(b, ['body', 'mag', 'altMax', 'azMax', 'timeMax', 'transit', 'fraction'])),
      comets: result.comets.map((c) => pick(c, ['name', 'mag', 'earthAu', 'sunAu', 'altStart', 'azStart', 'altMax', 'rise', 'set', 'fraction'])),
    },
    null,
    2,
  )
}
