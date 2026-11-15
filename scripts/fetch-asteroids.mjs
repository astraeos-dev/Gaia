/**
 * scripts/fetch-asteroids.mjs — les astéroïdes brillants et les planètes naines du site, d'après le JPL
 * ====================================================================================================
 * Écrit src/domains/astronomie/data/asteroids.json : les éléments d'orbite osculateurs (base des petits corps du
 * JPL, la même que Céleste) des astéroïdes qui deviennent assez brillants pour une jumelle ou une petite lunette
 * (magnitude 10 ou moins à leurs bonnes oppositions), et des planètes naines au-delà de Neptune, avec leurs
 * paramètres H, G et leur diamètre. Pluton est avec les planètes.
 *
 * Lancé à chaque construction du site ; si le JPL ne répond pas pour l'un d'eux, le fichier en place est gardé.
 *
 *   node scripts/fetch-asteroids.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'src', 'domains', 'astronomie', 'data', 'asteroids.json')
const JPL = (des) => `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(des)}&phys-par=1&full-prec=1`
const HEADERS = { 'User-Agent': 'Gaia (github.com/astraeos-dev/Gaia) scripts/fetch-asteroids.mjs' }

// numéro, nom français, identifiant d'adresse ; les planètes naines à la fin
export const BODIES = [
  [1, 'Cérès', 'ceres'], [2, 'Pallas', 'pallas'], [3, 'Junon', 'junon'], [4, 'Vesta', 'vesta'],
  [5, 'Astrée', 'astree'], [6, 'Hébé', 'hebe'], [7, 'Iris', 'iris'], [8, 'Flore', 'flore'],
  [9, 'Métis', 'metis'], [10, 'Hygie', 'hygie'], [11, 'Parthénope', 'parthenope'], [12, 'Victoria', 'victoria'],
  [14, 'Irène', 'irene'], [15, 'Eunomie', 'eunomie'], [16, 'Psyché', 'psyche'], [18, 'Melpomène', 'melpomene'],
  [19, 'Fortuna', 'fortuna'], [20, 'Massalia', 'massalia'], [27, 'Euterpe', 'euterpe'], [29, 'Amphitrite', 'amphitrite'],
  [39, 'Laetitia', 'laetitia'], [40, 'Harmonia', 'harmonia'], [43, 'Ariane', 'ariane'], [44, 'Nysa', 'nysa'],
  [192, 'Nausicaa', 'nausicaa'], [324, 'Bamberga', 'bamberga'], [349, 'Dembowska', 'dembowska'], [433, 'Éros', 'eros'],
  [532, 'Herculina', 'herculina'],
  [136199, 'Éris', 'eris', true], [136108, 'Hauméa', 'haumea', true], [136472, 'Makémaké', 'makemake', true],
  [90377, 'Sedna', 'sedna', true],
]

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const round = (x, digits) => (x == null ? null : Number(x.toFixed(digits)))

async function body([number, name, id, dwarf]) {
  const response = await fetch(JPL(String(number)), { headers: HEADERS, signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`${name} : HTTP ${response.status}`)
  const data = await response.json()
  const el = Object.fromEntries((data.orbit?.elements ?? []).map((x) => [x.name, num(x.value)]))
  const phys = Object.fromEntries((data.phys_par ?? []).map((x) => [x.name, num(x.value)]))
  if ([el.q, el.e, el.i, el.om, el.w, el.tp].some((v) => v == null)) throw new Error(`${name} : éléments incomplets`)
  const epoch = num(data.orbit.epoch)
  return {
    id,
    number,
    name,
    short: name,
    designation: `(${number}) ${name}`,
    kind: 'asteroid',
    dwarf: Boolean(dwarf),
    orbit: {
      q: el.q,
      e: el.e,
      i: el.i,
      node: el.om,
      peri: el.w,
      tp: round(el.tp, 6),
      epoch: epoch ? new Date((epoch - 2440587.5) * 86_400_000).toISOString().slice(0, 10) : null,
    },
    H: phys.H ?? null,
    G: phys.G ?? null,
    diameter: phys.diameter ?? null,
  }
}

export async function main() {
  const asteroids = []
  try {
    for (const b of BODIES) {
      asteroids.push(await body(b))
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  } catch (error) {
    console.warn(`astéroïdes : ${error.message} ; le fichier en place est gardé`)
    return
  }
  const data = { updated: new Date().toISOString().slice(0, 10), source: 'JPL Small-Body Database', asteroids }
  writeFileSync(OUT, `${JSON.stringify(data, null, 1)}\n`)
  console.log(`astéroïdes : ${asteroids.length} écrits`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
