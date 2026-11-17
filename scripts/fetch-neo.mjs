/**
 * scripts/fetch-neo.mjs — les astéroïdes qui passent près de la Terre, d'après le CNEOS et JPL Horizons
 * ===================================================================================================
 * Écrit src/domains/astronomie/data/neo.json et neo-ephemerides.json, comme neo.py de Céleste (4.20) :
 *  - les passages à moins de 0,05 ua (19,5 distances lunaires) d'une semaine avant à un an après, d'après la
 *    Close-Approach Data API du CNEOS (NASA/JPL) ;
 *  - pour ceux des 60 prochains jours qui pourraient dépasser la magnitude 16 (12 au plus, les plus proches dans le
 *    temps d'abord), les positions géocentriques et la magnitude que donne JPL Horizons, de deux jours avant le
 *    passage à deux jours après, toutes les 20 minutes. Le lieu n'est envoyé nulle part : la vue depuis le lieu est
 *    calculée dans le navigateur (neo/neo.js).
 *
 * Lancé à chaque construction du site (le déploiement passe chaque jour) ; si le CNEOS ne répond pas, les fichiers en
 * place sont gardés et la construction continue. Si Horizons ne répond pas pour un astéroïde, ses éphémérides
 * précédentes sont gardées, ou la raison est notée.
 *
 *   node scripts/fetch-neo.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CAD_URL, HORIZONS_URL, STEP_MINUTES, approachKey, cadQuery, horizonsQuery, parseCad, parseEphemeris, worthAnEphemeris } from '../src/domains/astronomie/neo/neo.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DATA = join(ROOT, 'src', 'domains', 'astronomie', 'data')
const OUT = join(DATA, 'neo.json')
const OUT_EPHEMERIDES = join(DATA, 'neo-ephemerides.json')
const HEADERS = { 'User-Agent': 'Gaia (github.com/astraeos-dev/Gaia) scripts/fetch-neo.mjs' }
const EPHEMERIS_DAYS = 60 // les éphémérides des passages des 60 prochains jours…
const EPHEMERIDES = 12 // …douze au plus, les plus proches dans le temps d'abord
const DAY_MS = 86_400_000

const digits = (x, n) => (x == null || !Number.isFinite(x) ? null : Number(x.toPrecision(n)))
const fixed = (x, n) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(n)))
const stamp = (date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z')
/** Un objet sans ses champs vides (le fichier reste petit). */
const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, v]) => v != null))

/** Un passage tel que le fichier le garde (neo/data.js le relit). */
export const approachRecord = (a) =>
  compact({
    des: a.designation,
    name: a.name !== a.designation ? a.name : null,
    date: stamp(a.date),
    dist: digits(a.distanceAu, 8),
    min: digits(a.distanceMinAu, 6),
    max: digits(a.distanceMaxAu, 6),
    v: fixed(a.speed, 2),
    h: a.h,
    d: a.diameterKm,
    sigma: a.sigmaMinutes,
    orbit: a.orbit,
  })

/** Des éphémérides telles que le fichier les garde : [minutes depuis la première ligne, AD (°), Déc (°), magnitude, distance (ua)]. */
export function ephemerisRecord(rows) {
  const start = rows[0].date
  return {
    start: stamp(start),
    rows: rows.map((r) => [Math.round((r.date - start) / 60_000), fixed(r.ra * 15, 5), fixed(r.dec, 5), fixed(r.mag, 2), digits(r.distanceAu, 9)]),
  }
}

async function get(url, params) {
  const response = await fetch(`${url}?${new URLSearchParams(params)}`, { headers: HEADERS, signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`)
  return response.json()
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function previousEphemerides() {
  try {
    return existsSync(OUT_EPHEMERIDES) ? (JSON.parse(readFileSync(OUT_EPHEMERIDES, 'utf8')).ephemerides ?? {}) : {}
  } catch {
    return {}
  }
}

export async function main() {
  const now = new Date()
  let approaches
  let total
  try {
    const payload = await get(CAD_URL, cadQuery(now))
    if (!payload.fields) throw new Error(payload.message ?? 'réponse inattendue')
    approaches = parseCad(payload)
    total = approaches.length
  } catch (error) {
    console.warn(`géocroiseurs : ${error.message} ; les fichiers en place sont gardés`)
    return
  }

  const kept = previousEphemerides()
  const ephemerides = {}
  const errors = {}
  const wanted = approaches
    .filter((a) => a.date >= new Date(now.getTime() - DAY_MS) && a.date <= new Date(now.getTime() + EPHEMERIS_DAYS * DAY_MS))
    .filter(worthAnEphemeris)
    .slice(0, EPHEMERIDES)
  for (const approach of wanted) {
    const key = approachKey(approach)
    try {
      const payload = await get(HORIZONS_URL, horizonsQuery(approach))
      const rows = parseEphemeris(payload.result ?? payload.error ?? '')
      if (!rows.length) throw new Error('éphémérides vides')
      ephemerides[key] = ephemerisRecord(rows)
    } catch (error) {
      if (kept[key]) ephemerides[key] = kept[key]
      else errors[key] = error.message.slice(0, 200)
    }
    await pause(1000) // une demande à la fois, sans presser Horizons
  }

  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        updated: stamp(now),
        source: 'CNEOS (NASA/JPL), Close-Approach Data API',
        approaches: approaches.map(approachRecord),
      },
      null,
      0,
    )}\n`,
  )
  writeFileSync(
    OUT_EPHEMERIDES,
    `${JSON.stringify({ updated: stamp(now), source: 'JPL Horizons', step: STEP_MINUTES, ephemerides, errors })}\n`,
  )
  console.log(`géocroiseurs : ${total} passages, éphémérides de ${Object.keys(ephemerides).length} (${Object.keys(errors).length} refusées)`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
