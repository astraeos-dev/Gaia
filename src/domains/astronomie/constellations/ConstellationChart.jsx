import { useEffect, useMemo, useRef, useState } from 'react'
import { CIEL_100, CIEL_200, ENCRE, ENCRE_ATTENUEE, LUNE, OR } from '../../../kit/charte'
import { getConstellation, project } from './geometry'
import { chartScene, deepSkyType } from './scene'

const SIZE = 900
const NO_MARKS = []
const decimal = (x, digits = 1) => x.toFixed(digits).replace('.', ',')

/** Rayon d'une étoile sur la carte, selon son éclat. */
const starRadius = (mag) => Math.max(0.75, (7 - mag) * 0.62)

/** Le tracé SVG d'une ligne projetée (null coupe la ligne). */
function pathOf(points, X, Y) {
  let d = ''
  let pen = false
  for (const p of points) {
    if (!p) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`
    pen = true
  }
  return d
}

/**
 * Les étiquettes à leur place, sans se chevaucher : chacune, de la plus importante à la moins importante, prend la
 * première de ses places libres (à droite de son point, puis à gauche), ou n'est pas écrite (comme declutter() de
 * Céleste). La largeur d'un texte est estimée d'après son nombre de signes.
 */
function placeLabels(candidates) {
  const taken = []
  const placed = []
  for (const c of candidates) {
    const width = c.text.length * c.size * (c.caps ? 0.74 : 0.62)
    for (const [dx, dy, anchor] of c.places) {
      const x = c.x + dx
      const y = c.y + dy
      const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2
      const box = [left - 1, y - c.size * 0.82, left + width + 1, y + c.size * 0.22]
      if (box[0] < 2 || box[2] > SIZE - 2 || box[1] < 2 || box[3] > SIZE - 18) continue
      if (taken.some((t) => box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1])) continue
      taken.push(box)
      placed.push({ ...c, x, y, anchor })
      break
    }
  }
  return placed
}

/** Le symbole d'un objet du ciel profond, comme sur les atlas : ellipse, cercles, carré ou croix. */
function DeepSkySymbol({ type, x, y, opacity }) {
  const style = { stroke: LUNE, fill: 'none' }
  const common = { style, strokeWidth: 1.3, strokeOpacity: opacity }
  if (type === 'galaxy' || type === 'galaxy_group') return <ellipse cx={x} cy={y} rx="6.5" ry="3.2" {...common} />
  if (type === 'open_cluster') return <circle cx={x} cy={y} r="5.5" strokeDasharray="2.2 1.8" {...common} />
  if (type === 'globular_cluster')
    return (
      <g {...common}>
        <circle cx={x} cy={y} r="5" />
        <path d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`} />
      </g>
    )
  if (type === 'planetary_nebula')
    return (
      <g {...common}>
        <circle cx={x} cy={y} r="3.4" />
        <path d={`M${x - 6.5} ${y}H${x - 3.4}M${x + 3.4} ${y}H${x + 6.5}M${x} ${y - 6.5}V${y - 3.4}M${x} ${y + 3.4}V${y + 6.5}`} />
      </g>
    )
  if (type === 'nebula' || type === 'supernova_remnant' || type === 'dark_nebula')
    return <rect x={x - 4.5} y={y - 4.5} width="9" height="9" {...common} />
  return <path d={`M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x - 4} ${y + 4}L${x + 4} ${y - 4}`} {...common} />
}

/** La légende des symboles, sous la carte. */
export function ChartLegend() {
  const items = [
    ['galaxy', 'Galaxie'],
    ['open_cluster', 'Amas ouvert'],
    ['globular_cluster', 'Amas globulaire'],
    ['nebula', 'Nébuleuse'],
    ['planetary_nebula', 'Nébuleuse planétaire'],
    ['asterism', 'Autre'],
  ]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-night-600 dark:text-night-400">
      {items.map(([type, label]) => (
        <li key={type} className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <DeepSkySymbol type={type} x={8} y={8} opacity={1} />
          </svg>
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">
          <path d="M1 5H21" style={{ stroke: OR }} strokeWidth="1.6" strokeDasharray="5 3" />
        </svg>
        Limite officielle
      </li>
    </ul>
  )
}

/**
 * La carte d'une constellation, comme dans les atlas et sur In-The-Sky : son contour officiel en tirets dorés, sa
 * figure, ses étoiles jusqu'à la magnitude 6,5 avec leurs lettres grecques et le nom des plus brillantes, ses objets
 * du ciel profond, ses voisines en plus pâle, et la grille d'ascension droite et de déclinaison. L'est est à gauche,
 * comme dans le ciel. `marks` : des points à repérer ({ ra, dec (degrés), label }), entourés d'un cercle doré.
 */
export default function ConstellationChart({ constellation, marks = NO_MARKS }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(SIZE)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || SIZE))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // Les textes grandissent quand la carte rapetisse (un téléphone) : lisibles, quitte à en écrire moins
  const k = Math.min(2.2, Math.max(1, 700 / width))

  const chart = useMemo(() => {
    const scene = chartScene(constellation.id)
    const { view } = scene
    const scale = SIZE / (view.x1 - view.x0)
    const X = (x) => (x - view.x0) * scale
    const Y = (y) => (view.y1 - y) * scale
    const at = (o) => ({ ...o, px: X(o.x), py: Y(o.y) })
    const stars = scene.stars.map(at).sort((a, b) => b.mag - a.mag) // les plus faibles d'abord, sous les brillantes
    const deepSky = scene.deepSky.map(at)
    const spots = marks
      .map((m) => ({
        ...m,
        p: project(m.ra / 15, m.dec, scene.center.ra, scene.center.dec),
      }))
      .filter((m) => m.p)
      .map((m) => ({ ...m, px: X(m.p[0]), py: Y(m.p[1]) }))
    return { scene, X, Y, stars, deepSky, spots }
  }, [constellation.id, marks])

  const labels = useMemo(() => {
    const { scene, X, Y, stars, deepSky, spots } = chart
    // Les étiquettes, par ordre d'importance : les étoiles brillantes, les objets de Messier et de Caldwell, les
    // autres étoiles, les noms des voisines, les autres objets
    const starLabel = (s) => ({
      key: `s${s.i}`,
      text: s.title ? `${s.letter} ${s.title}` : s.letter,
      x: s.px,
      y: s.py,
      size: (s.mag < 3 ? 15 : 12.5) * k,
      color: ENCRE,
      places: [
        [starRadius(s.mag) + 2, -2 * k, 'start'],
        [-starRadius(s.mag) - 2, -2 * k, 'end'],
        [starRadius(s.mag) + 1, 12 * k, 'start'],
      ],
    })
    const objectLabel = (o) => ({
      key: `o${o.id}`,
      text: o.label,
      x: o.px,
      y: o.py,
      size: 12 * k,
      color: LUNE,
      opacity: o.own ? 1 : 0.65,
      places: [
        [8, 13 * k, 'start'],
        [-8, 13 * k, 'end'],
        [8, -6 * k, 'start'],
      ],
    })
    // une étoile entourée (marks) porte l'étiquette du repère, pas la sienne
    const marked = (s) => spots.some((m) => Math.hypot(m.px - s.px, m.py - s.py) < 4)
    const bright = [...stars].reverse().filter((s) => s.letter && s.mag < 3 && !marked(s))
    const others = [...stars].reverse().filter((s) => s.letter && s.mag >= 3 && !marked(s))
    const names = scene.names.map((n) => ({
      key: `n${n.key}`,
      text: (getConstellation(n.key)?.name ?? n.key).toUpperCase(),
      x: X(n.x),
      y: Y(n.y),
      size: 11.5 * k,
      caps: true,
      color: ENCRE_ATTENUEE,
      opacity: 0.75,
      places: [
        [0, 4 * k, 'middle'],
        [0, -12 * k, 'middle'],
        [0, 20 * k, 'middle'],
      ],
    }))
    return placeLabels([
      ...spots.map((m) => ({
        key: `m${m.label}`,
        text: m.label,
        x: m.px,
        y: m.py,
        size: 14 * k,
        color: OR,
        weight: 600,
        places: [
          [12, -8 * k, 'start'],
          [-12, -8 * k, 'end'],
          [12, 18 * k, 'start'],
        ],
      })),
      ...bright.map(starLabel),
      ...deepSky.filter((o) => o.named).map(objectLabel),
      ...others.map(starLabel),
      ...names,
      ...deepSky.filter((o) => !o.named).map(objectLabel),
    ])
  }, [chart, k])

  const { scene, X, Y, stars, deepSky, spots } = chart
  const path = (points) => pathOf(points, X, Y)
  return (
    <div ref={wrapRef}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full rounded-xl"
        role="img"
        aria-label={`Carte de la constellation ${constellation.name}`}
      >
        <rect width={SIZE} height={SIZE} style={{ fill: CIEL_100, stroke: CIEL_200 }} />
        <g fill="none">
          {scene.grid.map((g, i) => (
            <path key={`g${i}`} d={path(g)} style={{ stroke: CIEL_200 }} strokeWidth="1" />
          ))}
          {scene.neighbours.map((n, i) => (
            <path key={`v${i}`} d={path(n)} style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="6 4" />
          ))}
          {scene.lines.map((l, i) => (
            <path key={`l${i}`} d={path(l)} style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.3" strokeWidth="1.2" />
          ))}
          {scene.own.map((o, i) => (
            <path key={`o${i}`} d={path(o)} style={{ stroke: OR }} strokeWidth="1.8" strokeDasharray="8 5" />
          ))}
          {scene.ownLines.map((l, i) => (
            <path key={`f${i}`} d={path(l)} style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.85" strokeWidth="1.6" />
          ))}
        </g>
        {deepSky.map((o) => (
          <g key={o.id}>
            <DeepSkySymbol type={o.type} x={o.px} y={o.py} opacity={o.own ? 1 : 0.6} />
            <title>{`${o.label}${o.label !== o.id ? ` (${o.id})` : ''}${o.name ? ` — ${o.name}` : ''} · ${deepSkyType(o.type)}${o.mag != null ? ` · magnitude ${decimal(o.mag)}` : ''}`}</title>
          </g>
        ))}
        {stars.map((s) => (
          <circle
            key={s.i}
            cx={s.px}
            cy={s.py}
            r={starRadius(s.mag)}
            style={{ fill: s.own ? ENCRE : ENCRE_ATTENUEE, stroke: CIEL_100 }}
            strokeWidth="0.8"
            fillOpacity={s.own ? 1 : 0.7}
          >
            <title>{`${s.label ? `${s.label} ${getConstellation(s.constellation)?.genitive ?? s.constellation}` : 'Étoile'}${s.name ? ` — ${s.name}` : ''} · magnitude ${decimal(s.mag, 2)}`}</title>
          </circle>
        ))}
        {spots.map((m) => (
          <circle key={m.label} cx={m.px} cy={m.py} r="11" fill="none" style={{ stroke: OR }} strokeWidth="2" />
        ))}
        {labels.map((l) => (
          <text
            key={l.key}
            x={l.x}
            y={l.y}
            textAnchor={l.anchor}
            style={{
              fill: l.color,
              fontSize: l.size,
              fontWeight: l.weight,
              letterSpacing: l.caps ? '0.06em' : undefined,
            }}
            fillOpacity={l.opacity ?? 1}
          >
            {l.text}
          </text>
        ))}
        {scene.gridLabels.map((g) =>
          g.kind === 'ra' ? (
            <text
              key={`ra${g.text}`}
              x={X(g.x)}
              y={SIZE - 6}
              textAnchor="middle"
              className="font-mono"
              style={{ fill: ENCRE_ATTENUEE, fontSize: 11 * k }}
            >
              {g.text}
            </text>
          ) : (
            <text key={`dec${g.text}`} x={6} y={Y(g.y) - 4} className="font-mono" style={{ fill: ENCRE_ATTENUEE, fontSize: 11 * k }}>
              {g.text}
            </text>
          ),
        )}
      </svg>
    </div>
  )
}
