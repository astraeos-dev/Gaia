/**
 * scripts/fetch-comets.mjs — les comètes du site, d'après le Minor Planet Center, COBS et le JPL
 * =============================================================================================
 * Écrit src/domains/astronomie/data/comets.json, comme la liste des comètes de Heavens-Above :
 *  - la dernière magnitude observée de chaque comète et sa date (observations des 30 derniers jours de COBS,
 *    au format ICQ), et l'estimation de COBS avec son pic d'éclat prévu ;
 *  - les éléments d'orbite (fichier CometEls.txt du Minor Planet Center, comme Céleste ; à défaut, la base des
 *    petits corps du JPL, qui connaît aussi les anciennes désignations des comètes numérotées depuis).
 *
 * Retenues, comme chez Heavens-Above : les comètes observées à la magnitude 16 ou plus brillante ces 30 derniers
 * jours (l'estimation de COBS seule ne suffit pas : pour une comète que personne n'observe plus, elle peut dater de
 * plusieurs années) ; et celles dont la magnitude prévue par les paramètres du MPC passe sous 12 dans l'année (les
 * prochaines comètes brillantes).
 *
 * Lancé à chaque construction du site (le déploiement passe chaque jour) ; si le MPC ou COBS ne répond pas, le
 * fichier en place est gardé et la construction continue.
 *
 *   node scripts/fetch-comets.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cometPosition, julianDay } from '../src/domains/astronomie/lib/comets.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'src', 'domains', 'astronomie', 'data', 'comets.json')
const MPC = 'https://www.minorplanetcenter.net/iau/MPCORB/CometEls.txt'
const COBS_LIST = 'https://cobs.si/api/comet_list.api?cur-mag=15'
const COBS_OBS = (from) => `https://cobs.si/api/obs_list.api?from_date=${from}`
const JPL = (des) => `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(des)}&phys-par=1&full-prec=1`
const HEADERS = { 'User-Agent': 'Gaia (github.com/astraeos-dev/Gaia) scripts/fetch-comets.mjs' }
const OBSERVED_LIMIT = 16 // dernière magnitude observée
const PREDICTED_LIMIT = 12 // magnitude prévue dans l'année
const DAY_MS = 86_400_000

const round = (x, digits) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(digits)))
const isoDay = (date) => date.toISOString().slice(0, 10)
const numberOrNull = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

/** Les comètes de CometEls.txt (colonnes fixes, comme mpc.py de Céleste) ; les lignes illisibles sont omises. */
export function parseMpc(text) {
  const comets = []
  for (const line of text.split(/\r?\n/)) {
    if (line.length < 102) continue
    const num = (a, b) => numberOrNull(line.slice(a, b).trim())
    const [year, month, day] = [num(14, 18), num(19, 21), num(22, 29)]
    const [q, e, peri, node, i] = [num(30, 39), num(41, 49), num(51, 59), num(61, 69), num(71, 79)]
    if ([year, month, day, q, e, peri, node, i].some((v) => v == null)) continue
    const epoch = line.slice(81, 89).trim()
    comets.push({
      designation: line.slice(102, 158).trim() || line.slice(0, 12).trim(),
      orbit: {
        q,
        e,
        i,
        node,
        peri,
        tp: round(julianDay(year, month, day), 5),
        epoch: /^\d{8}$/.test(epoch) ? `${epoch.slice(0, 4)}-${epoch.slice(4, 6)}-${epoch.slice(6)}` : null,
      },
      H: num(91, 95),
      G: num(96, 100),
      source: 'MPC',
    })
  }
  return comets
}

/** La désignation courte : « 29P », « 73P-B », « C/2026 A2 ». */
export function shortDesignation(designation) {
  const periodic = designation.match(/^(\d+[PDI])(-[A-Z]+)?\//)
  if (periodic) return periodic[1] + (periodic[2] ?? '')
  return designation.split(' (')[0].trim()
}

/** Ce qui relie les sources : « 29P », ou la désignation provisoire sans son type, « 2026 A2 ». */
export const matchKey = (short) => (/^\d+[PDI]/.test(short) ? short : short.replace(/^[A-Z]\//, ''))

/** Le nom de la comète, sans sa désignation : « Schwassmann-Wachmann », « Bok ». */
export function cometName(designation) {
  const paren = designation.match(/\(([^)]+)\)\s*$/)
  if (paren) return paren[1]
  const slash = designation.indexOf('/')
  return /^\d/.test(designation) && slash > 0 ? designation.slice(slash + 1).trim() : ''
}

export const slugOf = (short) => short.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * La désignation d'une observation au format ICQ (ses 11 premiers caractères) : « 161 » → 161P,
 * « P2026T1 » → P/2026 T1, « 2014UNR1 » → C/2014 UN271 (le nombre 271 est compacté en R1, comme au MPC).
 */
export function icqDesignation(field) {
  const s = field.trim()
  const numbered = s.match(/^(\d{1,3})$/)
  if (numbered) return { key: `${Number(numbered[1])}P`, short: `${Number(numbered[1])}P` }
  const prov = s.match(/^([PCDXIA]?)(\d{4})([A-Z]{1,2})([A-Z]?)(\d*)$/)
  if (!prov) return null
  const [, type, year, letters, packed, digits] = prov
  const number = packed ? (packed.charCodeAt(0) - 55) * 10 + Number(digits || 0) : digits ? Number(digits) : ''
  const key = `${year} ${letters}${number}`
  return { key, short: `${type || 'C'}/${key}` }
}

/** La dernière observation (magnitude et date) de chaque comète, dans un relevé ICQ de COBS. */
export function latestObservations(text) {
  const latest = new Map()
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(.{11})(\d{4}) (\d\d) (\d\d)\.(\d+)\s+(\S)\s+(\[?)(\d+\.\d)/)
    if (!m || m[7]) continue // limite (« [ ») : pas une mesure
    const des = icqDesignation(m[1])
    if (!des) continue
    const date = `${m[2]}-${m[3]}-${m[4]}`
    const when = Number(`${m[2]}${m[3]}${m[4]}.${m[5]}`)
    const old = latest.get(des.key)
    if (!old || when > old.when) latest.set(des.key, { ...des, mag: Number(m[8]), date, when })
  }
  return latest
}

/** Une comète de la base du JPL (éléments J2000, paramètres de magnitude M1, K1), ou null. */
async function fromJpl(designation) {
  try {
    const data = await get(JPL(designation), 'json')
    if (!data?.orbit?.elements || data.object?.kind?.[0] !== 'c') return null
    const el = Object.fromEntries(data.orbit.elements.map((x) => [x.name, numberOrNull(x.value)]))
    const phys = Object.fromEntries((data.phys_par ?? []).map((x) => [x.name, numberOrNull(x.value)]))
    if ([el.q, el.e, el.i, el.om, el.w, el.tp].some((v) => v == null)) return null
    const fullname = data.object.fullname
    return {
      designation: data.object.shortname ?? fullname,
      aka: fullname.match(/\(([^)]+)\)$/)?.[1] ?? null,
      orbit: { q: el.q, e: el.e, i: el.i, node: el.om, peri: el.w, tp: round(el.tp, 5), epoch: null },
      H: phys.M1 ?? null,
      G: phys.K1 != null ? round(phys.K1 / 2.5, 3) : null,
      source: 'JPL',
    }
  } catch {
    return null
  }
}

/** La magnitude prévue la plus brillante dans l'année qui suit `now`, tous les cinq jours. */
function predictedPeak(comet, now) {
  if (comet.H == null || comet.G == null) return null
  let peak = null
  for (let d = 0; d <= 365; d += 5) {
    const date = new Date(now.getTime() + d * DAY_MS)
    const { mag } = cometPosition({ ...comet.orbit, H: comet.H, G: comet.G }, date)
    if (mag != null && Number.isFinite(mag) && (!peak || mag < peak.mag)) peak = { mag, date }
  }
  return peak
}

async function get(url, kind) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`)
  return kind === 'json' ? response.json() : response.text()
}

export async function main() {
  const now = new Date()
  let mpc
  let list
  let icq
  try {
    ;[mpc, list, icq] = await Promise.all([
      get(MPC, 'text'),
      get(COBS_LIST, 'json'),
      get(COBS_OBS(isoDay(new Date(now.getTime() - 30 * DAY_MS))), 'text'),
    ])
  } catch (error) {
    console.warn(`comètes : ${error.message} ; le fichier en place est gardé`)
    return
  }
  const observed = latestObservations(icq)
  const estimates = new Map(
    (list.objects ?? [])
      .filter((c) => numberOrNull(c.current_mag) != null)
      .map((c) => {
        const short = c.name + (c.component ? `-${c.component}` : '')
        return [matchKey(short), { ...c, short }]
      }),
  )
  const wanted = (key) => (observed.get(key)?.mag ?? 99) <= OBSERVED_LIMIT

  const known = new Map(parseMpc(mpc).map((c) => [matchKey(shortDesignation(c.designation)), c]))
  // Suivies par COBS mais absentes du fichier du MPC (numérotées depuis, rangées parmi les astéroïdes…) : le JPL
  const missing = [...observed.keys()].filter((key) => wanted(key) && !known.has(key))
  for (const key of missing.slice(0, 20)) {
    const des = estimates.get(key)?.short ?? observed.get(key)?.short ?? key
    const comet = await fromJpl(des)
    if (comet) known.set(key, comet)
  }

  const comets = []
  for (const [key, comet] of known) {
    const peak = predictedPeak(comet, now)
    if (!wanted(key) && !(peak && peak.mag <= PREDICTED_LIMIT)) continue
    const short = shortDesignation(comet.designation)
    const seen = observed.get(key)
    const cobs = estimates.get(key)
    comets.push({
      id: slugOf(short),
      short,
      designation: comet.designation,
      name: cometName(comet.designation),
      aka: comet.aka ?? (cobs && cobs.short !== short ? cobs.short : null),
      orbit: comet.orbit,
      H: comet.H,
      G: comet.G,
      source: comet.source,
      observed: seen ? { mag: seen.mag, date: seen.date } : null,
      cobs: cobs
        ? {
            mag: numberOrNull(cobs.current_mag),
            peak: numberOrNull(cobs.peak_mag),
            peakDate: cobs.peak_mag_date ?? null,
            perihelionMag: numberOrNull(cobs.perihelion_mag),
          }
        : null,
      predictedPeak: peak ? { mag: round(peak.mag, 1), date: isoDay(peak.date) } : null,
    })
  }
  const unique = [...new Map(comets.map((c) => [c.id, c])).values()]
  const brightness = (c) => c.observed?.mag ?? cometPosition({ ...c.orbit, H: c.H, G: c.G }, now).mag ?? 99
  unique.sort((a, b) => brightness(a) - brightness(b))
  const data = {
    updated: isoDay(now),
    sources: {
      orbits: 'Minor Planet Center (CometEls.txt) ; JPL Small-Body Database',
      observations: 'COBS — Comet Observation Database (cobs.si)',
    },
    comets: unique,
  }
  writeFileSync(OUT, `${JSON.stringify(data, null, 1)}\n`)
  console.log(`comètes : ${unique.length} écrites, ${unique.filter((c) => c.observed).length} observées ces 30 jours, ${unique.filter((c) => c.source === 'JPL').length} d'après le JPL`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
