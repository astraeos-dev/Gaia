import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtTime } from '../../../lib/format'
import { addDays, addHours, makeObserver } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import { CIEL_100, CIEL_200, ENCRE, ENCRE_ATTENUEE, LUNE, OR } from '../../../kit/charte'
import { getConstellation, constellationPath } from '../constellations/geometry'
import ConstellationChart from '../constellations/ConstellationChart'
import { ALGOL, DARK_SUN, UNCERTAINTY_MIN, VISIBLE_ALT, lightCurve, minimaFrom } from './algol'

const weekday = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDay = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const decimal = (x, digits = 1) => x.toFixed(digits).replace('.', ',')

// Les étoiles de comparaison (Yale Bright Star Catalogue) : Algol hors éclipse vaut γ d'Andromède, au minimum
// elle passe entre ε et κ de Persée
const COMPARISON = [
  { label: 'γ And', mag: 2.26, ra: 30.97, dec: 42.33 },
  { label: 'ε Per', mag: 2.89, ra: 59.46, dec: 40.01 },
  { label: 'κ Per', mag: 3.8, ra: 47.37, dec: 44.86 },
]
const MARKS = [{ label: 'Algol', ra: ALGOL.ra * 15, dec: ALGOL.dec }, ...COMPARISON.map((c) => ({ ...c, label: `${c.label} ${decimal(c.mag)}` }))]
const PERSEUS = getConstellation('Per')

const SPANS = [
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
]

/** Le ciel au minimum, d'après la hauteur du Soleil. */
const skyOf = (sun) => (sun > -0.8 ? 'jour' : sun > -6 ? 'crépuscule civil' : sun > DARK_SUN ? 'crépuscule' : 'nuit')

const W = 760
const H = 260
const PAD = { l: 44, r: 92, t: 14, b: 30 }

/** La courbe de lumière autour d'un minimum, avec les étoiles de comparaison : quand regarder, et à quoi comparer. */
function LightCurve({ minimum }) {
  const x = (h) => PAD.l + ((h + 6) / 12) * (W - PAD.l - PAD.r)
  const y = (m) => PAD.t + ((m - 1.9) / (4 - 1.9)) * (H - PAD.t - PAD.b)
  const points = Array.from({ length: 121 }, (_, i) => -6 + i / 10).map((h) => `${x(h).toFixed(1)},${y(lightCurve(h)).toFixed(1)}`)
  const hours = []
  const first = new Date(addHours(minimum, -6))
  first.setMinutes(0, 0, 0)
  for (let t = first.getTime() + 3_600_000; t <= addHours(minimum, 6).getTime(); t += 2 * 3_600_000) hours.push(new Date(t))
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Courbe de lumière d’Algol autour du minimum">
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} style={{ fill: CIEL_100, stroke: CIEL_200 }} />
        {[2, 2.5, 3, 3.5].map((m) => (
          <g key={m}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(m)} y2={y(m)} style={{ stroke: CIEL_200 }} />
            <text x={PAD.l - 6} y={y(m) + 4} textAnchor="end" className="font-mono text-[11px]" style={{ fill: ENCRE_ATTENUEE }}>
              {decimal(m)}
            </text>
          </g>
        ))}
        {COMPARISON.map((c) => (
          <g key={c.label}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(c.mag)} y2={y(c.mag)} style={{ stroke: LUNE }} strokeDasharray="5 4" strokeOpacity="0.8" />
            <text x={W - PAD.r + 6} y={y(c.mag) + 4} className="text-[11px]" style={{ fill: LUNE }}>
              {c.label} {decimal(c.mag)}
            </text>
          </g>
        ))}
        {hours.map((t) => (
          <g key={t.getTime()}>
            <line
              x1={x((t - minimum) / 3_600_000)}
              x2={x((t - minimum) / 3_600_000)}
              y1={H - PAD.b}
              y2={H - PAD.b + 4}
              style={{ stroke: ENCRE_ATTENUEE }}
            />
            <text x={x((t - minimum) / 3_600_000)} y={H - 10} textAnchor="middle" className="font-mono text-[11px]" style={{ fill: ENCRE_ATTENUEE }}>
              {fmtTime(t)}
            </text>
          </g>
        ))}
        <rect
          x={x(-UNCERTAINTY_MIN / 60)}
          y={PAD.t}
          width={x(UNCERTAINTY_MIN / 60) - x(-UNCERTAINTY_MIN / 60)}
          height={H - PAD.t - PAD.b}
          style={{ fill: OR }}
          fillOpacity="0.12"
        />
        <polyline points={points.join(' ')} fill="none" style={{ stroke: ENCRE }} strokeWidth="2.2" strokeLinejoin="round" />
        <text x={x(0)} y={PAD.t + 14} textAnchor="middle" className="text-[11px] font-semibold" style={{ fill: OR }}>
          minimum ±{UNCERTAINTY_MIN} min
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-night-500">
        L’allure de la baisse d’éclat (un schéma : magnitude 2,1 hors éclipse, 3,4 au minimum), heures locales. En pointillés bleus, les étoiles
        auxquelles comparer Algol à l’œil nu.
      </figcaption>
    </figure>
  )
}

/**
 * Algol, comme dans Céleste (4.18) et sur In-The-Sky : ses prochains minima, ceux qui valent d'être observés d'ici
 * (l'étoile à 15° au moins, le Soleil à 12° sous l'horizon), la courbe de lumière du prochain, et sa carte de repérage
 * avec les étoiles de comparaison.
 */
export default function Algol() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [span, setSpan] = useState(30)
  const [onlyVisible, setOnlyVisible] = useState(false)

  const rows = useMemo(() => minimaFrom(addHours(clock.date, -5), addDays(clock.date, span), observer), [clock.date, span, observer])
  const next = rows.find((r) => r.visible)
  const shown = onlyVisible ? rows.filter((r) => r.visible) : rows
  const place = location.name ?? 'votre lieu'

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card card-pad space-y-3">
          <h2 className="font-display text-lg font-semibold">Le prochain minimum à voir d’ici</h2>
          {next ? (
            <>
              <p>
                <span className="text-xl font-semibold first-letter:uppercase">{weekday.format(next.date)}</span> vers{' '}
                <span className="text-xl font-semibold">{fmtTime(next.date)}</span> <span className="text-night-500">(±{UNCERTAINTY_MIN} min)</span>
              </p>
              <p className="text-sm text-night-600 dark:text-night-400">
                Algol à {fmt(next.alt, 0)}° de hauteur ({compass(next.az)}), le Soleil à {fmt(next.sun, 0)}°. Commencez à la comparer à ses voisines
                deux ou trois heures avant : la baisse et la remontée durent chacune cinq heures environ.
              </p>
              <LightCurve minimum={next.date} />
            </>
          ) : (
            <p className="text-sm text-night-600 dark:text-night-400">
              Aucun minimum ne se produit dans les {span} prochains jours quand Algol est à plus de {VISIBLE_ALT}° et le ciel noir à {place}.
            </p>
          )}
        </section>

        <section className="card card-pad space-y-3">
          <h2 className="font-display text-lg font-semibold">L’étoile du Démon</h2>
          <div className="space-y-2 text-sm text-night-700 dark:text-night-300">
            <p>
              Algol (β de Persée) est une étoile double à éclipses. Toutes les 2 jours 20 heures 49 minutes, sa compagne, plus grosse et moins
              lumineuse, passe devant l’étoile principale : Algol tombe de la magnitude 2,1 à 3,4, et perd ainsi plus des deux tiers de son éclat, en
              cinq heures environ, puis remonte en cinq autres.
            </p>
            <p>Pour la suivre, comparez-la à γ d’Andromède (2,3), son éclat hors éclipse, puis près du minimum à ε (2,9) et κ de Persée (3,8).</p>
            <p className="text-xs text-night-500">
              Les instants viennent d’une éphéméride ajustée aux minima mesurés de 2006 à 2017 (base Lichtenknecker du BAV), comme dans Céleste. La
              période d’Algol varie lentement : ils tiennent à une demi-heure près.
            </p>
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="card-pad flex flex-wrap items-center justify-between gap-3 pb-0">
          <h2 className="font-display text-lg font-semibold">Les minima à venir</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented size="sm" ariaLabel="Période" value={span} onChange={setSpan} options={SPANS} />
            <label className="flex items-center gap-2 text-sm text-night-600 dark:text-night-400">
              <input type="checkbox" checked={onlyVisible} onChange={(e) => setOnlyVisible(e.target.checked)} className="accent-accent-500" />
              Seulement ceux à voir d’ici
            </label>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table-data min-w-[620px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Heure</th>
                <th className="text-right">Hauteur d’Algol</th>
                <th>Ciel</th>
                <th>À voir d’ici</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.date.getTime()} className={r.visible ? '' : 'text-night-400'}>
                  <td className="first-letter:uppercase">{shortDay.format(r.date)}</td>
                  <td className="font-mono">{fmtTime(r.date)}</td>
                  <td className="text-right font-mono">
                    {r.alt > 0 ? (
                      <>
                        {fmt(r.alt, 0)}° <span className="text-night-500">({compass(r.az)})</span>
                      </>
                    ) : (
                      'sous l’horizon'
                    )}
                  </td>
                  <td>{skyOf(r.sun)}</td>
                  <td>{r.visible ? <Check size={16} className="text-ok" aria-label="oui" /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="card-pad text-sm text-night-500">Aucun minimum à voir d’ici sur cette période.</p>}
        </div>
        <p className="card-pad pt-2 text-xs text-night-500">
          À voir d’ici : Algol à {VISIBLE_ALT}° au moins et le Soleil à {-DARK_SUN}° sous l’horizon au minimum, à {place}. Heures locales, à ±
          {UNCERTAINTY_MIN} min près.
        </p>
      </section>

      <section className="card card-pad">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Trouver Algol</h2>
          <Link to={constellationPath(PERSEUS)} className="text-sm font-medium text-accent-700 hover:underline dark:text-accent-400">
            La constellation de Persée →
          </Link>
        </div>
        <div className="mx-auto max-w-3xl">
          <ConstellationChart constellation={PERSEUS} marks={MARKS} />
        </div>
        <p className="mt-2 text-xs text-night-500">
          Algol et ses étoiles de comparaison, entourées d’or, avec leur magnitude. L’est est à gauche, comme dans le ciel.
        </p>
      </section>
    </div>
  )
}
