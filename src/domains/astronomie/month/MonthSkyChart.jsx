import { useMemo } from 'react'
import { CIEL_000, CIEL_200, ENCRE, ENCRE_ATTENUEE, LUNE, OR } from '../../../kit/charte'
import { computeScene, makeProjection } from '../sky-map/skyScene'
import { MAP_MAG } from './month'

const S = 600
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
 * La carte du ciel de la fiche du mois, en SVG pour l'impression : le ciel entier au-dessus de l'horizon, le zénith au
 * centre, le nord en haut et l'est à gauche, comme quand on lève les yeux ; les figures et les noms des
 * constellations, les étoiles jusqu'à la magnitude 5 et les noms des plus brillantes, l'écliptique, la Lune et les
 * planètes. Comme la carte du mois de Céleste (charts.draw_sky_map).
 */
export default function MonthSkyChart({ date, observer }) {
  const scene = useMemo(() => computeScene(date, observer), [date, observer])
  const { cx, cy, R, project } = makeProjection(S)
  const up = (p) => p.alt > 0

  const lines = []
  for (const c of scene.lines) {
    for (const segment of c.segments) {
      for (let i = 1; i < segment.length; i++) {
        const [a, b] = [segment[i - 1], segment[i]]
        if (up(a) && up(b)) lines.push([project(a.alt, a.az), project(b.alt, b.az)])
      }
    }
  }
  const ecliptic = scene.ecliptic.map((p) => (up(p) ? project(p.alt, p.az) : null))
  const eclipticPath = ecliptic
    .map((p, i) => (p ? `${i && ecliptic[i - 1] ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : ''))
    .filter(Boolean)
    .join(' ')
  const stars = scene.stars.filter((s) => s.alt > 0 && s.mag <= MAP_MAG)
  const radius = (mag) => Math.max(0.6, (MAP_MAG + 0.6 - mag) * 0.62)
  const bodies = scene.bodies.filter((b) => b.alt > 0 && b.id !== 'Sun' && (b.id === 'Moon' || b.mag <= 6.5))

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full" role="img" aria-label="Carte du ciel du mois">
      <defs>
        <clipPath id="month-sky">
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={R} style={{ fill: CIEL_000, stroke: ENCRE }} strokeWidth="1.2" />
      <g clipPath="url(#month-sky)">
        {[30, 60].map((alt) => (
          <circle key={alt} cx={cx} cy={cy} r={R * Math.tan((((90 - alt) * Math.PI) / 180) / 2)} fill="none" style={{ stroke: CIEL_200 }} strokeWidth="0.8" />
        ))}
        <path d={eclipticPath} fill="none" style={{ stroke: OR }} strokeOpacity="0.6" strokeWidth="1" strokeDasharray="5 4" />
        {lines.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.55" strokeWidth="0.8" />
        ))}
        {stars.map((s) => {
          const [x, y] = project(s.alt, s.az)
          return <circle key={s.i} cx={x} cy={y} r={radius(s.mag)} style={{ fill: ENCRE }} />
        })}
        {scene.labels
          .filter((c) => c.alt > 4 && c.rank <= 2)
          .map((c) => {
            const [x, y] = project(c.alt, c.az)
            return (
              <text key={c.id} x={x} y={y} textAnchor="middle" className={`text-[10px] uppercase tracking-wide ${c.rank === 1 ? 'font-semibold' : ''}`} style={{ fill: ENCRE_ATTENUEE }} fillOpacity={c.rank === 1 ? 0.9 : 0.7}>
                {c.fr}
              </text>
            )
          })}
        {stars
          .filter((s) => s.name && s.mag < 1.6 && s.alt > 2)
          .map((s) => {
            const [x, y] = project(s.alt, s.az)
            return (
              <text key={`n${s.i}`} x={x + 5} y={y - 4} className="text-[10px] italic" style={{ fill: ENCRE }}>
                {s.name}
              </text>
            )
          })}
        {bodies.map((b) => {
          const [x, y] = project(b.alt, b.az)
          const moon = b.id === 'Moon'
          return (
            <g key={b.id}>
              <circle cx={x} cy={y} r={moon ? 7 : 4} style={{ fill: moon ? LUNE : OR, stroke: ENCRE }} strokeWidth="0.6" />
              <text x={x + (moon ? 10 : 7)} y={y + 4} className="text-[11px] font-semibold" style={{ fill: moon ? LUNE : OR }}>
                {b.name}
              </text>
            </g>
          )
        })}
      </g>
      {CARDINALS.map(([label, az]) => {
        const r = R + 14
        const a = (az * Math.PI) / 180
        return (
          <text key={label} x={cx - r * Math.sin(a)} y={cy - r * Math.cos(a) + 4} textAnchor="middle" className={`font-mono ${label.length === 1 ? 'text-[13px] font-semibold' : 'text-[10px]'}`} style={{ fill: label === 'N' ? ENCRE : ENCRE_ATTENUEE }}>
            {label}
          </text>
        )
      })}
    </svg>
  )
}
