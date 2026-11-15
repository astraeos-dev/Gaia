import { useMemo, useState } from 'react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { fmt, fmtTime } from '../../../lib/format'
import { Astronomy, bodyPosition, diameterArcsec, fmtDiameter, makeObserver, nightVisibility } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import { InfoCard, Row } from '../components/InfoCard'
import { CIEL_000, CIEL_100, CIEL_200, ENCRE, ENCRE_ATTENUEE, LUNE, OK, OR, OR_LUNE } from '../../../kit/charte'
import { MOONS, jupiterMoons, moonEvents } from './moons'

const COLORS = { io: OR, europa: LUNE, ganymede: OK, callisto: OR_LUNE }
const dayHour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const dayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })

/** Jupiter et ses satellites à l'instant choisi, comme dans une jumelle (nord en haut) ou un télescope (retourné). */
function EyepieceView({ moons, flipped }) {
  const W = 720
  const H = 150
  const scale = 12 // pixels par rayon de Jupiter
  const k = flipped ? -1 : 1
  const at = (x, y) => [W / 2 - k * x * scale, H / 2 - k * y * scale]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-xl" role="img" aria-label="Jupiter et ses satellites">
      <rect width={W} height={H} rx="12" style={{ fill: CIEL_000 }} />
      <circle cx={W / 2} cy={H / 2} r={scale} style={{ fill: ENCRE }} fillOpacity="0.9" />
      {moons.filter((m) => m.shadow).map((m) => {
        const [x, y] = at(m.shadow.x, m.shadow.y)
        return <circle key={`s${m.id}`} cx={x} cy={y} r="2.6" style={{ fill: CIEL_000 }} />
      })}
      {moons.map((m) => {
        const [x, y] = at(m.x, m.y)
        if (m.occulted) return null
        return (
          <g key={m.id}>
            <circle cx={x} cy={y} r="3.4" style={{ fill: COLORS[m.id], stroke: m.transit ? CIEL_000 : 'none' }} strokeWidth="1" opacity={m.eclipsed ? 0.25 : 1} />
            <text x={x} y={y + (m.y * k > 0 ? 18 : -10)} textAnchor="middle" className="text-[11px] font-semibold" style={{ fill: COLORS[m.id] }}>
              {m.letter}
            </text>
          </g>
        )
      })}
      <text x="12" y={H - 12} className="font-mono text-[11px]" style={{ fill: ENCRE_ATTENUEE }}>
        {flipped ? 'S ↑ · O ←' : 'N ↑ · E ←'}
      </text>
    </svg>
  )
}

/** Le diagramme des satellites sur trois jours, comme celui d'In-The-Sky : le temps descend, l'est est à gauche. */
function WavyChart({ start }) {
  const W = 420
  const H = 640
  const PAD = { t: 30, b: 14, l: 64, r: 14 }
  const days = 3
  const span = 28 // rayons de Jupiter de part et d'autre
  const x = (rj) => PAD.l + ((span - rj) / (2 * span)) * (W - PAD.l - PAD.r)
  const y = (h) => PAD.t + (h / (days * 24)) * (H - PAD.t - PAD.b)
  const tracks = useMemo(() => {
    const points = MOONS.map(() => [])
    for (let h = 0; h <= days * 24; h += 0.5) {
      jupiterMoons(new Date(start.getTime() + h * 3_600_000)).forEach((m, i) => points[i].push({ h, x: m.x, hidden: m.occulted }))
    }
    // Un tracé par morceau visible (le satellite disparaît derrière Jupiter)
    return MOONS.map((m, i) => {
      const parts = []
      let part = []
      for (const p of points[i]) {
        if (p.hidden) {
          if (part.length) parts.push(part)
          part = []
        } else part.push(p)
      }
      if (part.length) parts.push(part)
      return { m, parts }
    })
  }, [start])
  const ticks = []
  for (let h = 0; h <= days * 24; h += 6) ticks.push(h)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[460px]" role="img" aria-label="Positions des satellites sur trois jours">
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} style={{ fill: CIEL_100, stroke: CIEL_200 }} />
      <rect x={x(1)} y={PAD.t} width={x(-1) - x(1)} height={H - PAD.t - PAD.b} style={{ fill: ENCRE }} fillOpacity="0.18" />
      {ticks.map((h) => (
        <g key={h}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(h)} y2={y(h)} style={{ stroke: CIEL_200 }} />
          <text x={PAD.l - 6} y={y(h) + 4} textAnchor="end" className="font-mono text-[10px]" style={{ fill: ENCRE_ATTENUEE }}>
            {h % 24 === 0 ? dayShort.format(new Date(start.getTime() + h * 3_600_000)) : fmtTime(new Date(start.getTime() + h * 3_600_000))}
          </text>
        </g>
      ))}
      {tracks.map(({ m, parts }) =>
        parts.map((part, k) => (
          <polyline
            key={`${m.id}${k}`}
            points={part.map((p) => `${x(p.x).toFixed(1)},${y(p.h).toFixed(1)}`).join(' ')}
            fill="none"
            style={{ stroke: COLORS[m.id] }}
            strokeWidth="1.6"
          />
        )),
      )}
      {MOONS.map((m, i) => (
        <text key={m.id} x={PAD.l + 8 + i * 80} y={18} className="text-[11px] font-semibold" style={{ fill: COLORS[m.id] }}>
          {m.letter} : {m.name}
        </text>
      ))}
      <text x={x(0)} y={PAD.t - 2} textAnchor="middle" className="text-[10px]" style={{ fill: ENCRE_ATTENUEE }}>
        E ← Jupiter → O
      </text>
    </svg>
  )
}

/**
 * Les satellites galiléens de Jupiter, comme les pages d'In-The-Sky : où ils sont à l'instant choisi, leur ballet
 * sur trois jours, et les passages, ombres, occultations et éclipses des quatre jours qui viennent, avec ceux que
 * vous pourrez voir de chez vous (Jupiter à plus de 10°, Soleil sous −6°).
 */
export default function JupiterMoonsPage() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [flipped, setFlipped] = useState(false)

  const moons = jupiterMoons(clock.date)
  const hour = Math.floor(clock.date.getTime() / 3_600_000)
  const start = useMemo(() => new Date(hour * 3_600_000), [hour])
  const events = useMemo(() => moonEvents(start, 4), [start])
  const jupiter = bodyPosition(Astronomy.Body.Jupiter, clock.date, observer)
  const night = nightVisibility(Astronomy.Body.Jupiter, observer, clock.date)
  const seen = (t) => {
    if (!t) return false
    return bodyPosition(Astronomy.Body.Jupiter, t, observer).alt > 10 && bodyPosition(Astronomy.Body.Sun, t, observer).alt < -6
  }

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <InfoCard title="Jupiter">
          <Row label="Magnitude" value={fmt(night.magnitude, 1)} />
          <Row label="Diamètre apparent" value={fmtDiameter(diameterArcsec('Jupiter', jupiter.dist))} />
          <Row label="Hauteur" value={`${fmt(jupiter.alt, 1)}°`} />
          <Row label="Visible cette nuit" value={night.visible ? `${fmtTime(night.start)} – ${fmtTime(night.end)}` : 'non'} />
          {MOONS.map((m, i) => (
            <Row
              key={m.id}
              label={m.name}
              value={moons[i].occulted ? 'derrière Jupiter' : moons[i].transit ? 'devant Jupiter' : `${fmt(Math.abs(moons[i].x), 1)} R♃ ${moons[i].x > 0 ? 'à l’est' : 'à l’ouest'}`}
              sub={moons[i].eclipsed ? 'dans l’ombre' : undefined}
            />
          ))}
        </InfoCard>
        <section className="card card-pad">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">À l’instant choisi</h2>
            <Segmented
              size="sm"
              ariaLabel="Orientation"
              value={flipped}
              onChange={setFlipped}
              options={[
                { value: false, label: 'Jumelles (nord en haut)' },
                { value: true, label: 'Télescope (retourné)' },
              ]}
            />
          </div>
          <EyepieceView moons={moons} flipped={flipped} />
          <p className="mt-2 text-xs text-night-500">
            Les satellites à l’échelle de leurs écarts (R♃ : rayon de Jupiter) ; un point cerclé passe devant la planète, un point pâle est dans
            l’ombre de Jupiter, un point noir sur le disque est l’ombre d’un satellite.
          </p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="card card-pad">
          <h2 className="mb-3 font-display text-lg font-semibold">Les trois prochains jours</h2>
          <WavyChart start={start} />
        </section>
        <section className="card overflow-hidden">
          <h2 className="card-pad pb-0 font-display text-lg font-semibold">Passages, ombres et éclipses</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="table-data min-w-[560px]">
              <thead>
                <tr>
                  <th>Satellite</th>
                  <th>Phénomène</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Chez vous</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => {
                  const middle = e.start && e.end ? new Date((e.start.getTime() + e.end.getTime()) / 2) : e.start ?? e.end
                  const visible = seen(middle)
                  return (
                    <tr key={i}>
                      <td className="font-semibold" style={{ color: COLORS[e.moon.id] }}>
                        {e.moon.name}
                      </td>
                      <td>{e.label}</td>
                      <td className="font-mono">{e.start ? dayHour.format(e.start) : 'en cours'}</td>
                      <td className="font-mono">{e.end ? dayHour.format(e.end) : '—'}</td>
                      <td className={visible ? 'text-ok' : 'text-night-400'}>{visible ? 'visible' : 'non'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="card-pad pt-2 text-xs text-night-500">
            Heures locales. « Visible » : Jupiter à plus de 10° et Soleil sous −6° au milieu du phénomène. Positions : théorie L1.2 (Astronomy
            Engine), à la minute près.
          </p>
        </section>
      </div>
    </div>
  )
}
