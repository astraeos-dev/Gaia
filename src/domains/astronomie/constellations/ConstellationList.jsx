import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtTime } from '../../../lib/format'
import { makeObserver } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import { nightSamples } from '../comets/sky'
import { CONSTELLATIONS, MONTHS, VISIBILITY, constellationFacts, constellationPath, visibility } from './geometry'
import { bestInDarkness } from './night'

const plain = (text) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()

const SORTS = [
  { value: 'name', label: 'Nom' },
  { value: 'tonight', label: 'Cette nuit' },
  { value: 'month', label: 'Mois' },
  { value: 'area', label: 'Taille' },
]

/** Les 88 constellations, comme la liste d'In-The-Sky : taille, mois favorable et visibilité chez vous cette nuit. */
export default function ConstellationList() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('name')
  const [visibleOnly, setVisibleOnly] = useState(false)

  const rows = useMemo(() => {
    const facts = constellationFacts()
    const samples = nightSamples(observer, clock.date)
    return CONSTELLATIONS.map((c) => {
      const f = facts[c.id]
      return {
        ...f,
        visibility: visibility(c.id, location.lat),
        night: bestInDarkness(f.center.ra * 15, f.center.dec, samples),
      }
    })
  }, [observer, clock.date, location.lat])

  const month = clock.date.getMonth() + 1
  const shown = rows
    .filter((r) => !query || plain(`${r.name} ${r.latin} ${r.id}`).includes(plain(query)))
    .filter((r) => !visibleOnly || (r.night && r.night.alt >= 20))
    .sort((a, b) => {
      if (sort === 'area') return b.area - a.area
      if (sort === 'tonight') return (b.night?.alt ?? -90) - (a.night?.alt ?? -90)
      if (sort === 'month') return ((a.month - month + 12) % 12) - ((b.month - month + 12) % 12) || a.name.localeCompare(b.name, 'fr')
      return 0 // l'ordre alphabétique de CONSTELLATIONS
    })

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <section className="card overflow-hidden">
        <div className="card-pad space-y-3 pb-0">
          <div>
            <h2 className="font-display text-lg font-semibold">Les 88 constellations</h2>
            <p className="mt-1 text-sm text-night-600 dark:text-night-400">
              Les constellations officielles de l’Union astronomique internationale, avec leurs limites de 1930. « Au plus haut à 22 h » : le mois où
              elle passe au méridien à 22 h ; « Cette nuit » : la meilleure hauteur de son centre à {location.name ?? 'votre lieu'} quand le Soleil
              est sous −12°.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Chercher une constellation</span>
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-night-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Orion, Cygnus, UMa…"
                className="input w-56 pl-8"
              />
            </label>
            <Segmented size="sm" ariaLabel="Trier par" value={sort} onChange={setSort} options={SORTS} />
            <label className="flex items-center gap-2 text-sm text-night-600 dark:text-night-400">
              <input type="checkbox" checked={visibleOnly} onChange={(e) => setVisibleOnly(e.target.checked)} className="accent-accent-500" />À plus
              de 20° cette nuit
            </label>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table-data min-w-[760px]">
            <thead>
              <tr>
                <th>Constellation</th>
                <th>Abrév.</th>
                <th className="text-right">Superficie</th>
                <th>Au plus haut à 22 h</th>
                <th>Visible d’ici</th>
                <th>Cette nuit</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={constellationPath(r)} className="group block">
                      <span className="font-semibold text-accent-700 group-hover:underline dark:text-accent-400">{r.name}</span>
                      <span className="block text-xs text-night-500">{r.latin}</span>
                    </Link>
                  </td>
                  <td className="font-mono">{r.id}</td>
                  <td className="text-right font-mono" title={`${r.rank}e par la taille sur 88`}>
                    {fmt(r.area, 0)} deg² <span className="text-xs text-night-500">({r.rank}e)</span>
                  </td>
                  <td>{MONTHS[r.month - 1]}</td>
                  <td className={r.visibility === 'none' ? 'text-night-400' : ''}>{VISIBILITY[r.visibility]}</td>
                  <td>
                    {r.night && r.night.alt > 0 ? (
                      <span>
                        {fmt(r.night.alt, 0)}° vers {fmtTime(r.night.t)} <span className="text-night-500">({compass(r.night.az)})</span>
                      </span>
                    ) : (
                      <span className="text-night-400">sous l’horizon</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="card-pad text-sm text-night-500">Aucune constellation ne correspond.</p>}
        </div>
      </section>
      <p className="text-xs text-night-500">
        Limites : E. Delporte pour l’UAI (1930), ramenées à J2000, de d3-celestial. Superficies calculées sur ces limites ; elles ne s’écartent des
        valeurs officielles que d’un degré carré au plus. Comme les cartes des constellations de Céleste.
      </p>
    </div>
  )
}
