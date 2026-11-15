import { useMemo } from 'react'
import { addDays } from '../lib/astro'
import { cometPosition, dateOfJd } from '../lib/comets'
import { CIEL_100, CIEL_200, ENCRE_ATTENUEE, LUNE, OR_ALERTE } from '../../../kit/charte'

const W = 720
const H = 300
const PAD = { l: 40, r: 14, t: 16, b: 30 }
const DAY_MS = 86_400_000
const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

/**
 * L'éclat prévu de la comète, quatre mois avant et huit mois après l'instant choisi (paramètres de magnitude du
 * MPC), avec la dernière magnitude observée (COBS), le périhélie et le passage au plus près de la Terre. L'axe des
 * magnitudes est retourné : plus haut, plus brillant.
 */
export default function BrightnessChart({ body: comet, date }) {
  const chart = useMemo(() => {
    const points = []
    for (let d = -120; d <= 240; d += 2) {
      const p = cometPosition(comet.el, addDays(date, d))
      if (p.mag != null && Number.isFinite(p.mag)) points.push({ d, mag: p.mag, delta: p.delta })
    }
    if (points.length < 2) return null
    const observed = comet.observed ? { d: (new Date(`${comet.observed.date}T12:00:00`) - date) / DAY_MS, mag: comet.observed.mag } : null
    const mags = points.map((p) => p.mag).concat(observed ? [observed.mag] : [])
    const lo = Math.floor(Math.min(...mags)) - 0.5
    const hi = Math.ceil(Math.max(...mags)) + 0.5
    const x = (d) => PAD.l + ((d + 120) / 360) * (W - PAD.l - PAD.r)
    const y = (m) => PAD.t + ((m - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
    const step = hi - lo > 10 ? 2 : 1
    const yTicks = []
    for (let m = Math.ceil(lo); m <= hi; m += step) yTicks.push(m)
    const months = []
    const first = new Date(addDays(date, -120))
    first.setDate(1)
    for (let t = new Date(first.getFullYear(), first.getMonth() + 1, 1); t <= addDays(date, 240); t = new Date(t.getFullYear(), t.getMonth() + 1, 1)) {
      months.push({ d: (t - date) / DAY_MS, label: month.format(t), year: t.getMonth() === 0 ? t.getFullYear() : null })
    }
    const perihelion = (dateOfJd(comet.el.tp) - date) / DAY_MS
    const closest = points.reduce((a, b) => (b.delta < a.delta ? b : a))
    return { points, observed, x, y, yTicks, months, perihelion, closest }
  }, [comet, date])

  if (!chart) return <p className="text-sm text-night-500">Le Minor Planet Center ne donne pas de paramètres de magnitude pour cette comète.</p>
  const { points, observed, x, y, yTicks, months, perihelion, closest } = chart
  const marker = (d, label, color, row = 0) =>
    d >= -120 && d <= 240 && (
      <g>
        <line x1={x(d)} x2={x(d)} y1={PAD.t} y2={H - PAD.b} style={{ stroke: color }} strokeDasharray="4 3" strokeOpacity="0.8" />
        <text x={x(d) + 4} y={PAD.t + 10 + row * 12} className="text-[10px]" style={{ fill: color }}>
          {label}
        </text>
      </g>
    )
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Éclat prévu de ${comet.short}`}>
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} style={{ fill: CIEL_100, stroke: CIEL_200 }} />
        {yTicks.map((m) => (
          <g key={m}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(m)} y2={y(m)} style={{ stroke: CIEL_200 }} />
            <text x={PAD.l - 6} y={y(m) + 4} textAnchor="end" className="font-mono text-[11px]" style={{ fill: ENCRE_ATTENUEE }}>
              {m}
            </text>
          </g>
        ))}
        {months.map((m) => (
          <g key={m.d}>
            <line x1={x(m.d)} x2={x(m.d)} y1={H - PAD.b} y2={H - PAD.b + 4} style={{ stroke: ENCRE_ATTENUEE }} />
            <text x={x(m.d) + 3} y={H - 10} className="text-[10px]" style={{ fill: ENCRE_ATTENUEE }}>
              {m.label}
              {m.year ? ` ${m.year}` : ''}
            </text>
          </g>
        ))}
        {marker(perihelion, 'périhélie', ENCRE_ATTENUEE)}
        {closest.d > -120 && closest.d < 240 && marker(closest.d, 'au plus près de la Terre', LUNE, 1)}
        <polyline points={points.map((p) => `${x(p.d).toFixed(1)},${y(p.mag).toFixed(1)}`).join(' ')} fill="none" style={{ stroke: OR_ALERTE }} strokeWidth="2" strokeLinejoin="round" />
        <line x1={x(0)} x2={x(0)} y1={PAD.t} y2={H - PAD.b} className="stroke-or" strokeWidth="1.5" />
        {observed && observed.d >= -120 && (
          <g>
            <circle cx={x(observed.d)} cy={y(observed.mag)} r="5" style={{ fill: LUNE, stroke: CIEL_100 }} strokeWidth="1.5" />
            <text x={x(observed.d) - 8} y={y(observed.mag) + 4} textAnchor="end" className="text-[11px] font-semibold" style={{ fill: LUNE }}>
              observée {String(observed.mag).replace('.', ',')}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="mt-2 text-xs text-night-500">
        {comet.kind === 'asteroid'
          ? `Courbe : magnitude prévue par le système H, G (H = ${comet.el.H}, G = ${comet.el.G ?? '0,15'}), qui tient compte de l’angle de phase ; trait doré : l’instant choisi.`
          : `Courbe : magnitude prévue par les paramètres du Minor Planet Center (H = ${comet.el.H ?? '—'}, G = ${comet.el.G ?? '—'}) ; trait doré : l’instant choisi ; point bleu : la dernière magnitude observée. Une comète peut s’écarter de plusieurs magnitudes de sa prévision (sursaut, désagrégation).`}
      </figcaption>
    </figure>
  )
}
