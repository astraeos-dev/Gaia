import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtDMS, fmtHMS, fmtLat, fmtLon, fmtTime } from '../../../lib/format'
import { constellationAt, makeObserver } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import { nightSamples } from '../comets/sky'
import { constellationPath, getConstellation } from '../constellations/geometry'
import ConstellationChart, { ChartLegend } from '../constellations/ConstellationChart'
import { NOVAE_URL, RECENT_DAYS, addDaysIso, chosen, distanceMly } from './transients'
import { OBJECTS, SOURCES, UPDATED, bestTonight, kindText } from './sky'

const MAGS = [12, 13, 14, 15, 16, 17].map((m) => ({ value: m, label: String(m) }))
const MONTHS = [3, 6, 12, 24].map((n) => ({ value: n, label: `${n} mois` }))

const fromIso = (day) => new Date(`${day}T12:00:00`)
const shortDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const longDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const isoToday = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** La dernière magnitude quand elle est récente ; sinon le maximum (une nova qui a pâli depuis, ou celles de Koji Mukai, qui ne donne que le maximum). */
function magText(o, today) {
  const recent = o.magDate != null && o.magDate >= addDaysIso(today, -RECENT_DAYS)
  if (o.mag != null && (recent || o.peak == null)) return { text: fmt(o.mag, 1), date: o.magDate }
  if (o.peak != null) return { text: `max ${fmt(o.peak, 1)}` }
  return { text: '—' }
}

/** Les liens d'un objet : le Transient Name Server pour un nom « SN » ou « AT », l'AAVSO pour une étoile variable. */
function links(o) {
  const out = []
  const tns = [o.name, ...o.aka].map((n) => /^(?:SN|AT) ?(\d{4}[a-z]+)$/.exec(n)).find(Boolean)
  if (tns) out.push({ href: `https://www.wis-tns.org/object/${tns[1]}`, label: 'Transient Name Server' })
  if (o.kind === 'nova' && o.host == null) out.push({ href: `https://www.aavso.org/vsx/index.php?view=results.get&ident=${encodeURIComponent(o.name)}`, label: 'AAVSO (VSX)' })
  return out
}

/** L'objet choisi en mots, comme le panneau de Céleste, avec la carte de sa constellation. */
function Details({ object: o, tonight, today, place }) {
  const where = constellationAt(o.ra, o.dec)
  const constellation = getConstellation(where.symbol)
  const lines = []
  if (o.aka.length) lines.push(`Aussi : ${o.aka.slice(0, 4).join(', ')}.`)
  lines.push(o.host ? `Dans la galaxie ${o.host} (${where.name}).` : `Dans notre galaxie, constellation ${where.name}.`)
  lines.push(`AD ${fmtHMS(o.ra, 1)}, Déc ${fmtDMS(o.dec, { secondsDigits: 0 })} (J2000).`)
  if (o.mag != null) lines.push(`Magnitude ${fmt(o.mag, 1)}${o.magDate ? ` le ${longDay.format(fromIso(o.magDate))}` : ''} (dernière mesure).`)
  if (o.peak != null) lines.push(`Éclat maximal : magnitude ${fmt(o.peak, 1)}${o.peakDate ? ` le ${longDay.format(fromIso(o.peakDate))}` : ''}.`)
  if (o.discovered) lines.push(`Découverte le ${longDay.format(fromIso(o.discovered))}${o.discoverer ? ` par ${o.discoverer}` : ''}.`)
  const mly = distanceMly(o.z)
  if (mly) lines.push(`À environ ${fmt(mly, 0)} millions d’années-lumière (d’après le décalage vers le rouge de sa galaxie).`)
  lines.push(
    tonight
      ? `Cette nuit, au plus haut dans le noir à ${fmtTime(tonight.t)} : ${fmt(tonight.alt, 0)}° de hauteur (${compass(tonight.az)}), depuis ${place}.`
      : `Pas assez haute dans un ciel noir cette nuit depuis ${place}.`,
  )
  const marks = useMemo(() => [{ ra: o.ra * 15, dec: o.dec, label: o.name }], [o])
  const fresh = o.magDate != null && o.magDate >= addDaysIso(today, -RECENT_DAYS)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-1.5 text-sm">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {!fresh && o.kind === 'nova' && o.host == null && (
          <p className="text-night-500">Une nova pâlit vite : son éclat d’aujourd’hui est bien plus faible que son maximum.</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
          {links(o).map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-accent-700 hover:underline dark:text-accent-400">
              {l.label} <ExternalLink size={14} aria-hidden="true" />
            </a>
          ))}
          {constellation && (
            <Link to={constellationPath(constellation)} className="font-medium text-accent-700 hover:underline dark:text-accent-400">
              {constellation.name} →
            </Link>
          )}
        </div>
      </div>
      {constellation && (
        <figure className="min-w-0">
          <ConstellationChart constellation={constellation} marks={marks} />
          <figcaption className="mt-2 space-y-1">
            <ChartLegend />
            <p className="text-xs text-night-500">
              {o.name} est entouré en doré{o.host ? `, sur sa galaxie ${o.host}` : ''}. Le nord est en haut et l’est à gauche, comme dans le ciel.
            </p>
          </figcaption>
        </figure>
      )}
    </div>
  )
}

/** Les novae et les supernovae du moment, comme la page de Céleste : listes de David Bishop et de Koji Mukai. */
export default function Transients() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [magLimit, setMagLimit] = useState(15)
  const [months, setMonths] = useState(12)
  const [chosenName, setChosenName] = useState(null)

  const today = isoToday(clock.date)
  const shown = useMemo(() => chosen(OBJECTS, today, { magLimit, novaDays: Math.round(months * 30.44) }), [today, magLimit, months])
  const samples = useMemo(() => nightSamples(observer, clock.date, 5), [observer, clock.date])
  const tonight = useMemo(() => new Map(shown.map((o) => [o.name, bestTonight(o, samples)])), [shown, samples])
  const visible = shown.filter((o) => tonight.get(o.name)).length
  const selected = shown.find((o) => o.name === chosenName) ?? shown.find((o) => tonight.get(o.name)) ?? shown[0] ?? null
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
            <h2 className="font-display text-lg font-semibold">Les étoiles nouvelles du moment</h2>
            <p className="mt-1 text-sm text-night-600 dark:text-night-400">
              Les supernovae des galaxies proches assez brillantes pour un télescope d’amateur, et les novae de notre galaxie et des galaxies
              voisines. Leur éclat change d’une nuit à l’autre : la magnitude est la dernière mesurée (pour une nova de notre galaxie, son
              maximum). « Cette nuit » : quand l’objet est au plus haut à {place}, le Soleil sous −12°, s’il dépasse 20°.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-night-600 dark:text-night-400">
            <span className="flex flex-wrap items-center gap-2" title="Les supernovae et les novae des autres galaxies plus brillantes que cette magnitude à leur dernière mesure">
              Plus brillantes que la magnitude
              <Segmented size="sm" ariaLabel="Magnitude limite" value={magLimit} onChange={setMagLimit} options={MAGS} />
            </span>
            <span className="flex flex-wrap items-center gap-2" title="Les novae de notre galaxie découvertes dans cette période">
              Novae de notre galaxie des
              <Segmented size="sm" ariaLabel="Novae découvertes depuis" value={months} onChange={setMonths} options={MONTHS} />
            </span>
            <span className="text-night-500">
              {shown.length} objet{shown.length > 1 ? 's' : ''} · {visible} visible{visible > 1 ? 's' : ''} cette nuit
            </span>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          {shown.length ? (
            <table className="table-data sm:min-w-[820px]">
              <thead>
                <tr>
                  <th>Objet</th>
                  <th className="hidden sm:table-cell">Type</th>
                  <th className="hidden sm:table-cell">Où</th>
                  <th className="text-right">Magnitude</th>
                  <th className="hidden sm:table-cell">Découverte</th>
                  <th className="hidden sm:table-cell">Cette nuit</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => {
                  const mag = magText(o, today)
                  const best = tonight.get(o.name)
                  const active = selected?.name === o.name
                  const where = o.host ?? constellationAt(o.ra, o.dec).name
                  return (
                    <tr key={o.name} onClick={() => setChosenName(o.name)} className={`cursor-pointer ${active ? 'bg-accent-500/10' : ''}`}>
                      <td className="whitespace-normal sm:whitespace-nowrap">
                        <button type="button" onClick={() => setChosenName(o.name)} aria-pressed={active} className="text-left font-semibold text-accent-700 hover:underline dark:text-accent-400">
                          {o.name}
                        </button>
                        {/* Sur un téléphone, le type, le lieu et la nuit sous le nom */}
                        <span className="mt-0.5 block text-xs text-night-500 sm:hidden">
                          {kindText(o)} · {where}
                          {best && ` · ${fmtTime(best.t)}, ${fmt(best.alt, 0)}°`}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell">{kindText(o)}</td>
                      <td className="hidden sm:table-cell">{o.host ? `${o.host} (${constellationAt(o.ra, o.dec).name})` : where}</td>
                      <td className="text-right font-mono" title={mag.date ? `le ${shortDay.format(fromIso(mag.date))}` : undefined}>
                        {mag.text}
                      </td>
                      <td className="hidden sm:table-cell">{o.discovered ? shortDay.format(fromIso(o.discovered)) : '—'}</td>
                      <td className="hidden sm:table-cell">
                        {best ? (
                          <span>
                            {fmtTime(best.t)} · {fmt(best.alt, 0)}° <span className="text-night-500">({compass(best.az)})</span>
                          </span>
                        ) : (
                          <span className="text-night-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="card-pad text-sm text-night-500">Aucune nova ni supernova assez brillante pour ces choix.</p>
          )}
        </div>
      </section>

      {selected && (
        <section className="card card-pad">
          <h2 className="mb-3 font-display text-lg font-semibold">
            {selected.name} <span className="text-base font-normal text-night-500">· {kindText(selected)}</span>
          </h2>
          <Details object={selected} tonight={tonight.get(selected.name)} today={today} place={place} />
        </section>
      )}

      <p className="text-xs text-night-500">
        Listes : «{' '}
        <a href={SOURCES.supernovae?.from ?? 'https://www.rochesterastronomy.org/supernova.html'} target="_blank" rel="noreferrer" className="underline">
          Latest Supernovae
        </a>{' '}
        » de David Bishop (rochesterastronomy.org) et «{' '}
        <a href={NOVAE_URL} target="_blank" rel="noreferrer" className="underline">
          Recent Galactic Novae
        </a>{' '}
        » de Koji Mukai (NASA Goddard), du {longDay.format(fromIso(UPDATED))}, mises à jour chaque jour. Comme la page des novae et supernovae
        de Céleste.
      </p>
    </div>
  )
}
