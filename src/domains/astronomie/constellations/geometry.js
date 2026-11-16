/**
 * LES 88 CONSTELLATIONS : LIMITES, CENTRE, SUPERFICIE, VOISINES ET VISIBILITÉ
 * --------------------------------------------------------------------------
 * Comme constellation_chart.py de Céleste (4.24). Les limites officielles de l'UAI (E. Delporte, 1930, ramenées à
 * J2000) viennent de data/constellation-bounds.json (de d3-celestial, recopié de Céleste par
 * scripts/sync-celeste-sky.mjs) : pour chaque constellation ses contours fermés (deux pour le Serpent), en heures
 * d'ascension droite et en degrés de déclinaison.
 */
import BOUNDS from '../data/constellation-bounds.json'
import NAMES from '../data/constellations.json'

const DEG = Math.PI / 180
const mod = (a, n) => ((a % n) + n) % n
const plain = (text) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '')

/** L'adresse d'une constellation : son nom français sans accents (« Écu de Sobieski » → « ecu-de-sobieski »). */
export const slugOf = (name) =>
  plain(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Les abréviations de l'UAI des 88 constellations. */
export const KEYS = Object.keys(BOUNDS)

/** Les contours d'une constellation (abréviation de l'UAI). */
export const outlines = (key) => BOUNDS[key] ?? []

/**
 * Les points d'un contour, ses côtés coupés tous les `step` degrés au plus : les limites suivent des parallèles et
 * des cercles horaires, leurs longs côtés se courbent sur une carte.
 */
export function densified(ring, step = 1) {
  const out = []
  for (let k = 0; k < ring.length - 1; k++) {
    const [ra1, d1] = ring[k]
    const [ra2, d2] = ring[k + 1]
    const dra = mod(ra2 - ra1 + 12, 24) - 12 // par le plus court, en heures
    const length = Math.max(Math.abs(dra) * 15 * Math.cos(((d1 + d2) / 2) * DEG), Math.abs(d2 - d1))
    const n = Math.max(1, Math.ceil(length / step))
    for (let j = 0; j < n; j++) out.push([mod(ra1 + (dra * j) / n, 24), d1 + ((d2 - d1) * j) / n])
  }
  out.push(ring.at(-1))
  return out
}

/** Le milieu des contours d'une constellation : { ra (heures), dec (degrés) }. */
export function center(key) {
  let x = 0
  let y = 0
  let z = 0
  for (const ring of outlines(key)) {
    for (const [ra, dec] of densified(ring)) {
      const a = ra * 15 * DEG
      const d = dec * DEG
      x += Math.cos(d) * Math.cos(a)
      y += Math.cos(d) * Math.sin(a)
      z += Math.sin(d)
    }
  }
  return {
    ra: mod(Math.atan2(y, x) / DEG / 15, 24),
    dec: Math.asin(z / Math.hypot(x, y, z)) / DEG,
  }
}

/** La superficie d'une constellation en degrés carrés (la somme de ses contours : le Serpent en a deux). */
export function area(key) {
  let total = 0
  for (const ring of outlines(key)) {
    const points = densified(ring, 0.25)
    let signed = 0
    for (let k = 0; k < points.length - 1; k++) {
      const [ra1, d1] = points[k]
      const [ra2, d2] = points[k + 1]
      const dl = mod((ra2 - ra1) * 15 * DEG + Math.PI, 2 * Math.PI) - Math.PI
      signed += dl * (2 + Math.sin(d1 * DEG) + Math.sin(d2 * DEG))
    }
    // un contour autour d'un pôle ferme la calotte du côté où il tourne : la plus petite des deux
    let steradians = Math.abs(signed / 2)
    if (steradians > 2 * Math.PI) steradians = 4 * Math.PI - steradians
    total += steradians
  }
  return total / DEG / DEG
}

/**
 * Projection stéréographique centrée sur (`ra0` heures, `dec0` degrés) : x vers l'ouest (l'est à gauche, comme dans
 * le ciel), y vers le nord, en rayons de la sphère ; null pour un point à plus de 120° du centre.
 */
export function project(raHours, dec, ra0, dec0) {
  const a = (raHours - ra0) * 15 * DEG
  const d = dec * DEG
  const d0 = dec0 * DEG
  const cosC = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a)
  if (cosC <= -0.5) return null
  const k = 2 / (1 + cosC)
  return [-k * Math.cos(d) * Math.sin(a), k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a))]
}

/**
 * Le mois (1 à 12) où le point d'ascension droite `raHours` est au plus haut à 22 h (temps moyen du lieu) : le temps
 * sidéral de 22 h vaut alors son ascension droite ; il est de 4,70 h le 1er janvier et gagne 3 min 56 s par jour.
 */
export function bestMonth(raHours) {
  const day = mod(raHours - 4.7, 24) / 0.06571
  return Math.min(12, Math.floor(day / 30.44) + 1)
}

/** Les mois, pour « au plus haut à 22 h en … ». */
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** La visibilité d'une constellation depuis une latitude, en mots. */
export const VISIBILITY = { all: 'entière', part: 'en partie', none: 'jamais' }

/** 'all' (toute la constellation se lève à la latitude `latitude`), 'part' ou 'none'. */
export function visibility(key, latitude) {
  const decs = outlines(key).flatMap((ring) => ring.map((p) => p[1]))
  const limit = 90 - Math.abs(latitude) // la calotte de l'autre pôle ne se lève jamais
  const lowest = latitude >= 0 ? Math.min(...decs) : -Math.max(...decs)
  const highest = latitude >= 0 ? Math.max(...decs) : -Math.min(...decs)
  return lowest > -limit ? 'all' : highest < -limit ? 'none' : 'part'
}

let vertexIndex = null
/** Les constellations de chaque sommet des limites (les voisines partagent les mêmes sommets). */
function vertices() {
  if (!vertexIndex) {
    vertexIndex = new Map()
    for (const [key, rings] of Object.entries(BOUNDS)) {
      for (const ring of rings) {
        for (const [ra, dec] of ring) {
          const id = `${ra.toFixed(4)} ${dec.toFixed(4)}`
          if (!vertexIndex.has(id)) vertexIndex.set(id, new Set())
          vertexIndex.get(id).add(key)
        }
      }
    }
  }
  return vertexIndex
}

/** Les voisines d'une constellation : celles qui ont un côté commun avec elle (au moins deux sommets). */
export function neighbours(key) {
  const shared = new Map()
  const index = vertices()
  const seen = new Set()
  for (const ring of outlines(key)) {
    for (const [ra, dec] of ring) {
      const id = `${ra.toFixed(4)} ${dec.toFixed(4)}`
      if (seen.has(id)) continue
      seen.add(id)
      for (const other of index.get(id)) if (other !== key) shared.set(other, (shared.get(other) ?? 0) + 1)
    }
  }
  return [...shared].filter(([, n]) => n >= 2).map(([other]) => other)
}

// Les noms de d3-celestial séparent leurs mots par des espaces typographiques (U+2005) : des espaces ordinaires
const spaced = (text) => text.replace(/\s+/g, ' ')

/** Les 88 constellations, dans l'ordre alphabétique de leur nom français : abréviation, noms, génitif, adresse. */
export const CONSTELLATIONS = [...new Map(NAMES.map((c) => [c.id, c])).values()]
  .filter((c) => BOUNDS[c.id])
  .map((c) => ({
    id: c.id,
    name: spaced(c.fr),
    latin: spaced(c.la),
    genitive: spaced(c.gen),
    slug: slugOf(c.fr),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const BY_KEY = Object.fromEntries(CONSTELLATIONS.map((c) => [c.id, c]))

/** Une constellation par son abréviation (« Ori ») ou son adresse (« orion »). */
export const getConstellation = (key) => BY_KEY[key] ?? CONSTELLATIONS.find((c) => c.slug === key)

/** L'adresse de la page d'une constellation. */
export const constellationPath = (c) => `/astronomie/constellations/${c.slug}`

let facts = null
/** Superficie, rang par la taille (1 : l'Hydre femelle), centre et mois le plus favorable de chaque constellation. */
export function constellationFacts() {
  if (!facts) {
    const rows = CONSTELLATIONS.map((c) => {
      const middle = center(c.id)
      return {
        ...c,
        area: area(c.id),
        center: middle,
        month: bestMonth(middle.ra),
      }
    })
    const ranked = [...rows].sort((a, b) => b.area - a.area)
    ranked.forEach((row, i) => (row.rank = i + 1))
    facts = Object.fromEntries(rows.map((row) => [row.id, row]))
  }
  return facts
}
