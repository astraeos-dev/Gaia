/**
 * LA CARTE D'UNE CONSTELLATION
 * ----------------------------
 * Ce qu'elle dessine, projeté (comme chart() de constellation_chart.py dans Céleste) : son contour officiel et ceux
 * de ses voisines, les figures, les étoiles jusqu'à la magnitude 6,5 avec leurs lettres grecques, les objets du ciel
 * profond et une grille d'ascension droite et de déclinaison, en projection stéréographique centrée sur elle
 * (les formes sont gardées ; l'est à gauche, comme dans le ciel).
 *
 * Données : data/bright-stars.json (Yale Bright Star Catalogue), data/deep-sky.json (OpenNGC),
 * data/constellation-lines.json (les figures du site, de d3-celestial), recopiées de Céleste par
 * scripts/sync-celeste-sky.mjs.
 */
import STARS from '../data/bright-stars.json'
import DEEP_SKY from '../data/deep-sky.json'
import LINES from '../data/constellation-lines.json'
import { KEYS, center, densified, outlines, project } from './geometry'

const DEG = Math.PI / 180

const TYPES = {
  galaxy: 'Galaxie',
  galaxy_group: 'Groupe de galaxies',
  globular_cluster: 'Amas globulaire',
  open_cluster: 'Amas ouvert',
  nebula: 'Nébuleuse',
  planetary_nebula: 'Nébuleuse planétaire',
  supernova_remnant: 'Rémanent de supernova',
  dark_nebula: 'Nébuleuse obscure',
  star_cloud: 'Nuage d’étoiles',
  asterism: 'Astérisme',
  double_star: 'Étoile double',
}

/** Le type d'un objet du ciel profond, en français. */
export const deepSkyType = (type) => TYPES[type] ?? 'Objet'

/** Les étoiles : { i (leur rang dans le fichier), ra, dec (degrés J2000), mag, constellation, label (lettre ou numéro), name }. */
export const BRIGHT_STARS = STARS.stars.map(([ra, dec, mag, constellation, label = '', name = ''], i) => ({
  i,
  ra,
  dec,
  mag,
  constellation,
  label,
  name,
}))

/** Les objets du ciel profond (Messier, Caldwell, et les autres jusqu'à la magnitude 9). */
export const DEEP_SKY_OBJECTS = DEEP_SKY.objects

/** Les étoiles d'une constellation, la plus brillante d'abord. */
export const starsOf = (key) => BRIGHT_STARS.filter((s) => s.constellation === key).sort((a, b) => a.mag - b.mag)

/** Les objets du ciel profond d'une constellation : ceux de Messier d'abord, puis par éclat. */
export const deepSkyOf = (key) =>
  DEEP_SKY_OBJECTS.filter((o) => o.constellation === key).sort(
    (a, b) => (a.m ? 0 : a.c ? 1 : 2) - (b.m ? 0 : b.c ? 1 : 2) || (a.mag ?? 99) - (b.mag ?? 99),
  )

/**
 * Tout ce que dessine la carte de `key` : le cadre `view` (x0, x1, y0, y1 en rayons de la sphère), les lignes
 * projetées (des listes de points [x, y] ; null coupe la ligne), les étoiles, les objets, les noms des voisines, la
 * grille et ses graduations.
 */
export function chartScene(key, { magLimit = 6.5 } = {}) {
  const { ra: ra0, dec: dec0 } = center(key)
  const proj = (raHours, dec) => project(raHours, dec, ra0, dec0)
  const line = (points) => points.map(([ra, dec]) => proj(ra, dec))

  const own = outlines(key).map((ring) => line(densified(ring)))
  const xs = own
    .flat()
    .filter(Boolean)
    .map((p) => p[0])
  const ys = own
    .flat()
    .filter(Boolean)
    .map((p) => p[1])
  const half = (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 18 * DEG) / 2) * 1.18
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2
  const view = { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half }
  const inside = (p, slack = 0) => p && p[0] >= view.x0 - slack && p[0] <= view.x1 + slack && p[1] >= view.y0 - slack && p[1] <= view.y1 + slack
  // Une ligne réduite à ce qui approche du cadre : les morceaux loin du cadre sont coupés
  const clip = (points, slack = 0.1 * half) => {
    const kept = points.map((p) => (inside(p, slack) ? p : null))
    return kept.some(Boolean) ? kept : null
  }

  const scene = {
    key,
    center: { ra: ra0, dec: dec0 },
    view,
    half,
    own,
    neighbours: [],
    names: [],
    lines: [],
    ownLines: [],
    stars: [],
    deepSky: [],
    grid: [],
    gridLabels: [],
  }

  // Les voisines : leurs contours près du cadre, et leur nom au milieu de la partie de leur contour qui s'y voit
  for (const other of KEYS) {
    if (other === key) continue
    const seen = []
    for (const ring of outlines(other)) {
      const points = line(densified(ring))
      if (points.some((p) => inside(p, 2.2 * half))) scene.neighbours.push(clip(points, 0.3 * half))
      seen.push(...points.filter((p) => inside(p, -0.08 * half)))
    }
    if (seen.length)
      scene.names.push({
        key: other,
        x: seen.reduce((s, p) => s + p[0], 0) / seen.length,
        y: seen.reduce((s, p) => s + p[1], 0) / seen.length,
      })
  }
  scene.neighbours = scene.neighbours.filter(Boolean)

  // Les figures (ascensions droites en degrés dans le fichier du site)
  for (const figure of LINES) {
    const target = figure.id === key ? scene.ownLines : scene.lines
    for (const segment of figure.l) {
      const points = segment.map(([ra, dec]) => proj(ra / 15, dec))
      if (points.some((p) => inside(p))) target.push(points)
    }
  }

  // Les étoiles : les siennes nommées par leur lettre grecque, les plus brillantes par leur nom aussi
  for (const s of BRIGHT_STARS) {
    if (s.mag > magLimit) continue
    const p = proj(s.ra / 15, s.dec)
    if (!inside(p)) continue
    const mine = s.constellation === key
    scene.stars.push({
      ...s,
      x: p[0],
      y: p[1],
      own: mine,
      letter: mine ? s.label : '',
      title: mine && s.mag < 2.5 ? s.name : '',
    })
  }

  // Le ciel profond : les objets de Messier et de Caldwell d'abord
  for (const o of DEEP_SKY_OBJECTS) {
    const p = proj(o.ra / 15, o.dec)
    if (!inside(p)) continue
    scene.deepSky.push({
      ...o,
      x: p[0],
      y: p[1],
      own: o.constellation === key,
      named: Boolean(o.m || o.c),
    })
  }
  scene.deepSky.sort((a, b) => (a.m ? 0 : a.c ? 1 : 2) - (b.m ? 0 : b.c ? 1 : 2) || (a.mag ?? 99) - (b.mag ?? 99))

  // La grille : cercles horaires et parallèles, gradués où ils quittent le cadre, en bas et à gauche
  const stepRa = Math.abs(dec0) < 60 ? 1 : 2
  const labelled = []
  for (let h = 0; h < 24; h += stepRa) {
    const points = Array.from({ length: 181 }, (_, i) => proj(h, -90 + i))
    const visible = points.filter((p) => inside(p))
    if (!visible.length) continue
    scene.grid.push(clip(points))
    const low = visible.reduce((a, b) => (b[1] < a[1] ? b : a))
    // gradué seulement s'il sort du cadre par le bas (près d'un pôle, un cercle horaire peut s'arrêter avant)
    if (low[1] - view.y0 < 0.05 * half && labelled.every((x) => Math.abs(low[0] - x) > 0.12 * half)) {
      labelled.push(low[0])
      scene.gridLabels.push({
        kind: 'ra',
        text: `${h} h`,
        x: low[0],
        y: low[1],
      })
    }
  }
  for (let d = -80; d <= 80; d += 10) {
    const points = Array.from({ length: 721 }, (_, i) => proj(i / 30, d))
    const visible = points.filter((p) => inside(p))
    if (!visible.length) continue
    scene.grid.push(clip(points))
    const left = visible.reduce((a, b) => (b[0] < a[0] ? b : a))
    if (left[0] - view.x0 < 0.05 * half)
      scene.gridLabels.push({
        kind: 'dec',
        text: `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}°`,
        x: left[0],
        y: left[1],
      })
  }
  return scene
}
