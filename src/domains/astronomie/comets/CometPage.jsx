import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarRange, Crosshair, Moon, Orbit } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtDMS, fmtHMS, fmtTime } from '../../../lib/format'
import { addDays, altitudeSeries, constellationAt, makeJ2000ToHorizon, makeObserver } from '../lib/astro'
import { cometPosition, dateOfJd, orbitInfo, speedKmS } from '../lib/comets'
import TimeControls from '../components/TimeControls'
import AltitudeChart from '../components/AltitudeChart'
import { InfoCard, Row } from '../components/InfoCard'
import { OR, OR_ALERTE } from '../../../kit/charte'
import { cometNight, cometSky, getComet, nightSamples, nightStart } from './sky'
import FinderChart from './FinderChart'
import OrbitDiagram from './OrbitDiagram'
import BrightnessChart from './BrightnessChart'

const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const fromIso = (iso) => new Date(`${iso}T12:00:00`)
const SPANS = [30, 60, 120]
const STEPS = [1, 5, 10]

function Section({ title, aside, children }) {
  return (
    <section className="card card-pad">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** La fiche d'une comète, comme celles de Heavens-Above : position, orbite, carte de repérage, éclat, éphémérides. */
export default function CometPage({ id }) {
  const comet = getComet(id)
  useDocumentTitle(comet ? comet.designation : 'Comète introuvable')
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [span, setSpan] = useState(60)
  const [step, setStep] = useState(5)

  const data = useMemo(() => {
    if (!comet) return null
    const sky = cometSky(comet, clock.date, observer)
    const night = cometNight(comet, nightSamples(observer, clock.date))
    const start = nightStart(clock.date)
    const end = addDays(start, 1)
    const { ra, dec } = cometPosition(comet.el, addDays(start, 0.5))
    const points = []
    for (let t = start.getTime(); t <= end.getTime(); t += 10 * 60_000) {
      const d = new Date(t)
      points.push({ t: d, alt: makeJ2000ToHorizon(d, observer)(ra, dec).alt })
    }
    const series = [
      { id: 'Sun', name: 'Soleil', color: OR, points: altitudeSeries('Sun', observer, start, end, 10) },
      { id: 'comet', name: comet.short, color: OR_ALERTE, points },
    ]
    return { sky, night, start, end, series }
  }, [comet, clock.date, observer])

  const ephemeris = useMemo(() => {
    if (!comet) return []
    return Array.from({ length: 16 }, (_, k) => {
      const t = addDays(clock.date, k * step)
      const p = cometPosition(comet.el, t)
      return { t, ...p, constellation: constellationAt(p.raHours, p.dec).name }
    })
  }, [comet, clock.date, step])

  if (!comet) {
    return (
      <div className="card card-pad space-y-3 text-sm">
        <p>Cette comète n’est plus dans la liste : elle n’a pas été observée ces 30 derniers jours, ou son adresse a changé.</p>
        <Link to="/astronomie/cometes" className="inline-flex items-center gap-1.5 font-medium text-accent-700 dark:text-accent-400">
          <ArrowLeft size={14} /> Toutes les comètes
        </Link>
      </div>
    )
  }

  const { sky, night } = data
  const el = comet.el
  const orbit = orbitInfo(el)
  const perihelion = dateOfJd(el.tp)

  return (
    <div className="space-y-6">
      <Link to="/astronomie/cometes" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline dark:text-accent-400">
        <ArrowLeft size={14} /> Toutes les comètes
      </Link>

      <header>
        <h2 className="font-display text-2xl font-bold tracking-tight">{comet.designation}</h2>
        <p className="mt-1 text-sm text-night-600 dark:text-night-400">
          {comet.observed
            ? `Dernière magnitude observée : ${fmt(comet.observed.mag, 1)} (${dayMonth.format(fromIso(comet.observed.date))}).`
            : 'Pas d’observation ces 30 derniers jours.'}
          {sky.mag != null && ` Magnitude prévue à l’instant choisi : ${fmt(sky.mag, 1)}.`}
          {comet.aka && ` Aussi désignée ${comet.aka}.`}
        </p>
      </header>

      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="Position" icon={Crosshair}>
          <Row label="Ascension droite" value={fmtHMS(sky.raHours)} hint="J2000" />
          <Row label="Déclinaison" value={fmtDMS(sky.dec)} hint="J2000" />
          <Row label="Constellation" value={sky.constellation.name} />
          <Row label="Distance à la Terre" value={`${fmt(sky.delta, 3)} ua`} sub={`${fmt(sky.delta * 149.6, 0)} M km`} />
          <Row label="Distance au Soleil" value={`${fmt(sky.r, 3)} ua`} />
          <Row label="Écart au Soleil" value={`${fmt(sky.elongation, 1)}°`} />
          <Row label="Hauteur" value={`${fmt(sky.alt, 1)}°`} />
          <Row label="Azimut" value={`${fmt(sky.az, 0)}°`} sub={compass(sky.az)} />
          <Row label="Latitude écliptique" value={`${fmt(sky.helioLat, 1)}°`} hint="Vue du Soleil : au-dessus (+) ou au-dessous (−) du plan de l’écliptique" />
        </InfoCard>

        <InfoCard title="Orbite" icon={Orbit}>
          <Row label="Périhélie" value={`${fmt(el.q, 3)} ua`} sub={dayMonthYear.format(perihelion)} />
          {orbit.aphelion != null && <Row label="Aphélie" value={`${fmt(orbit.aphelion, 3)} ua`} />}
          <Row label="Période" value={orbit.period != null ? `${fmt(orbit.period, orbit.period < 100 ? 1 : 0)} ans` : 'orbite ouverte'} />
          <Row label="Excentricité" value={fmt(el.e, 6)} />
          <Row label="Inclinaison sur l’écliptique" value={`${fmt(el.i, 2)}°`} />
          <Row label="Nœud ascendant" value={`${fmt(el.node, 2)}°`} />
          <Row label="Argument du périhélie" value={`${fmt(el.peri, 2)}°`} />
          <Row label="Vitesse par rapport au Soleil" value={`${fmt(speedKmS(el, sky.r), 3)} km/s`} />
          <Row
            label="Éléments"
            value={comet.source === 'JPL' ? 'JPL' : 'MPC'}
            sub={el.epoch ? `époque ${dayMonthYear.format(fromIso(el.epoch))}` : undefined}
          />
        </InfoCard>

        <InfoCard title="Cette nuit" icon={Moon}>
          {night.visible ? (
            <>
              <Row label="Visible" value={`${fmtTime(night.start)} – ${fmtTime(night.end)}`} hint="Hauteur de plus de 15°, Soleil sous −12°" />
              <Row label="Au plus haut" value={`${fmt(night.best.alt, 0)}° à ${fmtTime(night.best.t)}`} sub={compass(night.best.az)} />
            </>
          ) : (
            <p className="py-1.5 text-sm text-night-500">Trop basse : jamais à plus de 15° quand le Soleil est sous −12°.</p>
          )}
          {comet.cobs?.peak != null && comet.cobs.peakDate && (
            <Row label="Pic prévu par COBS" value={fmt(comet.cobs.peak, 1)} sub={dayMonthYear.format(fromIso(comet.cobs.peakDate))} />
          )}
          {comet.predictedPeak && (
            <Row label="Pic prévu (MPC, 12 mois)" value={fmt(comet.predictedPeak.mag, 1)} sub={dayMonthYear.format(fromIso(comet.predictedPeak.date))} />
          )}
          <p className="mt-2 text-xs text-night-500">Pour {location.name ?? 'votre lieu'}.</p>
        </InfoCard>
      </div>

      <Section
        title="Carte de repérage"
        aside={
          <Segmented
            size="sm"
            ariaLabel="Durée du trajet"
            value={span}
            onChange={setSpan}
            options={SPANS.map((s) => ({ value: s, label: `${s} jours` }))}
          />
        }
      >
        <FinderChart comet={comet} date={clock.date} span={span} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Orbite vue de dessus">
          <OrbitDiagram comet={comet} date={clock.date} />
        </Section>
        <Section title="Éclat prévu">
          <BrightnessChart comet={comet} date={clock.date} />
        </Section>
      </div>

      <Section title="Hauteur cette nuit">
        <AltitudeChart series={data.series} start={data.start} end={data.end} now={clock.date} />
      </Section>

      <Section
        title="Éphémérides"
        aside={
          <Segmented
            size="sm"
            ariaLabel="Pas des éphémérides"
            value={step}
            onChange={setStep}
            options={STEPS.map((s) => ({ value: s, label: s === 1 ? 'chaque jour' : `tous les ${s} jours` }))}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="table-data min-w-[760px]">
            <thead>
              <tr>
                <th>
                  <CalendarRange size={13} className="mr-1 inline" aria-hidden="true" />
                  Date
                </th>
                <th>Ascension droite</th>
                <th>Déclinaison</th>
                <th>Constellation</th>
                <th className="text-right">Δ (ua)</th>
                <th className="text-right">r (ua)</th>
                <th className="text-right">Écart au Soleil</th>
                <th className="text-right">Magnitude prévue</th>
              </tr>
            </thead>
            <tbody>
              {ephemeris.map((p) => (
                <tr key={p.t.getTime()}>
                  <td>{dayMonthYear.format(p.t)}</td>
                  <td className="font-mono">{fmtHMS(p.raHours)}</td>
                  <td className="font-mono">{fmtDMS(p.dec)}</td>
                  <td>{p.constellation}</td>
                  <td className="text-right font-mono">{fmt(p.delta, 3)}</td>
                  <td className="text-right font-mono">{fmt(p.r, 3)}</td>
                  <td className={`text-right font-mono ${p.elongation < 30 ? 'text-alerte' : ''}`}>{fmt(p.elongation, 0)}°</td>
                  <td className="text-right font-mono">{p.mag != null ? fmt(p.mag, 1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-night-500">
          Positions géocentriques J2000, à l’heure choisie, corrigées du temps de lumière ; Δ : distance à la Terre, r : distance au Soleil.
        </p>
      </Section>
    </div>
  )
}
