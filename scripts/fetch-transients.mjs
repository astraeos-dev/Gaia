/**
 * scripts/fetch-transients.mjs — les novae et les supernovae du moment, d'après David Bishop et Koji Mukai
 * ======================================================================================================
 * Écrit src/domains/astronomie/data/transients.json, comme transients.py de Céleste (4.21) :
 *  - les supernovae (et les novae d'autres galaxies) plus brillantes que la magnitude 17,5 de la page des objets
 *    actifs de « Latest Supernovae » (rochesterastronomy.org) ; quand elle est vide, la page principale du site ;
 *  - les novae de notre galaxie des deux dernières années de la « List of Recent Galactic Novae » de Koji Mukai
 *    (NASA Goddard).
 * Les deux listes sont gardées séparément : la page les réunit (transients/transients.js, merge). Celle qui ne se lit
 * pas est gardée telle que la construction précédente l'a laissée.
 *
 * Lancé à chaque construction du site (le déploiement passe chaque jour).
 *
 *   node scripts/fetch-transients.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NOVAE_URL, NOVA_DAYS, SUPERNOVAE_PAGE, SUPERNOVAE_URL, addDaysIso, parseNovae, parseSupernovaPage, parseSupernovae } from '../src/domains/astronomie/transients/transients.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'src', 'domains', 'astronomie', 'data', 'transients.json')
const HEADERS = { 'User-Agent': 'Gaia (github.com/astraeos-dev/Gaia) scripts/fetch-transients.mjs' }
const MAX_PAGE = 16 * 1024 * 1024 // la page principale des supernovae fait 3 Mo

const fixed = (x, n) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(n)))
/** Un objet tel que le fichier le garde : positions arrondies (0,04″), champs vides omis. */
const record = (o) =>
  Object.fromEntries(Object.entries({ ...o, ra: fixed(o.ra, 7), dec: fixed(o.dec, 6) }).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length)))

async function get(url) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`)
  const text = await response.text()
  if (text.length > MAX_PAGE) throw new Error(`${url} : page trop grande`)
  return text
}

function previous() {
  try {
    return existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null
  } catch {
    return null
  }
}

/** Une liste lue par `read`, ou celle de la construction précédente avec la raison de l'échec. */
async function list(name, read, kept) {
  try {
    const { objects, from } = await read()
    if (!objects.length) throw new Error('aucun objet')
    return { objects, source: { from, updated: new Date().toISOString().slice(0, 10) } }
  } catch (error) {
    console.warn(`${name} : ${error.message} ; la liste précédente est gardée`)
    return { objects: kept?.[name] ?? [], source: { ...(kept?.sources?.[name] ?? {}), error: error.message.slice(0, 200) } }
  }
}

export async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const kept = previous()
  const supernovae = await list(
    'supernovae',
    async () => {
      const active = parseSupernovae(await get(SUPERNOVAE_URL))
      if (active.length) return { objects: active, from: SUPERNOVAE_URL }
      return { objects: parseSupernovaPage(await get(SUPERNOVAE_PAGE), today), from: SUPERNOVAE_PAGE }
    },
    kept,
  )
  const novae = await list('novae', async () => ({ objects: parseNovae(await get(NOVAE_URL), addDaysIso(today, -NOVA_DAYS)), from: NOVAE_URL }), kept)
  if (!supernovae.objects.length && !novae.objects.length) {
    console.warn('novae et supernovae : aucune liste lisible ; le fichier en place est gardé')
    return
  }
  const data = {
    updated: today,
    sources: { supernovae: supernovae.source, novae: novae.source },
    supernovae: supernovae.objects.map(record),
    novae: novae.objects.map(record),
  }
  writeFileSync(OUT, `${JSON.stringify(data, null, 1)}\n`)
  console.log(`novae et supernovae : ${data.supernovae.length} supernovae et novae d'autres galaxies, ${data.novae.length} novae de notre galaxie`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
