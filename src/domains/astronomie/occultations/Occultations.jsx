import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtDMS, fmtHMS, fmtLat, fmtLon, fmtTime } from '../../../lib/format'
import { constellationAt } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import { constellationPath, getConstellation } from '../constellations/geometry'
import { LUNE, OR } from '../../../kit/charte'
import { MAX_KM, OCCULT_WATCHER_URL, SOURCE_URL, near } from './occultations'
import { asteroidLabel, moonlight, useOccultationEvents } from './data'

const DISTANCES = [25, 50, 100, 200, 500].map((km) => ({ value: km, label: `${km} km` }))
const PERIODS = [1, 3, 6].map((n) => ({ value: n, label: `${n} mois` }))

const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const dayTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
const keyOf = (seen) => `${seen.event.name}|${seen.event.middle.getTime()}`

/** « Sur le lieu » ou « à 12 km (NE) ». */
const whereText = (seen) => (seen.inside ? 'Sur le lieu' : `à ${fmt(seen.edgeKm, 0)} km (${compass(seen.direction)})`)

/** Un pas d'échelle rond (1, 2 ou 5 × 10ⁿ km) près de `km`. */
function niceStep(km) {
  const power = 10 ** Math.floor(Math.log10(km))
  return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= km * 0.6) ?? 10 * power
}

/**
 * La bande autour du lieu, vue de dessus, le nord en haut : ses bords, sa ligne centrale et le chemin le plus court
 * pour l'atteindre. La bande est prise droite autour du lieu (la pente locale de la projection), assez juste pour
 * savoir de quel côté aller.
 */
function BandPlan({ seen, place }) {
  const W = 360
  const c = W / 2
  const { signed, rateE, rateN, radius } = seen.band
  const rate = Math.hypot(rateE, rateN)
  const n = [rateE / rate, rateN / rate] // en travers de la bande, vers les distances signées croissantes
  const t = [-n[1], n[0]] // le long de la bande
  const extent = Math.max(1.5 * (seen.distanceKm + seen.halfWidthKm), 3 * seen.halfWidthKm, 10)
  const k = c / extent // pixels par km
  const point = ([e, nn]) => [c + e * k, c - nn * k]
  const line = (offset) => {
    const base = [offset * n[0], offset * n[1]]
    return [point([base[0] - 3 * extent * t[0], base[1] - 3 * extent * t[1]]), point([base[0] + 3 * extent * t[0], base[1] + 3 * extent * t[1]])]
  }
  const [low, high] = [(-radius - signed) / rate, (radius - signed) / rate]
  const centre = -signed / rate
  const [a1, a2] = line(low)
  const [b1, b2] = line(high)
  const [m1, m2] = line(centre)
  const foot = point([centre * n[0], centre * n[1]])
  const step = niceStep(extent / 2)
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${W}`} className="mx-auto h-auto w-full max-w-[360px] rounded-lg border border-night-200 bg-night-50 dark:border-night-800 dark:bg-night-950" role="img" aria-label="La bande d’ombre autour du lieu">
        <defs>
          <clipPath id="plan-clip">
            <rect width={W} height={W} rx="8" />
          </clipPath>
        </defs>
        <g clipPath="url(#plan-clip)">
          <polygon points={[a1, a2, b2, b1].map((p) => p.join(',')).join(' ')} style={{ fill: OR }} fillOpacity="0.22" />
          {[
            [a1, a2],
            [b1, b2],
          ].map(([p, q], i) => (
            <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} style={{ stroke: OR }} strokeWidth="1.5" />
          ))}
          <line x1={m1[0]} y1={m1[1]} x2={m2[0]} y2={m2[1]} style={{ stroke: OR }} strokeWidth="1" strokeDasharray="6 4" />
          {!seen.inside && <line x1={c} y1={c} x2={foot[0]} y2={foot[1]} style={{ stroke: LUNE }} strokeWidth="1.5" strokeDasharray="2 3" />}
          <circle cx={c} cy={c} r="5" style={{ fill: LUNE }} />
          <text x={c + 8} y={c - 8} className="fill-night-700 text-[11px] dark:fill-night-200">
            {place}
          </text>
          {!seen.inside && (
            <text x={(c + foot[0]) / 2 + 6} y={(c + foot[1]) / 2 + 4} className="fill-night-600 font-mono text-[11px] dark:fill-night-300">
              {fmt(seen.distanceKm, 0)} km
            </text>
          )}
          {/* le nord et l'échelle */}
          <path d="M 22 34 L 28 18 L 34 34 L 28 30 Z" className="fill-night-500" />
          <text x="28" y="48" textAnchor="middle" className="fill-night-500 text-[11px] font-semibold">
            N
          </text>
          <line x1={W - 20 - step * k} y1={W - 20} x2={W - 20} y2={W - 20} className="stroke-night-500" strokeWidth="2" />
          <text x={W - 20 - (step * k) / 2} y={W - 28} textAnchor="middle" className="fill-night-500 font-mono text-[11px]">
            {step} km
          </text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-night-500">
        La bande d’ombre ({fmt(2 * seen.halfWidthKm, 0)} km de large ici) et sa ligne centrale en tirets, autour de {place}, le nord en haut.
      </figcaption>
    </figure>
  )
}

/** L'occultation choisie en mots, comme le panneau de Céleste. */
function Details({ seen, place }) {
  const e = seen.event
  const where = constellationAt(e.ra2000, e.dec2000)
  const constellation = getConstellation(where.symbol)
  const width = fmt(2 * seen.halfWidthKm, 0)
  const lines = [
    `Le ${longDate.format(seen.date)} à ${fmtTime(seen.date, true)} (${zone}), l’étoile à ${fmt(seen.alt, 0)}° de hauteur (${compass(seen.az)}).`,
    seen.inside
      ? `La bande passe sur le lieu : à ${fmt(seen.distanceKm, 0)} km de sa ligne centrale, pour une bande de ${width} km de large ici. L’étoile disparaît ${fmt(seen.duration, 1)} s.`
      : `La bande passe à ${fmt(seen.edgeKm, 0)} km du lieu (${compass(seen.direction)}) ; sa ligne centrale à ${fmt(seen.distanceKm, 0)} km, pour une bande de ${width} km de large ici.`,
    `Étoile de magnitude ${fmt(e.starMag, 1)} (AD ${fmtHMS(e.ra2000, 1)}, Déc ${fmtDMS(e.dec2000)}, ${where.name}), chute d’éclat de ${seen.drop != null ? fmt(seen.drop, 1) : '—'} magnitude${seen.drop >= 2 ? 's' : ''} ; astéroïde de ${fmt(e.diameterKm, 0)} km, magnitude ${e.mag != null ? fmt(e.mag, 1) : '—'}.`,
    `Lune éclairée à ${fmt(100 * seen.moonFraction, 0)} %, à ${fmt(seen.moonSeparation, 0)}° de l’étoile.`,
    `Prédiction IOTA (Occult), orbite ${e.orbit} : la bande peut se déplacer, à vérifier dans OccultWatcher les deux mois précédents.`,
  ]
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-1.5 text-sm">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
          <a href={OCCULT_WATCHER_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent-700 hover:underline dark:text-accent-400">
            OccultWatcher Cloud <ExternalLink size={14} aria-hidden="true" />
          </a>
          {constellation && (
            <Link to={constellationPath(constellation)} className="font-medium text-accent-700 hover:underline dark:text-accent-400">
              {constellation.name} →
            </Link>
          )}
        </div>
      </div>
      <BandPlan seen={seen} place={place} />
    </div>
  )
}

/** Les étoiles que des astéroïdes vont cacher près du lieu, comme la page des occultations de Céleste. */
export default function Occultations() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const [maxKm, setMaxKm] = useState(MAX_KM)
  const [months, setMonths] = useState(3)
  const [chosen, setChosen] = useState(null)

  // la période commence au début de l'heure choisie : les prédictions ne changent pas d'une minute à l'autre
  const start = useMemo(() => new Date(Math.floor(clock.date.getTime() / 3_600_000) * 3_600_000), [clock.date])
  const end = useMemo(() => new Date(start.getFullYear(), start.getMonth() + months, start.getDate(), start.getHours()), [start, months])
  const data = useOccultationEvents(start, end)
  const found = useMemo(
    () => (data ? moonlight(near(data.events, location.lat, location.lon, location.elevation ?? 0, { start, end, maxKm })) : null),
    [data, location, start, end, maxKm],
  )
  const inside = found ? found.filter((s) => s.inside).length : 0
  const selected = found ? (found.find((s) => keyOf(s) === chosen) ?? found.find((s) => s.inside) ?? found[0] ?? null) : null
  const place = location.name ?? `${fmtLat(location.lat, 2)}, ${fmtLon(location.lon, 2)}`

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <section className="card overflow-hidden">
        <div className="card-pad space-y-3 pb-0">
          <div>
            <h2 className="font-display text-lg font-semibold">Les occultations près de {place}</h2>
            <p className="mt-1 text-sm text-night-600 dark:text-night-400">
              Quand un astéroïde passe devant une étoile, son ombre balaie la Terre dans une bande étroite où l’étoile disparaît quelques secondes.
              Voici les bandes qui passent près du lieu, l’étoile à plus de 10° de hauteur dans un ciel noir, selon les prédictions de l’IOTA.
              Calculées des mois à l’avance, elles peuvent se déplacer de plus que leur largeur : vérifiez-les dans OccultWatcher les deux mois
              précédents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-night-600 dark:text-night-400">
            <span className="flex flex-wrap items-center gap-2" title="Distance entre le lieu et le bord de la bande, au sol">
              Bandes à moins de
              <Segmented size="sm" ariaLabel="Distance au lieu" value={maxKm} onChange={setMaxKm} options={DISTANCES} />
            </span>
            <span className="flex flex-wrap items-center gap-2">
              Période
              <Segmented size="sm" ariaLabel="Période" value={months} onChange={setMonths} options={PERIODS} />
            </span>
            <span className="text-night-500">
              {found
                ? `${found.length} occultation${found.length > 1 ? 's' : ''}${found.length ? ` · ${inside} sur le lieu` : ''}`
                : 'Prédictions de l’IOTA…'}
            </span>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          {found?.length ? (
            <table className="table-data sm:min-w-[820px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Astéroïde</th>
                  <th className="hidden text-right sm:table-cell">Étoile</th>
                  <th className="hidden sm:table-cell" title="Distance entre le lieu et le bord de la bande, au sol">
                    Bande
                  </th>
                  <th className="hidden text-right sm:table-cell">Durée</th>
                  <th className="hidden text-right sm:table-cell">Hauteur</th>
                </tr>
              </thead>
              <tbody>
                {found.map((s) => {
                  const key = keyOf(s)
                  const active = selected && key === keyOf(selected)
                  return (
                    <tr key={key} onClick={() => setChosen(key)} className={`cursor-pointer ${active ? 'bg-accent-500/10' : ''}`}>
                      <td className="whitespace-nowrap align-top">
                        <span className="hidden sm:inline">{dateTime.format(s.date)}</span>
                        <span className="sm:hidden">{dayTime.format(s.date)}</span>
                      </td>
                      <td className="whitespace-normal sm:whitespace-nowrap">
                        <button type="button" onClick={() => setChosen(key)} aria-pressed={active} className="text-left font-semibold text-accent-700 hover:underline dark:text-accent-400">
                          {asteroidLabel(s.event)}
                        </button>{' '}
                        <span className="text-xs text-night-500">· {fmt(s.event.diameterKm, 0)} km</span>
                        <span className="mt-0.5 block text-xs text-night-500 sm:hidden">
                          <span className={s.inside ? 'font-semibold text-or' : ''}>{whereText(s)}</span> · mag {fmt(s.event.starMag, 1)}
                          {s.inside && ` · ${fmt(s.duration, 1)} s`}
                        </span>
                      </td>
                      <td className="hidden text-right font-mono sm:table-cell">mag {fmt(s.event.starMag, 1)}</td>
                      <td className={`hidden sm:table-cell ${s.inside ? 'font-semibold text-or' : ''}`}>{whereText(s)}</td>
                      <td className="hidden text-right font-mono sm:table-cell">{s.inside ? `${fmt(s.duration, 1)} s` : '—'}</td>
                      <td className="hidden whitespace-nowrap text-right font-mono sm:table-cell">
                        {fmt(s.alt, 0)}° <span className="text-night-500">({compass(s.az)})</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            found && (
              <p className="card-pad text-sm text-night-500">
                Aucune bande à moins de {maxKm} km du lieu dans la période, avec l’étoile assez haute dans un ciel noir.
              </p>
            )
          )}
        </div>
      </section>

      {selected && (
        <section className="card card-pad">
          <h2 className="mb-3 font-display text-lg font-semibold">
            {asteroidLabel(selected.event)} cache l’étoile {selected.event.star}
          </h2>
          <Details seen={selected} place={place} />
        </section>
      )}

      <p className="text-xs text-night-500">
        Prédictions :{' '}
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
          IOTA
        </a>
        , Steve Preston, avec Occult de David Herald
        {data?.updated ? `, du ${longDate.format(new Date(`${data.updated}T12:00:00`))}, mises à jour chaque jour` : ''}. Le lieu n’est envoyé nulle
        part : les bandes qui passent près de lui sont calculées dans le navigateur, comme dans Céleste.
      </p>
    </div>
  )
}
