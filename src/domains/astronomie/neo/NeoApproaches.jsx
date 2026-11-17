import { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtLat, fmtLon, fmtTime } from '../../../lib/format'
import { addDays, altitudeSeries, constellationAt, makeObserver } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import AltitudeChart from '../components/AltitudeChart'
import { LUNE, OR } from '../../../kit/charte'
import { nightStart } from '../comets/sky'
import { APPROACHES, SOURCE, UPDATED } from './data'
import { ephemerisOf } from './ephemerides'
import { kmText, ldText, minutesText, sizeText } from './format'
import { AU_KM, FAINTEST, SOURCE_URL, approachKey, bestMagnitude, lunarDistances, notable, seenFrom, sizeM, windows, worthAnEphemeris } from './neo'

const PERIODS = [
  { value: 30, label: '30 jours' },
  { value: 60, label: '60 jours' },
  { value: 365, label: 'Un an' },
]

const dateTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const dayTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
const ld = ldText
const km = kmText

/** Ce que le lieu voit d'un passage qui a des éphémérides : la magnitude au plus près et les moments où le voir. */
function sightOf(approach, observer) {
  const ephemeris = ephemerisOf(approach)
  if (!ephemeris) return null
  if (ephemeris.error) return { error: ephemeris.error }
  const seen = seenFrom(ephemeris.rows, observer)
  const nearest = seen.reduce((a, b) => (Math.abs(b.date - approach.date) < Math.abs(a.date - approach.date) ? b : a))
  return {
    seen,
    mag: nearest.mag,
    windows: windows(seen).map((w) => ({ ...w, constellation: constellationAt(w.best.ra, w.best.dec).name })),
    span: [seen[0].date, seen.at(-1).date],
  }
}

/** La magnitude d'un passage, pour le tableau : celle d'Horizons au plus près (et s'il se voit d'ici), sinon une borne. */
function magnitude(approach, sight) {
  if (sight?.mag != null) return { text: fmt(sight.mag, 1), visible: sight.windows.length > 0 && sight.mag <= FAINTEST }
  const best = bestMagnitude(approach)
  if (best == null) return { text: '—', bound: true }
  return { text: best > FAINTEST ? `> ${fmt(FAINTEST, 0)}` : `≤ ${fmt(best, 1)}`, bound: true }
}

const VISIBLE_CHIP = 'chip ml-2 border-ok/40 text-ok dark:border-ok/40 dark:text-ok'

function MagCell({ mag }) {
  return (
    <span className={mag.bound ? 'text-night-500' : ''}>
      {mag.text}
      {mag.visible && <span className={VISIBLE_CHIP}>visible</span>}
    </span>
  )
}

/** Le passage choisi en mots : quand et à quelle distance, sa taille et sa vitesse, et ce que le lieu en voit. */
function Details({ approach, sight, now, place }) {
  const lines = []
  const size = sizeM(approach)
  lines.push(
    `Au plus près le ${longDate.format(approach.date)} à ${fmtTime(approach.date)} (${zone}), à ${km(approach.distanceAu * AU_KM)} : ${fmt(lunarDistances(approach.distanceAu), 2)} fois la distance de la Lune.`,
  )
  if (approach.sigmaMinutes) lines.push(`Heure connue à ±${minutesText(approach.sigmaMinutes)} près.`)
  if (approach.distanceMaxAu - approach.distanceMinAu > 0.02 * approach.distanceAu)
    lines.push(`Entre ${km(approach.distanceMinAu * AU_KM)} et ${km(approach.distanceMaxAu * AU_KM)} selon l’incertitude de l’orbite.`)
  if (approach.diameterKm) lines.push(`Diamètre mesuré : ${fmt(size[0], 0)} m.`)
  else if (size) lines.push(`Taille estimée : ${fmt(size[0], 0)} à ${fmt(size[1], 0)} m selon que sa surface est claire ou sombre (magnitude absolue ${fmt(approach.h, 1)}).`)
  if (approach.speed) lines.push(`Vitesse par rapport à la Terre : ${fmt(approach.speed, 1)} km/s.`)

  const best = bestMagnitude(approach)
  const seenLines = []
  if (sight?.error) seenLines.push(`Positions de JPL Horizons indisponibles (${sight.error}).`)
  else if (sight) {
    if (sight.mag != null) seenLines.push(`Magnitude ${fmt(sight.mag, 1)} au plus près (JPL Horizons).`)
    for (const w of sight.windows.slice(0, 4)) {
      const b = w.best
      seenLines.push(
        `Visible du ${dayTime.format(w.start)} au ${dayTime.format(w.end)} : au mieux magnitude ${b.mag != null ? fmt(b.mag, 1) : '—'} le ${dayTime.format(b.date)}, à ${fmt(b.alt, 0)}° de hauteur (${compass(b.az)}), dans ${w.constellation}, ${fmt(b.rate, 0)}″ par minute.`,
      )
    }
    if (!sight.windows.length)
      seenLines.push(`Jamais haut dans un ciel noir depuis ${place} entre le ${dayTime.format(sight.span[0])} et le ${dayTime.format(sight.span[1])}.`)
  } else if (best != null && best > FAINTEST) seenLines.push(`Trop faible pour un instrument d’amateur : au mieux magnitude ${fmt(best, 1)}, même vu plein.`)
  else if (best != null && approach.date >= now)
    seenLines.push(`Au mieux magnitude ${fmt(best, 1)} s’il était vu plein. Ses positions sont demandées à JPL Horizons quand il passe dans les 60 prochains jours.`)

  return (
    <div className="space-y-1.5 text-sm">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {seenLines.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-night-100 pt-3 dark:border-night-800">
          {seenLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}

/** La hauteur de l'astéroïde la nuit où il se voit le mieux, avec le Soleil en fond. */
function NightChart({ approach, sight, observer, now }) {
  const chart = useMemo(() => {
    const brightest = sight.windows.reduce((a, b) => (a && (a.best.mag ?? 99) <= (b.best.mag ?? 99) ? a : b), null)
    const start = nightStart(brightest ? brightest.best.date : approach.date)
    const end = addDays(start, 1)
    const points = sight.seen.filter((r) => r.date >= start && r.date <= end).map((r) => ({ t: r.date, alt: r.alt }))
    if (points.length < 2) return null
    const from = points[0].t
    const to = points.at(-1).t
    return {
      start: from,
      end: to,
      series: [
        { id: 'Sun', name: 'Soleil', color: OR, points: altitudeSeries('Sun', observer, from, to, 10) },
        { id: 'neo', name: approach.name, color: LUNE, points },
      ],
    }
  }, [approach, sight, observer])
  if (!chart) return null
  return (
    <div className="mt-4">
      <AltitudeChart series={chart.series} start={chart.start} end={chart.end} now={now} />
      <p className="mt-1 text-xs text-night-500">
        Sa hauteur vue du lieu la nuit où il se voit le mieux ; le fond suit le Soleil (jour, crépuscules, nuit). Sans réfraction, comme JPL
        Horizons.
      </p>
    </div>
  )
}

/** Les astéroïdes qui passent près de la Terre, comme la page des géocroiseurs de Céleste et la liste du CNEOS. */
export default function NeoApproaches() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [period, setPeriod] = useState(60)
  const [notableOnly, setNotableOnly] = useState(false)
  const [chosen, setChosen] = useState(null)

  // Ce que le lieu voit des passages qui ont des éphémérides (une douzaine au plus) : une fois par lieu
  const sights = useMemo(() => {
    const out = new Map()
    for (const a of APPROACHES) {
      if (!worthAnEphemeris(a)) continue
      const sight = sightOf(a, observer)
      if (sight) out.set(approachKey(a), sight)
    }
    return out
  }, [observer])

  const now = clock.date
  const shown = APPROACHES.filter((a) => a.date >= addDays(now, -1) && a.date <= addDays(now, period) && (!notableOnly || notable(a)))
  const fallback =
    shown.find((a) => sights.get(approachKey(a))?.windows?.length && a.date >= now) ?? shown.find((a) => a.date >= now) ?? shown[0] ?? null
  const selected = shown.find((a) => approachKey(a) === chosen) ?? fallback
  const selectedSight = selected ? sights.get(approachKey(selected)) : null
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
            <h2 className="font-display text-lg font-semibold">Les passages près de la Terre</h2>
            <p className="mt-1 text-sm text-night-600 dark:text-night-400">
              Les astéroïdes qui passent à moins de 0,05 ua de la Terre (19,5 fois la distance de la Lune), d’après le CNEOS (NASA/JPL). La plupart ne
              mesurent que quelques mètres et restent invisibles. Pour ceux qui pourraient dépasser la magnitude 16, leurs positions viennent de JPL
              Horizons et la page calcule quand les voir depuis {place}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented size="sm" ariaLabel="Période" value={period} onChange={setPeriod} options={PERIODS} />
            <label className="flex items-center gap-2 text-sm text-night-600 dark:text-night-400" title="140 m et plus, ou plus près que la Lune">
              <input type="checkbox" checked={notableOnly} onChange={(e) => setNotableOnly(e.target.checked)} className="accent-accent-500" />
              Seulement les remarquables
            </label>
            <span className="text-sm text-night-500">
              {shown.length} passage{shown.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          {shown.length ? (
            <table className="table-data sm:min-w-[760px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Astéroïde</th>
                  <th className="hidden text-right sm:table-cell" title="En distances lunaires (DL) : 384 400 km, la distance moyenne de la Lune">
                    Distance
                  </th>
                  <th className="hidden text-right sm:table-cell">Taille</th>
                  <th className="hidden text-right sm:table-cell">Vitesse</th>
                  <th
                    className="hidden text-right sm:table-cell"
                    title="Magnitude au plus près selon JPL Horizons ; « ≤ » : au mieux, s’il était vu plein ; « visible » : haut dans un ciel noir depuis le lieu"
                  >
                    Magnitude
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => {
                  const key = approachKey(a)
                  const active = selected && key === approachKey(selected)
                  const mag = magnitude(a, sights.get(key))
                  return (
                    <tr key={key} onClick={() => setChosen(key)} className={`cursor-pointer ${active ? 'bg-accent-500/10' : ''} ${a.date < now ? 'text-night-500' : ''}`}>
                      <td className="whitespace-nowrap align-top">
                        <span className="hidden sm:inline">{dateTime.format(a.date)}</span>
                        <span className="sm:hidden">{dayTime.format(a.date)}</span>
                      </td>
                      <td className="whitespace-normal sm:whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setChosen(key)}
                          aria-pressed={active}
                          className={`text-left text-accent-700 hover:underline dark:text-accent-400 ${notable(a) ? 'font-semibold' : ''}`}
                        >
                          {a.name}
                        </button>
                        {notable(a) && (
                          <span className="chip ml-2 border-or/40 text-or dark:border-or/40 dark:text-or" title="140 m et plus, ou plus près que la Lune">
                            remarquable
                          </span>
                        )}
                        {/* Sur un téléphone, deux colonnes : la distance, la taille et l'éclat sous le nom, comme dans Céleste */}
                        <span className="mt-0.5 block whitespace-normal font-mono text-xs text-night-500 sm:hidden">
                          <span className="whitespace-nowrap">{ld(a.distanceAu)}</span> · <span className="whitespace-nowrap">{sizeText(a)}</span> ·{' '}
                          <span className="whitespace-nowrap">mag {mag.text}</span>
                          {mag.visible && <span className={VISIBLE_CHIP}>visible</span>}
                        </span>
                      </td>
                      <td className="hidden text-right font-mono sm:table-cell" title={km(a.distanceAu * AU_KM)}>
                        {ld(a.distanceAu)}
                      </td>
                      <td className="hidden whitespace-nowrap text-right font-mono sm:table-cell">{sizeText(a)}</td>
                      <td className="hidden whitespace-nowrap text-right font-mono sm:table-cell">{a.speed ? `${fmt(a.speed, 1)} km/s` : '—'}</td>
                      <td className="hidden whitespace-nowrap text-right font-mono sm:table-cell">
                        <MagCell mag={mag} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="card-pad text-sm text-night-500">Aucun passage dans la période.</p>
          )}
        </div>
      </section>

      {selected && (
        <section className="card card-pad">
          <h2 className="mb-3 flex flex-wrap items-center gap-2 font-display text-lg font-semibold">
            {selected.name}
            {notable(selected) && (
              <span className="chip border-or/40 text-sm font-normal text-or dark:border-or/40 dark:text-or">140 m et plus, ou plus près que la Lune</span>
            )}
          </h2>
          <Details approach={selected} sight={selectedSight} now={now} place={place} />
          {selectedSight?.seen && <NightChart approach={selected} sight={selectedSight} observer={observer} now={now} />}
          <a
            href={`https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(selected.designation)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline dark:text-accent-400"
          >
            Sa fiche dans la base des petits corps du JPL <ExternalLink size={14} aria-hidden="true" />
          </a>
        </section>
      )}

      <p className="text-xs text-night-500">
        Données :{' '}
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
          {SOURCE}
        </a>{' '}
        et JPL Horizons, du {longDate.format(UPDATED)}, mises à jour chaque jour. Le lieu n’est envoyé nulle part : la vue depuis le lieu est calculée
        dans le navigateur, comme dans Céleste.
      </p>
    </div>
  )
}
