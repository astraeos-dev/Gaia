import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { LocationButton } from '../../../components/LocationPicker'
import { fmt, fmtLat, fmtLon, fmtTime } from '../../../lib/format'
import { QUARTER_NAMES, makeObserver } from '../lib/astro'
import MoonPhase from '../components/MoonPhase'
import { OR } from '../../../kit/charte'
import { EVENT_LINES, MAP_DAY, MAP_HOUR, collect } from './month'
import MonthSkyChart from './MonthSkyChart'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
const dayTime = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', hour: '2-digit', minute: '2-digit' })
const dayOnly = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })

/** « 22 h 55 » : une heure de la légende de la carte. */
const hourText = (date) => fmtTime(date).replace(':', ' h ')

/** La ligne d'une planète au milieu du mois : son éclat, sa constellation et quand la voir (le soir, le matin, la nuit). */
function planetLine(p) {
  const v = p.visibility
  const where = `mag ${fmt(v.magnitude, 1)}, ${p.constellation}`
  if (!v.visible) return `${where} : ${v.elongation < 15 ? 'trop près du Soleil' : 'sous l’horizon la nuit'}`
  const sinceNoon = (t) => ((t.getHours() + 12) % 24) + t.getMinutes() / 60
  const when = sinceNoon(v.start) >= 12 ? 'le matin' : sinceNoon(v.end) <= 12 ? 'le soir' : 'la nuit'
  return `${where} : ${when}, de ${fmtTime(v.start)} à ${fmtTime(v.end)}`
}

/** La fiche du mois à imprimer, comme celle de Céleste : la carte du 15 à 22 h, la Lune, les planètes, les évènements. */
export default function MonthSheet() {
  const { location } = useObserverLocation()
  const observer = useMemo(() => makeObserver(location), [location])
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const sheet = useMemo(() => collect(view.year, view.month, observer), [view, observer])
  const place = location.name ?? `${fmtLat(location.lat, 2)}, ${fmtLon(location.lon, 2)}`
  const changeMonth = (delta) => {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }
  const quarters = sheet.moonDays.filter((d) => d.quarter != null)
  const events = sheet.events
  const shown = events.slice(0, 2 * EVENT_LINES)
  const [first, last] = sheet.sameSky
  const lastDay = sheet.moonDays.length

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-icon" onClick={() => changeMonth(-1)} aria-label="Mois précédent">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[10rem] text-center font-display text-lg font-semibold capitalize">
            {MONTHS[view.month]} {view.year}
          </span>
          <button type="button" className="btn-icon" onClick={() => changeMonth(1)} aria-label="Mois suivant">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LocationButton />
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Imprimer la fiche
          </button>
        </div>
      </div>

      <article className="card card-pad space-y-5 print:space-y-2 print:border-0 print:p-0 print:shadow-none">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-night-500">Céleste · la fiche du mois</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl print:text-2xl">
            Le ciel de {MONTHS[view.month]} {view.year}
          </h2>
          <p className="mt-1 text-sm text-night-600 dark:text-night-400 print:text-xs">
            {place} · {fmtLat(location.lat, 2)}, {fmtLon(location.lon, 2)} · heures locales ({zone})
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] print:grid-cols-[10cm_minmax(0,1fr)] print:gap-4">
          <figure className="min-w-0">
            <MonthSkyChart date={sheet.mapTime} observer={observer} />
            <figcaption className="mt-2 text-xs text-night-500 print:mt-1 print:text-[9px] print:leading-tight">
              Le ciel le {MAP_DAY} {MONTHS[view.month]} à {MAP_HOUR} h ; le même le 1er à {hourText(first)} et le {lastDay} à {hourText(last)}. Tenez la
              carte au-dessus de la tête, le nord vers le nord : l’est est à gauche. Étoiles jusqu’à la magnitude 5, écliptique en tirets.
            </figcaption>
          </figure>

          <div className="min-w-0 space-y-5 print:space-y-3">
            <section>
              <h3 className="mb-2 font-display text-lg font-semibold print:text-base">La Lune</h3>
              <ul className="space-y-1 text-sm print:text-xs">
                {quarters.map((d) => (
                  <li key={d.quarterDate.getTime()} className="flex items-center gap-2">
                    <MoonPhase phase={d.phase} size={18} south={location.lat < 0} />
                    <span>
                      <strong>{QUARTER_NAMES[d.quarter]}</strong> le {dayTime.format(d.quarterDate)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 font-display text-lg font-semibold print:text-base">Les planètes au milieu du mois</h3>
              <ul className="space-y-1.5 text-sm print:space-y-0.5 print:text-xs">
                {sheet.planets.map((p) => (
                  <li key={p.id}>
                    <span className="sym" style={{ color: p.color }}>
                      {p.symbol}
                    </span>{' '}
                    <strong>{p.name}</strong>, {planetLine(p)}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        {/* La Lune jour par jour : les jours des phases principales entourés d'or */}
        <section className="break-inside-avoid">
          <h3 className="mb-2 font-display text-lg font-semibold print:mb-1 print:text-base">La Lune jour par jour, à {MAP_HOUR} h</h3>
          <div className="grid grid-cols-8 gap-y-2 sm:grid-cols-[repeat(16,minmax(0,1fr))] print:grid-cols-[repeat(31,minmax(0,1fr))]">
            {sheet.moonDays.map((d) => (
              <div key={d.date.getDate()} className="flex flex-col items-center gap-0.5" title={d.quarter != null ? QUARTER_NAMES[d.quarter] : undefined}>
                <span className="rounded-full p-0.5" style={d.quarter != null ? { boxShadow: `0 0 0 1.5px ${OR}` } : undefined}>
                  <MoonPhase phase={d.phase} size={20} south={location.lat < 0} />
                </span>
                <span className="font-mono text-[10px] text-night-500">{d.date.getDate()}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-display text-lg font-semibold print:mb-1 print:text-base">Les évènements du mois</h3>
          {shown.length ? (
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 print:grid-flow-col print:grid-cols-2 print:grid-rows-[repeat(19,auto)] print:gap-y-0 print:text-[9.5px] print:leading-[1.3]">
              {shown.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-[7.5rem] shrink-0 whitespace-nowrap font-mono font-semibold print:w-[5.6rem]">{dayOnly.format(e.time)} {fmtTime(e.time)}</span>
                  <span className={e.important ? 'font-semibold' : ''}>{e.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-night-500">Aucun évènement ce mois-ci.</p>
          )}
          {events.length > shown.length && <p className="mt-1 text-xs text-night-500">Et {events.length - shown.length} autres dans le calendrier.</p>}
        </section>

        <footer className="text-[11px] text-night-500 print:text-[8px]">
          Gaïa · Céleste dans le navigateur · calculs Astronomy Engine pour {place} · étoiles et constellations : d3-celestial.
        </footer>
      </article>
    </div>
  )
}
