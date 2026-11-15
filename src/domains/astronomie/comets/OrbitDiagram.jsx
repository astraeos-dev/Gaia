import { useMemo } from 'react'
import { Astronomy } from '../lib/astro'
import { cometPosition, orbitInfo, orbitPoints, positionAt } from '../lib/comets'
import { CIEL_000, CIEL_100, ENCRE, ENCRE_ATTENUEE, LUNE, OR, OR_ALERTE } from '../../../kit/charte'

const S = 420
const C = S / 2
const R = C - 22
const PLANETS = [
  ['Mercury', 'Mercure', 0.387],
  ['Venus', 'Vénus', 0.723],
  ['Earth', 'Terre', 1],
  ['Mars', 'Mars', 1.524],
  ['Jupiter', 'Jupiter', 5.203],
  ['Saturn', 'Saturne', 9.537],
  ['Uranus', 'Uranus', 19.19],
  ['Neptune', 'Neptune', 30.07],
]

/**
 * L'orbite vue de 90° au-dessus de l'écliptique, comme chez Heavens-Above : le Soleil au centre, les orbites des
 * planètes, celle de la comète (trait plein au-dessus de l'écliptique, pointillés au-dessous), la comète, la Terre
 * et les planètes à l'instant choisi, le point vernal ♈ à droite. Au-delà de 6 ua, les distances suivent leur
 * racine carrée, pour garder lisibles les planètes intérieures.
 */
export default function OrbitDiagram({ comet, date }) {
  const view = useMemo(() => {
    const el = comet.el
    const now = cometPosition(el, date)
    const { aphelion } = orbitInfo(el)
    const reach = Math.min(40, Math.max(1.7, (aphelion ?? 0) * 1.05, now.r * 1.15, el.q * 2.2))
    const linear = reach <= 6
    const radius = (r) => (linear ? r / reach : Math.sqrt(r / reach)) * R
    const xy = (x, y) => {
      const r = Math.hypot(x, y)
      if (r === 0) return [C, C]
      const k = radius(r) / r
      return [C + x * k, C - y * k]
    }
    // L'orbite, coupée en morceaux au-dessus et au-dessous de l'écliptique
    const parts = []
    for (const p of orbitPoints(el, 720, reach)) {
      const above = p.z >= 0
      const last = parts.at(-1)
      const point = xy(p.x, p.y)
      if (last && last.above === above) last.points.push(point)
      else {
        if (last) last.points.push(point)
        parts.push({ above, points: [point] })
      }
    }
    const toEcl = Astronomy.Rotation_EQJ_ECL()
    const planets = PLANETS.filter(([, , a]) => a <= reach * 1.02).map(([id, name, a]) => {
      const v = Astronomy.RotateVector(toEcl, Astronomy.HelioVector(id, date))
      return { id, name, ring: radius(a), at: xy(v.x, v.y) }
    })
    return {
      parts,
      planets,
      comet: xy(now.helio.x, now.helio.y),
      above: now.helio.z >= 0,
      perihelion: xy(positionAt(el, 0, el.q).x, positionAt(el, 0, el.q).y),
      reach,
      linear,
    }
  }, [comet, date])

  return (
    <figure>
      <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto block h-auto w-full max-w-[460px]" role="img" aria-label={`Orbite de ${comet.short} vue de dessus`}>
        <rect width={S} height={S} rx="16" style={{ fill: CIEL_000 }} />
        {view.planets.map((p) => (
          <circle key={`o${p.id}`} cx={C} cy={C} r={p.ring} fill="none" style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.3" />
        ))}
        <line x1={C} y1={C} x2={S - 10} y2={C} className="stroke-or" strokeOpacity="0.45" strokeDasharray="3 4" />
        <text x={S - 14} y={C - 6} textAnchor="end" className="fill-or text-[12px]">
          {'♈︎'}
        </text>
        {view.parts.map((part, i) => (
          <polyline
            key={i}
            points={part.points.map((p) => p.join(',')).join(' ')}
            fill="none"
            style={{ stroke: OR_ALERTE }}
            strokeWidth="1.6"
            strokeOpacity={part.above ? 1 : 0.7}
            strokeDasharray={part.above ? undefined : '4 3'}
          />
        ))}
        <circle cx={C} cy={C} r="7" style={{ fill: OR }} />
        <rect x={view.perihelion[0] - 3} y={view.perihelion[1] - 3} width="6" height="6" transform={`rotate(45 ${view.perihelion[0]} ${view.perihelion[1]})`} style={{ fill: ENCRE_ATTENUEE }} />
        {view.planets.map((p) => (
          <g key={p.id}>
            <circle cx={p.at[0]} cy={p.at[1]} r={p.id === 'Earth' ? 4.5 : 3.5} style={{ fill: p.id === 'Earth' ? LUNE : ENCRE, stroke: CIEL_100 }} strokeWidth="1" />
            {(p.id === 'Earth' || p.ring > 60) && (
              <text x={p.at[0] + 6} y={p.at[1] - 5} className="text-[10px]" style={{ fill: p.id === 'Earth' ? LUNE : ENCRE_ATTENUEE }}>
                {p.name}
              </text>
            )}
          </g>
        ))}
        <circle cx={view.comet[0]} cy={view.comet[1]} r="5" style={{ fill: OR_ALERTE, stroke: CIEL_100 }} strokeWidth="1.5" />
        <text x={view.comet[0] + 8} y={view.comet[1] + 4} className="text-[12px] font-semibold" style={{ fill: ENCRE }}>
          {comet.short}
        </text>
      </svg>
      <figcaption className="mt-2 text-xs text-night-500">
        Trait plein : au-dessus de l’écliptique ; pointillés : au-dessous ; losange : le périhélie. Échelle {view.linear ? 'proportionnelle' : 'en racine carrée des distances'}{' '}
        jusqu’à {String(Math.round(view.reach * 10) / 10).replace('.', ',')} ua. La comète est {view.above ? 'au-dessus' : 'au-dessous'} de l’écliptique.
      </figcaption>
    </figure>
  )
}
