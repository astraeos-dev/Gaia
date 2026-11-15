import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import { compass, fmt, fmtTime } from '../../../lib/format'
import { makeObserver, startOfDay } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import { cometNight, cometSky, nightSamples } from '../comets/sky'
import { ASTEROIDS, SOURCE, UPDATED, asteroidPath, nextOpposition } from './data'

const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const fromIso = (iso) => new Date(`${iso}T12:00:00`)

function Tonight({ night }) {
  if (!night.visible) return <span className="text-night-400">non</span>
  return (
    <span>
      {fmt(night.best.alt, 0)}° vers {fmtTime(night.best.t)} <span className="text-night-500">({compass(night.best.az)})</span>
    </span>
  )
}

/**
 * Les astéroïdes brillants et les planètes naines, comme la liste d'In-The-Sky : magnitude prévue, position et
 * visibilité chez vous, prochaine opposition.
 */
export default function AsteroidList() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const day = startOfDay(clock.date).getTime()

  // Les oppositions ne dépendent que du jour
  const oppositions = useMemo(() => new Map(ASTEROIDS.map((a) => [a.id, nextOpposition(a, new Date(day))])), [day])

  const rows = useMemo(() => {
    const samples = nightSamples(observer, clock.date)
    return ASTEROIDS.map((a) => ({ a, sky: cometSky(a, clock.date, observer), night: cometNight(a, samples) })).sort(
      (x, y) => (x.sky.mag ?? 99) - (y.sky.mag ?? 99),
    )
  }, [observer, clock.date])

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <section className="card overflow-hidden">
        <div className="card-pad pb-0">
          <h2 className="font-display text-lg font-semibold">Astéroïdes brillants et planètes naines</h2>
          <p className="mt-1 text-sm text-night-600 dark:text-night-400">
            Les astéroïdes qui passent sous la magnitude 10 à leurs bonnes oppositions (une jumelle suffit pour Vesta, Cérès ou Pallas), puis les
            planètes naines au-delà de Neptune, du plus brillant au plus faible à l’heure choisie. Position et hauteur pour {location.name ?? 'votre lieu'} ;
            « Cette nuit » : la meilleure hauteur quand le Soleil est sous −12°.
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table-data min-w-[880px]">
            <thead>
              <tr>
                <th>Astre</th>
                <th className="text-right">Magnitude</th>
                <th className="text-right">Écart au Soleil</th>
                <th className="text-right">Hauteur</th>
                <th>Azimut</th>
                <th>Constellation</th>
                <th>Cette nuit</th>
                <th>Prochaine opposition</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, sky, night }) => {
                const opp = oppositions.get(a.id)
                return (
                  <tr key={a.id}>
                    <td>
                      <Link to={asteroidPath(a)} className="group block">
                        <span className="font-semibold text-accent-700 group-hover:underline dark:text-accent-400">{a.designation}</span>
                        <span className="block text-xs text-night-500">
                          {a.dwarf ? 'planète naine' : 'astéroïde'}
                          {a.diameter != null && ` · ${fmt(a.diameter, 0)} km`}
                        </span>
                      </Link>
                    </td>
                    <td className="text-right font-mono">{sky.mag != null ? fmt(sky.mag, 1) : '—'}</td>
                    <td className={`text-right font-mono ${sky.elongation < 30 ? 'text-alerte' : ''}`}>{fmt(sky.elongation, 0)}°</td>
                    <td className={`text-right font-mono ${sky.alt < 0 ? 'text-night-400' : ''}`}>{fmt(sky.alt, 1)}°</td>
                    <td className="font-mono">
                      {fmt(sky.az, 0)}° <span className="text-night-500">({compass(sky.az)})</span>
                    </td>
                    <td>{sky.constellation.name}</td>
                    <td>
                      <Tonight night={night} />
                    </td>
                    <td>
                      {opp ? (
                        <>
                          {dayMonthYear.format(opp.t)} <span className="font-mono text-night-500">(mag {fmt(opp.mag, 1)})</span>
                        </>
                      ) : (
                        <span className="text-night-500">en ce moment</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-night-500">
        Orbites : {SOURCE}, données du {dayMonthYear.format(fromIso(UPDATED))}, mises à jour chaque jour. Magnitudes prévues par le système H, G de
        l’UAI ; positions : orbites à deux corps, à quelques secondes d’arc de JPL Horizons pour Vesta.
      </p>
    </div>
  )
}
