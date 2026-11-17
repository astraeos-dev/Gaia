import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtTime } from '../../../lib/format'
import { BODY, bodyPosition, makeObserver, nightVisibility } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import { InfoCard, Row } from '../components/InfoCard'
import { CIEL_000, CIEL_100, CIEL_200, ENCRE, ENCRE_ATTENUEE, LUNE, OR, seriesColor } from '../../../kit/charte'
import TABLE from '../data/moons.json'
import { MOON_PLANETS, planetMoons, planetRadiusArcsec, saturnRings } from './moons'

const PLANET_OPTIONS = MOON_PLANETS.map((id) => ({ value: id, label: BODY[id].name }))
const STATE = { free: '', transit: 'devant la planète', occulted: 'derrière la planète' }
const dayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })
const longDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const POLAR = { Saturn: 54364 / 60268, Mars: 3376.2 / 3396.2, Uranus: 24973 / 25559, Neptune: 24341 / 24764, Pluto: 1 }
const RING_INNER = 92000 / 136775 // le bord intérieur de l'anneau B, rapporté au bord extérieur de l'anneau A

/**
 * La planète et ses lunes comme dans un télescope ou une jumelle : le nord en haut et l'est à gauche (ou retourné), à
 * l'échelle de leurs écarts ; les anneaux de Saturne inclinés comme on les voit, leur moitié proche devant le disque.
 */
function MoonView({ planet, moons, radius, rings, flipped, wide }) {
  const W = 720
  const H = 300
  const shown = wide ? moons : [...moons].sort((a, b) => a.separation - b.separation).slice(0, Math.max(1, moons.length - 1))
  const reach = Math.max(radius * (rings ? 2.6 : 2.5), ...shown.map((m) => m.separation)) * 1.12
  const k = Math.min((W / 2 - 20) / reach, (H / 2 - 24) / reach) // pixels par seconde d'arc
  const s = flipped ? -1 : 1
  const at = (east, north) => [W / 2 - s * east * k, H / 2 - s * north * k]
  const r = Math.max(radius * k, 3)
  const ring = rings && {
    a: (rings.majorArcsec / 2) * k,
    b: (rings.minorArcsec / 2) * k,
  }
  // la moitié proche des anneaux : au sud quand la face nord se montre, au nord sinon (dans le repère de la planète)
  const half = (near) => {
    const sign = (rings.tilt > 0) === near ? 1 : -1 // 1 : moitié sud (y > 0 en SVG)
    const arc = (a, b, sweep) => `A ${a} ${b} 0 0 ${sweep} `
    return `M ${-ring.a} 0 ${arc(ring.a, ring.b, sign > 0 ? 0 : 1)}${ring.a} 0 L ${ring.a * RING_INNER} 0 ${arc(ring.a * RING_INNER, ring.b * RING_INNER, sign > 0 ? 1 : 0)}${-ring.a * RING_INNER} 0 Z`
  }
  const rotation = (flipped ? 180 : 0) - (rings?.poleAngle ?? 0)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-xl" role="img" aria-label={`${BODY[planet].name} et ses lunes`}>
      <rect width={W} height={H} rx="12" style={{ fill: CIEL_000 }} />
      <g transform={`translate(${W / 2} ${H / 2}) rotate(${rotation})`}>
        {ring && <path d={half(false)} style={{ fill: LUNE }} fillOpacity="0.55" />}
        <ellipse rx={r} ry={r * POLAR[planet]} style={{ fill: planet === 'Mars' ? OR : ENCRE }} fillOpacity="0.9" />
        {ring && <path d={half(true)} style={{ fill: LUNE }} fillOpacity="0.8" />}
      </g>
      {moons.map((m, i) => {
        if (m.state === 'occulted') return null
        const [x, y] = at(m.east, m.north)
        if (x < 0 || x > W || y < 0 || y > H) return null
        return (
          <g key={m.name}>
            <circle cx={x} cy={y} r={Math.max(1.8, 4.2 - (m.mag - 8) * 0.35)} style={{ fill: seriesColor(i), stroke: m.state === 'transit' ? CIEL_000 : 'none' }} strokeWidth="1" />
            <text x={x} y={y + (i % 2 ? 16 : -9)} textAnchor="middle" className="text-[11px] font-semibold" style={{ fill: seriesColor(i) }}>
              {m.name}
            </text>
          </g>
        )
      })}
      <text x="12" y={H - 12} className="font-mono text-[11px]" style={{ fill: ENCRE_ATTENUEE }}>
        {flipped ? 'S ↑ · O ←' : 'N ↑ · E ←'} · {fmt(reach, 0)}″ de part et d’autre
      </text>
    </svg>
  )
}

/** Le ballet des lunes sur quelques jours, comme celui d'In-The-Sky : le temps descend, l'est est à gauche. */
function WavyChart({ planet, start, days }) {
  const W = 420
  const H = 560
  const PAD = { t: 34, b: 14, l: 64, r: 14 }
  const data = useMemo(() => {
    const steps = []
    const step = planet === 'Mars' ? 0.25 : 1
    for (let h = 0; h <= days * 24; h += step) steps.push({ h, moons: planetMoons(new Date(start.getTime() + h * 3_600_000), planet, TABLE) })
    return steps.filter((s) => s.moons.length)
  }, [planet, start, days])
  if (!data.length) return <p className="text-sm text-night-500">Pas de positions pour ces jours-là.</p>
  const names = data[0].moons.map((m) => m.name)
  // l'échelle de la lune la plus lointaine, sauf si elle écrase les autres (Japet, deux fois plus loin que Titan)
  const reach = names.map((_, i) => Math.max(...data.map((s) => Math.abs(s.moons[i].east)))).sort((a, b) => b - a)
  const span = (reach.length > 1 && reach[0] > 2 * reach[1] ? reach[1] : reach[0]) * 1.05
  const x = (east) => PAD.l + ((span - east) / (2 * span)) * (W - PAD.l - PAD.r)
  const y = (h) => PAD.t + (h / (days * 24)) * (H - PAD.t - PAD.b)
  const radius = planetRadiusArcsec(planet, start)
  const ticks = []
  for (let h = 0; h <= days * 24; h += 12) ticks.push(h)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[460px]" role="img" aria-label="Positions des lunes sur quelques jours">
      <defs>
        <clipPath id="wavy-moons">
          <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
        </clipPath>
      </defs>
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} style={{ fill: CIEL_100, stroke: CIEL_200 }} />
      <rect x={x(radius)} y={PAD.t} width={Math.max(1, x(-radius) - x(radius))} height={H - PAD.t - PAD.b} style={{ fill: ENCRE }} fillOpacity="0.18" />
      {ticks.map((h) => (
        <g key={h}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(h)} y2={y(h)} style={{ stroke: CIEL_200 }} />
          <text x={PAD.l - 6} y={y(h) + 4} textAnchor="end" className="font-mono text-[10px]" style={{ fill: ENCRE_ATTENUEE }}>
            {h % 24 === 0 ? dayShort.format(new Date(start.getTime() + h * 3_600_000)) : fmtTime(new Date(start.getTime() + h * 3_600_000))}
          </text>
        </g>
      ))}
      {names.map((name, i) => {
        const parts = []
        let part = []
        for (const s of data) {
          const m = s.moons[i]
          if (m.state === 'occulted') {
            if (part.length) parts.push(part)
            part = []
          } else part.push(`${x(m.east).toFixed(1)},${y(s.h).toFixed(1)}`)
        }
        if (part.length) parts.push(part)
        return parts.map((p, n) => (
          <polyline key={`${name}${n}`} points={p.join(' ')} fill="none" style={{ stroke: seriesColor(i) }} strokeWidth="1.5" clipPath="url(#wavy-moons)" />
        ))
      })}
      {names.map((name, i) => (
        <text key={name} x={PAD.l + (i % 4) * 88} y={i < 4 ? 12 : 26} className="text-[10px] font-semibold" style={{ fill: seriesColor(i) }}>
          {name}
        </text>
      ))}
    </svg>
  )
}

/**
 * Saturne et ses anneaux, et les lunes de Mars, de Saturne, d'Uranus, de Neptune et de Pluton, comme dans Céleste (et
 * la page des lunes de Saturne d'In-The-Sky) : où elles sont à l'instant choisi, leur ballet sur quelques jours, et
 * l'inclinaison des anneaux.
 */
export default function PlanetMoons() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [planet, setPlanet] = useState('Saturn')
  const [flipped, setFlipped] = useState(false)
  const [wide, setWide] = useState(false)

  const moons = planetMoons(clock.date, planet, TABLE)
  const radius = planetRadiusArcsec(planet, clock.date)
  const rings = planet === 'Saturn' ? saturnRings(clock.date) : null
  const position = bodyPosition(planet, clock.date, observer)
  const night = nightVisibility(planet, observer, clock.date)
  const hour = Math.floor(clock.date.getTime() / 3_600_000)
  const start = useMemo(() => new Date(hour * 3_600_000), [hour])
  const days = { Mars: 1, Saturn: 5, Uranus: 5, Neptune: 6, Pluto: 7 }[planet]
  const first = new Date((TABLE.jd0 - 2_440_587.5) * 86_400_000)
  const last = new Date(first.getTime() + (TABLE.moons[0].states.length - 1) * 86_400_000)

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented ariaLabel="Planète" value={planet} onChange={setPlanet} options={PLANET_OPTIONS} />
        <Link to="/astronomie/lunes-de-jupiter" className="text-sm font-medium text-accent-700 hover:underline dark:text-accent-400">
          Les satellites de Jupiter →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <InfoCard title={BODY[planet].name}>
          <Row label="Magnitude" value={fmt(night.magnitude, 1)} />
          <Row label="Diamètre apparent" value={`${fmt(2 * radius, radius < 5 ? 2 : 1)}″`} />
          <Row label="Hauteur" value={`${fmt(position.alt, 1)}°`} sub={compass(position.az)} />
          <Row label="Visible cette nuit" value={night.visible ? `${fmtTime(night.start)} – ${fmtTime(night.end)}` : 'non'} />
          {rings && (
            <>
              <Row
                label="Anneaux"
                value={`${fmt(Math.abs(rings.tilt), 1)}° · face ${rings.tilt >= 0 ? 'nord' : 'sud'}`}
                sub={rings.lit ? undefined : 'face sombre'}
                hint="L’inclinaison des anneaux vue de la Terre (la latitude de la Terre au-dessus de leur plan)"
              />
              <Row label="Taille des anneaux" value={`${fmt(rings.majorArcsec, 1)}″ × ${fmt(rings.minorArcsec, 1)}″`} hint="Le bord extérieur de l’anneau A" />
              <Row label="Pôle nord" value={`${fmt(rings.poleAngle, 1)}°`} hint="L’angle de position du pôle nord de Saturne, compté du nord vers l’est" />
            </>
          )}
        </InfoCard>
        <section className="card card-pad">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">À l’instant choisi</h2>
            <div className="flex flex-wrap gap-2">
              <Segmented
                size="sm"
                ariaLabel="Champ"
                value={wide}
                onChange={setWide}
                options={[
                  { value: false, label: 'Près' },
                  { value: true, label: 'Toutes' },
                ]}
              />
              <Segmented
                size="sm"
                ariaLabel="Orientation"
                value={flipped}
                onChange={setFlipped}
                options={[
                  { value: false, label: 'Nord en haut' },
                  { value: true, label: 'Télescope' },
                ]}
              />
            </div>
          </div>
          {moons.length ? (
            <MoonView planet={planet} moons={moons} radius={radius} rings={rings} flipped={flipped} wide={wide} />
          ) : (
            <p className="text-sm text-night-500">
              Les positions des lunes vont du {longDay.format(first)} au {longDay.format(last)} : choisissez un instant dans cette période.
            </p>
          )}
          <p className="mt-2 text-xs text-night-500">
            Les lunes à l’échelle de leurs écarts ; « Près » laisse de côté la plus lointaine. Pour Saturne, les anneaux sont inclinés comme on les voit, leur moitié
            proche devant le disque.
          </p>
        </section>
      </div>

      {moons.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="card card-pad">
            <h2 className="mb-3 font-display text-lg font-semibold">
              {days > 1 ? `Les ${days} prochains jours` : 'Les prochaines 24 heures'}
            </h2>
            <WavyChart planet={planet} start={start} days={days} />
          </section>
          <section className="card overflow-hidden">
            <h2 className="card-pad pb-0 font-display text-lg font-semibold">Les lunes</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="table-data">
                <thead>
                  <tr>
                    <th>Lune</th>
                    <th className="text-right">Mag.</th>
                    <th className="text-right">Écart</th>
                    <th className="text-right">Angle</th>
                    <th>Où</th>
                  </tr>
                </thead>
                <tbody>
                  {moons.map((m, i) => (
                    <tr key={m.name}>
                      <td className="font-semibold" style={{ color: seriesColor(i) }}>
                        {m.name}
                      </td>
                      <td className="text-right font-mono">{fmt(m.mag, 1)}</td>
                      <td className="whitespace-nowrap text-right font-mono" title={`${fmt(m.separation / radius, 1)} rayons de la planète`}>
                        {fmt(m.separation, m.separation < 10 ? 1 : 0)}″
                      </td>
                      <td className="text-right font-mono">{fmt(m.positionAngle, 0)}°</td>
                      <td>{STATE[m.state] || `${compass(m.positionAngle)} de la planète`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="card-pad pt-2 text-xs text-night-500">
              Écart et angle de position (compté du nord vers l’est) vus du centre de la Terre. Magnitudes approchées, à l’opposition moyenne.
            </p>
          </section>
        </div>
      )}

      <p className="text-xs text-night-500">
        Lunes : états de JPL Horizons (MAR097, SAT441, URA184, NEP097, PLU060) du {longDay.format(new Date(`${TABLE.updated}T12:00:00`))}, prolongés sur
        leur orbite, comme dans Céleste. Anneaux : le pôle de Saturne de l’UAI. Planètes : Astronomy Engine.
      </p>
    </div>
  )
}
