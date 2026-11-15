import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import { compass, fmt, fmtTime } from '../../../lib/format'
import { addDays, makeObserver } from '../lib/astro'
import { cometPosition } from '../lib/comets'
import TimeControls from '../components/TimeControls'
import { COMETS, SOURCES, UPDATED, cometNight, cometPath, cometSky, nightSamples } from './sky'

const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const fromIso = (iso) => new Date(`${iso}T12:00:00`)

/** La tendance de l'éclat prévu sur quinze jours (une magnitude qui baisse est un astre qui brille plus). */
function Trend({ change }) {
  if (change == null || Math.abs(change) < 0.2) return <span className="text-night-400">stable</span>
  return change < 0 ? (
    <span className="inline-flex items-center gap-1 text-ok">
      <TrendingUp size={14} aria-hidden="true" /> plus brillante
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-night-500">
      <TrendingDown size={14} aria-hidden="true" /> plus faible
    </span>
  )
}

function Tonight({ night }) {
  if (!night.visible) return <span className="text-night-400">non</span>
  return (
    <span>
      {fmt(night.best.alt, 0)}° vers {fmtTime(night.best.t)} <span className="text-night-500">({compass(night.best.az)})</span>
    </span>
  )
}

function CometCell({ comet }) {
  return (
    <Link to={cometPath(comet)} className="group block">
      <span className="font-semibold text-accent-700 group-hover:underline dark:text-accent-400">{comet.short}</span>
      {comet.name && <span className="block text-xs text-night-500">{comet.name}</span>}
    </Link>
  )
}

/** Les comètes observables, comme la liste de Heavens-Above, avec leur visibilité la nuit chez vous. */
export default function CometList() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])

  const rows = useMemo(() => {
    const samples = nightSamples(observer, clock.date)
    return COMETS.map((comet) => {
      const sky = cometSky(comet, clock.date, observer)
      const later = cometPosition(comet.el, addDays(clock.date, 15)).mag
      return {
        comet,
        sky,
        night: cometNight(comet, samples),
        trend: later != null && sky.mag != null ? later - sky.mag : null,
      }
    })
  }, [observer, clock.date])

  const observed = rows.filter((r) => r.comet.observed)
  const upcoming = rows.filter((r) => !r.comet.observed && r.comet.predictedPeak)

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <section className="card overflow-hidden">
        <div className="card-pad pb-0">
          <h2 className="font-display text-lg font-semibold">Les comètes observées ce mois-ci</h2>
          <p className="mt-1 text-sm text-night-600 dark:text-night-400">
            Les {observed.length} comètes observées à la magnitude 16 ou plus brillante ces 30 derniers jours, de la plus brillante à la plus
            faible. La position et la hauteur sont calculées pour {location.name ?? 'votre lieu'} à l’heure choisie ; « Cette nuit » donne la
            meilleure hauteur quand le Soleil est sous −12°.
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table-data min-w-[860px]">
            <thead>
              <tr>
                <th>Comète</th>
                <th className="text-right">Magnitude</th>
                <th>Observée le</th>
                <th>Tendance</th>
                <th className="text-right">Écart au Soleil</th>
                <th className="text-right">Hauteur</th>
                <th>Azimut</th>
                <th>Constellation</th>
                <th>Cette nuit</th>
              </tr>
            </thead>
            <tbody>
              {observed.map(({ comet, sky, night, trend }) => (
                <tr key={comet.id}>
                  <td>
                    <CometCell comet={comet} />
                  </td>
                  <td className="text-right font-mono" title="Dernière magnitude totale observée (COBS)">
                    {fmt(comet.observed.mag, 1)}
                  </td>
                  <td>{dayMonth.format(fromIso(comet.observed.date))}</td>
                  <td>
                    <Trend change={trend} />
                  </td>
                  <td className={`text-right font-mono ${sky.elongation < 30 ? 'text-alerte' : ''}`}>{fmt(sky.elongation, 0)}°</td>
                  <td className={`text-right font-mono ${sky.alt < 0 ? 'text-night-400' : ''}`}>{fmt(sky.alt, 1)}°</td>
                  <td className="font-mono">
                    {fmt(sky.az, 0)}° <span className="text-night-500">({compass(sky.az)})</span>
                  </td>
                  <td>{sky.constellation.name}</td>
                  <td>
                    <Tonight night={night} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="card overflow-hidden">
          <div className="card-pad pb-0">
            <h2 className="font-display text-lg font-semibold">À venir</h2>
            <p className="mt-1 text-sm text-night-600 dark:text-night-400">
              Comètes que les paramètres du Minor Planet Center donnent plus brillantes que la magnitude 12 dans l’année, sans observation récente.
              Une prévision d’éclat de comète peut se tromper de plusieurs magnitudes.
            </p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="table-data min-w-[640px]">
              <thead>
                <tr>
                  <th>Comète</th>
                  <th className="text-right">Pic prévu</th>
                  <th>Vers le</th>
                  <th className="text-right">Écart au Soleil au pic</th>
                  <th className="text-right">Magnitude prévue aujourd’hui</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(({ comet, sky }) => {
                  const peakDate = fromIso(comet.predictedPeak.date)
                  const atPeak = cometPosition(comet.el, peakDate)
                  return (
                    <tr key={comet.id}>
                      <td>
                        <CometCell comet={comet} />
                      </td>
                      <td className="text-right font-mono">{fmt(comet.predictedPeak.mag, 1)}</td>
                      <td>{dayMonthYear.format(peakDate)}</td>
                      <td className={`text-right font-mono ${atPeak.elongation < 30 ? 'text-alerte' : ''}`}>{fmt(atPeak.elongation, 0)}°</td>
                      <td className="text-right font-mono">{sky.mag != null ? fmt(sky.mag, 1) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex items-start gap-2 text-sm text-night-600 dark:text-night-400">
        <TriangleAlert size={16} className="mt-0.5 shrink-0 text-alerte" aria-hidden="true" />
        <p>
          Un écart au Soleil inférieur à 30° est signalé en rouge : ne pointez jamais une jumelle ou un instrument vers une comète proche du
          Soleil sans être sûr que le Soleil est couché.
        </p>
      </div>
      <p className="text-xs text-night-500">
        Observations : {SOURCES.observations}. Orbites : {SOURCES.orbits}. Données du {dayMonthYear.format(fromIso(UPDATED))}, mises à jour
        chaque jour. Positions : orbites à deux corps, comme Céleste.
      </p>
    </div>
  )
}
