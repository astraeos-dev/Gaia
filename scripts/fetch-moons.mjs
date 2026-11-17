/**
 * scripts/fetch-moons.mjs — les lunes de Mars, Saturne, Uranus, Neptune et Pluton, d'après JPL Horizons
 * ===================================================================================================
 * Écrit src/domains/astronomie/data/moons.json, comme scripts/make_moons.py de Céleste : pour chacune des 17 lunes de
 * moons/moons.js, son état (position en km et vitesse en km/s, axes ICRF) par rapport au centre de sa planète, à 0 h
 * TDB de chaque jour, de l'avant-veille à deux mois (les éphémérides de satellites d'Horizons : MAR097, SAT441, URA184,
 * NEP097, PLU060). La page des lunes prolonge l'état le plus proche sur son orbite (moons/moons.js, twoBody).
 *
 * Lancé à chaque construction du site (le déploiement passe chaque jour) ; si Horizons ne répond pas pour une lune, le
 * fichier en place est gardé tel quel (toutes les lunes d'une planète doivent couvrir les mêmes jours).
 *
 *   node scripts/fetch-moons.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HORIZONS_URL, MOONS, parseVectors, vectorsQuery } from '../src/domains/astronomie/moons/moons.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'src', 'domains', 'astronomie', 'data', 'moons.json')
const HEADERS = { 'User-Agent': 'Gaia (github.com/astraeos-dev/Gaia) scripts/fetch-moons.mjs' }
const PAST_DAYS = 2
const AHEAD_DAYS = 62
const DAY_MS = 86_400_000

const day = (offset) => new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10)
const fixed = (x, n) => Number(x.toFixed(n))
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function states(moon, start, stop) {
  const response = await fetch(`${HORIZONS_URL}?${new URLSearchParams(vectorsQuery(moon, start, stop))}`, { headers: HEADERS, signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`${moon.name} : HTTP ${response.status}`)
  return parseVectors(await response.text())
}

export async function main() {
  const [start, stop] = [day(-PAST_DAYS), day(AHEAD_DAYS)]
  const moons = []
  let jd0 = null
  try {
    for (const moon of MOONS) {
      const rows = await states(moon, start, stop)
      if (!rows.length) throw new Error(`${moon.name} : aucun état`)
      if (jd0 == null) jd0 = rows[0][0]
      if (rows[0][0] !== jd0) throw new Error(`${moon.name} : jours décalés`)
      moons.push({
        name: moon.name,
        planet: moon.planet,
        mag: moon.mag,
        states: rows.map(([, x, y, z, vx, vy, vz]) => [fixed(x, 1), fixed(y, 1), fixed(z, 1), fixed(vx, 6), fixed(vy, 6), fixed(vz, 6)]),
      })
      await pause(700) // une demande à la fois, sans presser Horizons
    }
  } catch (error) {
    console.warn(`lunes : ${error.message} ; le fichier en place est gardé`)
    return
  }
  const data = { updated: new Date().toISOString().slice(0, 10), source: 'JPL Horizons (MAR097, SAT441, URA184, NEP097, PLU060)', jd0, moons }
  writeFileSync(OUT, `${JSON.stringify(data)}\n`)
  console.log(`lunes : ${moons.length} lunes, ${moons[0].states.length} jours à partir du ${start}`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
