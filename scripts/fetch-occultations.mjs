/**
 * scripts/fetch-occultations.mjs — les étoiles que des astéroïdes vont cacher, d'après les prédictions de l'IOTA
 * ==============================================================================================================
 * Écrit src/domains/astronomie/data/occultations/<AAAA-MM>.json, un fichier par mois, comme occultations.py de
 * Céleste (4.20) : les évènements de la sélection de l'IOTA (Steve Preston, avec Occult de David Herald,
 * asteroidoccultation.com) de la veille à six mois, avec leurs éléments de Bessel. La page des occultations ne charge
 * que les mois qu'elle montre, Ce soir et le calendrier que le leur ; le lieu n'est envoyé nulle part : les bandes qui
 * passent près de lui sont calculées dans le navigateur (occultations/occultations.js).
 *
 * Chaque fichier : { updated, source, fields, events } où chaque évènement est une ligne de valeurs dans l'ordre de
 * `fields`, pour que le fichier reste petit (environ 400 évènements par mois).
 *
 * Lancé à chaque construction du site (le déploiement passe chaque jour) ; si l'archive d'une année ne se télécharge
 * pas, les fichiers en place de ses mois sont gardés.
 *
 *   node scripts/fetch-occultations.mjs
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { URL_OF_YEAR, parseOccelmnt } from '../src/domains/astronomie/occultations/occultations.js'
import { firstXmlOfZip } from './lib/zip.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DIR = join(ROOT, 'src', 'domains', 'astronomie', 'data', 'occultations')
const HEADERS = { 'User-Agent': 'Gaia (github.com/astraeos-dev/Gaia) scripts/fetch-occultations.mjs' }
const MONTHS = 6
const MAX_ZIP = 16 * 1024 * 1024 // une année fait environ 1 Mo

/** Les champs d'un évènement, dans l'ordre des lignes des fichiers (occultations/data.js les relit). */
export const FIELDS = [
  'middle',
  'number',
  'name',
  'X',
  'Y',
  'dX',
  'dY',
  'd2X',
  'd2Y',
  'd3X',
  'd3Y',
  'substarLon',
  'substarLat',
  'subsolarLon',
  'subsolarLat',
  'star',
  'starMag',
  'ra',
  'dec',
  'ra2000',
  'dec2000',
  'mag',
  'diameterKm',
  'maxDuration',
  'orbit',
]

/** Un évènement en ligne de valeurs (l'orbite réduite à sa source : « JPL#68 »). */
export const eventRow = (e) => [
  e.middle.toISOString(),
  e.number,
  e.name,
  ...e.elements,
  ...e.substar,
  ...e.subsolar,
  e.star,
  e.starMag,
  e.ra,
  e.dec,
  e.ra2000,
  e.dec2000,
  e.mag,
  e.diameterKm,
  e.maxDuration,
  e.orbit.split('+')[0].split(':')[0],
]

const monthOf = (date) => date.toISOString().slice(0, 7)

async function download(year) {
  const response = await fetch(URL_OF_YEAR(year), { headers: HEADERS, signal: AbortSignal.timeout(120_000) })
  if (!response.ok) throw new Error(`${URL_OF_YEAR(year)} : HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > MAX_ZIP) throw new Error(`${URL_OF_YEAR(year)} : archive trop grande`)
  return parseOccelmnt(firstXmlOfZip(buffer))
}

export async function main() {
  const now = new Date()
  const start = new Date(now.getTime() - 86_400_000)
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + MONTHS + 1, 1)) // la fin du sixième mois
  const months = []
  for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push(monthOf(d))
  }
  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))]
  const byMonth = new Map()
  const missing = new Set()
  for (const year of years) {
    try {
      const events = await download(year)
      if (!events.length) throw new Error('aucun évènement')
      for (const e of events) {
        if (e.middle < start || e.middle >= end) continue
        const key = monthOf(e.middle)
        if (!byMonth.has(key)) byMonth.set(key, [])
        byMonth.get(key).push(e)
      }
    } catch (error) {
      missing.add(year) // pas encore publiée, ou pas de connexion : les mois de cette année en place sont gardés
      console.warn(`occultations ${year} : ${error.message}`)
    }
  }
  if (!byMonth.size) {
    console.warn('occultations : aucune prédiction lisible ; les fichiers en place sont gardés')
    return
  }
  mkdirSync(DIR, { recursive: true })
  // les mois passés, et ceux des années téléchargées qui sortent de la période, s'en vont
  for (const file of existsSync(DIR) ? readdirSync(DIR) : []) {
    const key = file.replace(/\.json$/, '')
    if (!/^\d{4}-\d{2}$/.test(key)) continue
    if (key < months[0] || (!missing.has(Number(key.slice(0, 4))) && !months.includes(key))) unlinkSync(join(DIR, file))
  }
  let total = 0
  for (const [key, events] of [...byMonth].sort()) {
    events.sort((a, b) => a.middle - b.middle)
    total += events.length
    const data = {
      updated: now.toISOString().slice(0, 10),
      source: 'IOTA — Steve Preston, Occult de David Herald (asteroidoccultation.com)',
      fields: FIELDS,
      events: events.map(eventRow),
    }
    writeFileSync(join(DIR, `${key}.json`), `${JSON.stringify(data)}\n`)
  }
  console.log(`occultations : ${total} évènements en ${byMonth.size} mois${missing.size ? ` (années manquantes : ${[...missing].join(', ')})` : ''}`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
