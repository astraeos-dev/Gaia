/**
 * Calcul et dessin de la carte du ciel (projection stéréographique centrée sur le zénith,
 * horizon sur le cercle extérieur, nord en haut et est à gauche comme lorsqu'on lève les yeux).
 * Les couleurs sont celles de la carte du ciel de Céleste (charts.py, draw_sky_map), dans le thème de la page :
 * étoiles et planètes à l'encre, objets Messier en lune, Lune en lune, Soleil en or.
 */
import STARS from '../data/stars.json'
import STAR_NAMES from '../data/star-names.json'
import CONSTELLATIONS from '../data/constellations.json'
import LINES from '../data/constellation-lines.json'
import MESSIER from '../data/messier.json'
import { Astronomy, BODIES, bodyPosition, constellationAt, makeJ2000ToHorizon, moonInfo } from '../lib/astro'
import { canvasPalette } from '../../../kit/charte'

const NAME_BY_INDEX = new Map(STAR_NAMES)
const DEG = Math.PI / 180
const OBLIQUITY = 23.4392911 * DEG

/** Coordonnées horizontales de tout ce qui est affichable, pour un instant et un lieu. */
export function computeScene(date, observer) {
  const toHor = makeJ2000ToHorizon(date, observer)

  const stars = STARS.map(([ra, dec, mag, bv], i) => {
    const { alt, az } = toHor(ra, dec)
    return { i, ra, dec, mag, bv, alt, az, name: NAME_BY_INDEX.get(i) }
  })

  const lines = LINES.map((c) => ({ id: c.id, segments: c.l.map((seg) => seg.map(([ra, dec]) => toHor(ra, dec))) }))

  const labels = CONSTELLATIONS.map((c) => ({ ...c, ...toHor(c.ra, c.dec) }))

  const messier = MESSIER.map((m) => ({ ...m, ...toHor(m.ra, m.dec) }))

  const ecliptic = []
  for (let l = 0; l <= 360; l += 4) {
    const lam = l * DEG
    const ra = Math.atan2(Math.sin(lam) * Math.cos(OBLIQUITY), Math.cos(lam)) / DEG
    const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(lam)) / DEG
    ecliptic.push(toHor((ra + 360) % 360, dec))
  }
  const equator = []
  for (let ra = 0; ra <= 360; ra += 4) equator.push(toHor(ra, 0))

  const bodies = BODIES.map((b) => {
    const pos = bodyPosition(b.id, date, observer)
    const mag = Astronomy.Illumination(b.id, date).mag
    const eqj = Astronomy.Equator(b.id, date, observer, false, true)
    return { ...b, ...pos, mag, ra2000: eqj.ra, dec2000: eqj.dec }
  })
  const moon = moonInfo(date)
  const sun = bodies.find((b) => b.id === 'Sun')

  return { stars, lines, labels, messier, ecliptic, equator, bodies, moonPhase: moon.phase, sunAlt: sun.alt }
}

/** Fabrique la projection (alt, az) → pixels pour un canevas de taille donnée. */
export function makeProjection(size, rotationDeg = 0) {
  const cx = size / 2
  const cy = size / 2
  const R = size / 2 - Math.max(22, size * 0.045)
  const rot = rotationDeg * DEG
  return {
    cx,
    cy,
    R,
    project(alt, az) {
      const r = R * Math.tan(((90 - alt) * DEG) / 2)
      const a = az * DEG + rot
      return [cx - r * Math.sin(a), cy - r * Math.cos(a)]
    },
  }
}

/** Part de lune dans le fond du ciel selon la hauteur du Soleil : les teintes des phases du jour de Céleste. */
const skyTint = (sunAlt) => (sunAlt > 0 ? 0.26 : sunAlt > -6 ? 0.17 : sunAlt > -12 ? 0.1 : sunAlt > -18 ? 0.05 : 0)

const SANS = '"IBM Plex Sans", sans-serif'
const MONO = '"IBM Plex Mono", monospace'

const CARDINALS = [
  ['N', 0],
  ['NE', 45],
  ['E', 90],
  ['SE', 135],
  ['S', 180],
  ['SO', 225],
  ['O', 270],
  ['NO', 315],
]

/**
 * Dessine la scène. Retourne la liste des cibles cliquables { x, y, r, info }.
 * options : { magLimit, lines, constellationNames, starNames, planets, messier, grid, ecliptic, rotation, selected }
 */
export function drawScene(ctx, size, scene, options) {
  const { cx, cy, R, project } = makeProjection(size, options.rotation)
  const targets = []
  const scale = size / 700
  const pal = canvasPalette()
  ctx.clearRect(0, 0, size, size)

  // Fond du ciel : ciel-000, teinté de lune le jour et aux crépuscules
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fillStyle = pal.mix('lune', 'ciel-000', skyTint(scene.sunAlt))
  ctx.fill()
  ctx.clip()

  const polyline = (points, minAlt = -10) => {
    let started = false
    ctx.beginPath()
    for (const p of points) {
      if (p.alt < minAlt) {
        started = false
        continue
      }
      const [x, y] = project(p.alt, p.az)
      if (started) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
      started = true
    }
    ctx.stroke()
  }

  // Grille alt-azimutale
  if (options.grid) {
    ctx.strokeStyle = pal.color('ciel-200')
    ctx.lineWidth = 1
    for (const alt of [30, 60]) {
      const r = R * Math.tan(((90 - alt) * DEG) / 2)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (let az = 0; az < 360; az += 30) {
      const [x, y] = project(0, az)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  // Équateur céleste et écliptique
  if (options.ecliptic) {
    ctx.setLineDash([6 * scale, 6 * scale])
    ctx.strokeStyle = pal.color('or', 0.6)
    ctx.lineWidth = 1.2
    polyline(scene.ecliptic)
    ctx.strokeStyle = pal.color('lune', 0.5)
    polyline(scene.equator)
    ctx.setLineDash([])
  }

  // Tracés des constellations
  if (options.lines) {
    ctx.strokeStyle = pal.color('encre-attenuee', 0.4)
    ctx.lineWidth = 1
    for (const c of scene.lines) for (const seg of c.segments) polyline(seg, -5)
  }

  // Objets Messier
  if (options.messier) {
    ctx.strokeStyle = pal.color('lune', 0.85)
    ctx.fillStyle = pal.color('lune', 0.85)
    ctx.lineWidth = 1
    ctx.font = `${Math.round(10 * Math.max(scale, 0.8))}px ${MONO}`
    for (const m of scene.messier) {
      if (m.alt < 0) continue
      const [x, y] = project(m.alt, m.az)
      ctx.beginPath()
      ctx.arc(x, y, 3.5 * Math.max(scale, 0.8), 0, Math.PI * 2)
      ctx.stroke()
      if (options.starNames) ctx.fillText(m.id, x + 5, y - 4)
      targets.push({ x, y, r: 8, kind: 'messier', obj: m })
    }
  }

  // Étoiles à l'encre, plus pâles quand elles sont faibles, un halo autour des plus brillantes
  // (les plus faibles d'abord pour que les brillantes passent devant)
  const starScale = Math.max(scale, 0.7)
  for (let k = scene.stars.length - 1; k >= 0; k--) {
    const s = scene.stars[k]
    if (s.alt < 0 || s.mag > options.magLimit) continue
    const [x, y] = project(s.alt, s.az)
    const r = Math.max(0.55, (options.magLimit + 0.6 - s.mag) * 0.62) * starScale
    if (s.mag < 1) {
      ctx.beginPath()
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2)
      ctx.fillStyle = pal.color('encre', 0.1)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = pal.color('encre', Math.min(1, Math.max(0.45, 1 - s.mag / 7)))
    ctx.fill()
    if (s.mag < 4.5 || s.name) targets.push({ x, y, r: Math.max(r + 3, 6), kind: 'star', obj: s })
  }

  // Noms des constellations
  if (options.constellationNames) {
    ctx.textAlign = 'center'
    for (const c of scene.labels) {
      if (c.alt < 3 || (c.rank > 2 && size < 520)) continue
      const [x, y] = project(c.alt, c.az)
      ctx.font = `${c.rank === 1 ? 600 : 400} ${Math.round((c.rank === 1 ? 11 : 10) * Math.max(scale, 0.85))}px ${SANS}`
      ctx.fillStyle = pal.color('encre-attenuee', c.rank === 1 ? 0.85 : 0.6)
      ctx.fillText(c.fr.toUpperCase(), x, y)
    }
    ctx.textAlign = 'left'
  }

  // Noms des étoiles brillantes
  if (options.starNames) {
    ctx.font = `${Math.round(11 * Math.max(scale, 0.85))}px ${SANS}`
    ctx.fillStyle = pal.color('encre-attenuee')
    for (const s of scene.stars) {
      if (!s.name || s.alt < 1 || s.mag > Math.min(options.magLimit, size < 520 ? 1.6 : 2.3)) continue
      const [x, y] = project(s.alt, s.az)
      ctx.fillText(s.name, x + 5, y + 11)
    }
  }

  // Soleil (or), Lune (lune) et planètes (encre)
  if (options.planets) {
    for (const b of scene.bodies) {
      if (b.alt < -1) continue
      const [x, y] = project(b.alt, b.az)
      const color = pal.color(b.id === 'Sun' ? 'or' : b.id === 'Moon' ? 'lune' : 'encre')
      let r
      if (b.id === 'Sun') {
        r = 9 * starScale
        ctx.beginPath()
        ctx.arc(x, y, r * 1.8, 0, Math.PI * 2)
        ctx.fillStyle = pal.color('or', 0.25)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      } else if (b.id === 'Moon') {
        r = 9 * starScale
        drawMoon(ctx, x, y, r, scene.moonPhase, pal)
      } else {
        r = Math.max(2.5, Math.min(5.5, 4.5 - b.mag * 0.5)) * starScale
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = pal.color('ciel-000', 0.6)
        ctx.stroke()
      }
      ctx.font = `600 ${Math.round(12 * Math.max(scale, 0.85))}px ${SANS}`
      ctx.fillStyle = color
      ctx.fillText(b.name, x + r + 4, y - r)
      targets.push({ x, y, r: r + 6, kind: 'body', obj: b, priority: 2 })
    }
  }

  // Sélection
  if (options.selected) {
    const sel = options.selected
    if (sel.alt > -1) {
      const [x, y] = project(sel.alt, sel.az)
      ctx.strokeStyle = pal.color('or')
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 12 * starScale, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()

  // Horizon et points cardinaux (le nord à l'encre, les autres en encre atténuée)
  ctx.strokeStyle = pal.color('encre-attenuee')
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const [label, az] of CARDINALS) {
    const main = label.length === 1
    const r = R + (size / 2 - R) / 2
    const a = az * DEG + options.rotation * DEG
    ctx.font = `${main ? 600 : 400} ${Math.round((main ? 14 : 10) * Math.max(scale, 0.85))}px ${MONO}`
    ctx.fillStyle = pal.color(label === 'N' ? 'encre' : 'encre-attenuee')
    ctx.fillText(label, cx - r * Math.sin(a), cy - r * Math.cos(a))
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  return targets
}

/** La Lune éclairée selon sa phase : face sombre en ciel-200, partie éclairée et contour en lune (comme Céleste). */
function drawMoon(ctx, x, y, r, phase, pal) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = pal.color('ciel-200')
  ctx.fill()
  ctx.strokeStyle = pal.color('lune')
  ctx.lineWidth = 1.2
  ctx.stroke()
  const p = phase * DEG
  const rx = Math.abs(Math.cos(p)) * r
  const waxing = phase < 180
  const gibbous = Math.cos(p) < 0
  ctx.beginPath()
  // Bord éclairé (demi-disque) puis terminateur elliptique
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing)
  ctx.ellipse(x, y, rx, r, 0, Math.PI / 2, -Math.PI / 2, waxing ? !gibbous : gibbous)
  ctx.fillStyle = pal.color('lune')
  ctx.fill()
}

/** Description d'un objet pointé (pour le panneau d'information). */
export function describe(target) {
  const o = target.obj
  // Les constellations se déterminent en coordonnées J2000 (RA en heures).
  const cst = (raHours, dec) => constellationAt(raHours, dec).name
  if (target.kind === 'body') {
    return {
      title: o.name,
      subtitle: o.id === 'Sun' ? 'Étoile' : o.id === 'Moon' ? 'Satellite naturel' : 'Planète',
      mag: o.mag,
      alt: o.alt,
      az: o.az,
      raHours: o.ra,
      dec: o.dec,
      constellation: cst(o.ra2000, o.dec2000),
      distance: o.dist,
      ref: o,
    }
  }
  if (target.kind === 'messier') {
    return {
      title: `${o.id}${o.nom ? ` — ${o.nom}` : ''}`,
      subtitle: `${o.type}${o.ngc ? ` · ${o.ngc}` : ''}`,
      mag: o.mag,
      alt: o.alt,
      az: o.az,
      raHours: o.ra / 15,
      dec: o.dec,
      constellation: cst(o.ra / 15, o.dec),
      ref: o,
    }
  }
  return {
    title: o.name ?? 'Étoile',
    subtitle: 'Étoile',
    mag: o.mag,
    alt: o.alt,
    az: o.az,
    raHours: o.ra / 15,
    dec: o.dec,
    constellation: cst(o.ra / 15, o.dec),
    ref: o,
  }
}
