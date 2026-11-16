import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { LocationButton } from '../../../components/LocationPicker'
import { compass, fmt, fmtDMS, fmtHMS, fmtLat, fmtLon, fmtTime } from '../../../lib/format'
import { addDays, altitudeSeries, makeObserver } from '../lib/astro'
import TimeControls from '../components/TimeControls'
import AltitudeChart from '../components/AltitudeChart'
import { InfoCard, Row } from '../components/InfoCard'
import { LUNE, OR } from '../../../kit/charte'
import { nightSamples, nightStart } from '../comets/sky'
import { MONTHS, VISIBILITY, constellationFacts, constellationPath, getConstellation, neighbours, visibility } from './geometry'
import { deepSkyOf, deepSkyType, starsOf } from './scene'
import { bestInDarkness, pointDay } from './night'
import ConstellationChart, { ChartLegend } from './ConstellationChart'

const decimal = (x, digits = 1) => (x == null ? '—' : x.toFixed(digits).replace('.', ','))
const size = (arcmin) => (arcmin == null ? '—' : arcmin >= 60 ? `${decimal(arcmin / 60, 1)}°` : `${decimal(arcmin, arcmin < 10 ? 1 : 0)}′`)

function Section({ title, children, className = '' }) {
  return (
    <section className={`card card-pad min-w-0 break-inside-avoid print:border-0 print:p-0 ${className}`}>
      <h2 className="mb-3 font-display text-lg font-semibold print:mb-1 print:text-sm">{title}</h2>
      {children}
    </section>
  )
}

/**
 * La fiche d'une constellation, comme celles d'In-The-Sky et la fiche à imprimer de Céleste : sa carte, sa taille,
 * le mois où elle est au plus haut à 22 h, si elle se lève chez vous et quand cette nuit, ses étoiles les plus
 * brillantes et ses objets du ciel profond.
 */
export default function ConstellationPage({ id }) {
  const constellation = getConstellation(id)
  useDocumentTitle(constellation ? `${constellation.name} (${constellation.latin}) — constellation` : 'Constellation introuvable')
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 60_000 })
  const observer = useMemo(() => makeObserver(location), [location])

  const night = useMemo(() => {
    if (!constellation) return null
    const facts = constellationFacts()[constellation.id]
    const ra = facts.center.ra * 15
    const { dec } = facts.center
    const start = nightStart(clock.date)
    const day = pointDay(ra, dec, observer, start)
    const series = [
      {
        id: 'Sun',
        name: 'Soleil',
        color: OR,
        points: altitudeSeries('Sun', observer, start, addDays(start, 1), 10),
      },
      {
        id: 'center',
        name: `${constellation.name} (centre)`,
        color: LUNE,
        points: day.points.filter((_, i) => i % 2 === 0),
      },
    ]
    return {
      facts,
      day,
      best: bestInDarkness(ra, dec, nightSamples(observer, clock.date)),
      start,
      end: addDays(start, 1),
      series,
    }
  }, [constellation, clock.date, observer])

  if (!constellation) {
    return (
      <div className="card card-pad space-y-3">
        <p>Cette constellation n’existe pas, ou son adresse a changé.</p>
        <Link to="/astronomie/constellations" className="btn">
          <ArrowLeft size={16} /> Les 88 constellations
        </Link>
      </div>
    )
  }

  const { facts, day, best } = night
  const seen = visibility(constellation.id, location.lat)
  const near = neighbours(constellation.id)
    .map(getConstellation)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const stars = starsOf(constellation.id)
    .filter((s) => s.label || s.name)
    .slice(0, 12)
  const objects = deepSkyOf(constellation.id).slice(0, 16)
  const place = location.name ?? `${fmtLat(location.lat, 2)}, ${fmtLon(location.lon, 2)}`

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/astronomie/constellations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline dark:text-accent-400"
        >
          <ArrowLeft size={15} /> Les 88 constellations
        </Link>
        <button type="button" onClick={() => window.print()} className="btn">
          <Printer size={16} /> Imprimer la fiche
        </button>
      </div>

      <header>
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{constellation.name}</h2>
        <p className="mt-1 text-night-600 dark:text-night-400">
          {constellation.latin} · génitif <i>{constellation.genitive}</i> · abréviation {constellation.id}
        </p>
        {/* La ligne de la fiche imprimée, comme celle de Céleste : les cartes de droite ne sont pas imprimées */}
        <p className="mt-1 hidden text-xs print:block">
          {fmt(facts.area, 0)} degrés carrés ({facts.rank}e sur 88) · au plus haut à 22 h en {MONTHS[facts.month - 1]} ·{' '}
          {seen === 'all' ? 'entièrement visible' : seen === 'part' ? 'en partie visible' : 'jamais visible'} depuis {place}
          {near.length > 0 && ` · voisines : ${near.map((c) => c.name).join(', ')}`}
        </p>
      </header>

      <div className="card card-pad flex flex-wrap items-center justify-between gap-3 print:hidden">
        <TimeControls clock={clock} />
        <LocationButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] print:block">
        <figure className="card card-pad break-inside-avoid print:mx-auto print:max-w-[12cm] print:border-0 print:p-0">
          <ConstellationChart constellation={constellation} />
          <figcaption className="mt-3 space-y-2">
            <ChartLegend />
            <p className="text-xs text-night-500 print:hidden">
              Étoiles jusqu’à la magnitude 6,5, lettres grecques et numéros de Flamsteed de la constellation, objets du ciel profond plus brillants
              que la magnitude 9 et ceux des catalogues de Messier et de Caldwell. Le nord est en haut et l’est à gauche, comme dans le ciel. Survolez
              une étoile ou un objet pour son nom et sa magnitude.
            </p>
          </figcaption>
        </figure>

        <div className="space-y-6 print:hidden">
          <InfoCard title="En bref">
            <Row label="Superficie" value={`${fmt(facts.area, 0)} deg²`} sub={`${facts.rank}e sur 88`} />
            <Row label="Au plus haut à 22 h" value={MONTHS[facts.month - 1]} />
            <Row label="Centre" value={`${fmtHMS(facts.center.ra)}`} sub={fmtDMS(facts.center.dec)} />
            <Row
              label="Étoiles à l’œil nu"
              value={starsOf(constellation.id).filter((s) => s.mag <= 6).length}
              hint="Étoiles jusqu’à la magnitude 6"
            />
            <Row label="Objets de Messier" value={objects.filter((o) => o.m).length || '—'} />
          </InfoCard>

          <InfoCard title={`Depuis ${place}`}>
            <Row label="Visible" value={VISIBILITY[seen]} hint="La part de la constellation qui se lève à votre latitude" />
            {day.always ? (
              <Row label="Centre" value="toujours levé" />
            ) : day.never ? (
              <Row label="Centre" value="ne se lève pas" />
            ) : (
              <>
                <Row label="Lever du centre" value={day.rise ? fmtTime(day.rise) : '—'} />
                <Row label="Coucher du centre" value={day.set ? fmtTime(day.set) : '—'} />
              </>
            )}
            {!day.never && <Row label="Au plus haut" value={`${fmt(day.transit.alt, 0)}°`} sub={fmtTime(day.transit.t)} />}
            <Row
              label="Cette nuit, au mieux"
              value={best && best.alt > 0 ? `${fmt(best.alt, 0)}°` : 'sous l’horizon'}
              sub={best && best.alt > 0 ? `${fmtTime(best.t)}, ${compass(best.az)}` : undefined}
              hint="La meilleure hauteur du centre quand le Soleil est sous −12°"
            />
          </InfoCard>

          {near.length > 0 && (
            <InfoCard title="Constellations voisines">
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {near.map((c) => (
                  <li key={c.id}>
                    <Link to={constellationPath(c)} className="text-accent-700 hover:underline dark:text-accent-400">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </InfoCard>
          )}
        </div>
      </div>

      <Section title="La nuit chez vous" className="print:hidden">
        <AltitudeChart series={night.series} start={night.start} end={night.end} now={clock.date} />
        <p className="mt-2 text-xs text-night-500">
          Hauteur du centre de la constellation de midi à midi ; le fond suit le Soleil (jour, crépuscules, nuit).
        </p>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-2 print:gap-4 print:text-[10px] print:leading-tight">
        <Section title="Les étoiles les plus brillantes">
          {stars.length ? (
            <div className="overflow-x-auto">
              <table className="table-data">
                <thead>
                  <tr>
                    <th>Étoile</th>
                    <th>Nom</th>
                    <th className="text-right">Magnitude</th>
                  </tr>
                </thead>
                <tbody>
                  {stars.map((s, i) => (
                    <tr key={s.i} className={i >= 10 ? 'print:hidden' : ''}>
                      <td className="whitespace-nowrap">{s.label ? `${s.label} ${constellation.genitive}` : '—'}</td>
                      <td>{s.name || <span className="text-night-400">—</span>}</td>
                      <td className="text-right font-mono">{decimal(s.mag, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-night-500">Aucune étoile désignée plus brillante que la magnitude 6,5.</p>
          )}
        </Section>

        <Section title="Le ciel profond">
          {objects.length ? (
            <div className="overflow-x-auto">
              <table className="table-data">
                <thead>
                  <tr>
                    <th>Objet</th>
                    <th>Type</th>
                    <th className="text-right">Mag.</th>
                    <th className="text-right">Taille</th>
                    <th>Nom</th>
                  </tr>
                </thead>
                <tbody>
                  {objects.map((o, i) => (
                    <tr key={o.id} className={i >= 10 ? 'print:hidden' : ''}>
                      <td className="whitespace-nowrap">
                        <span className="font-semibold">{o.label}</span>
                        {o.label !== o.id && <span className="block text-xs text-night-500 print:hidden">{o.id}</span>}
                      </td>
                      <td>{deepSkyType(o.type)}</td>
                      <td className="text-right font-mono">{decimal(o.mag)}</td>
                      <td className="text-right font-mono">{size(o.size)}</td>
                      <td className="print:whitespace-normal">{o.name || <span className="text-night-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-night-500">Aucun objet de Messier ou de Caldwell, ni plus brillant que la magnitude 9.</p>
          )}
        </Section>
      </div>

      <p className="text-xs text-night-500 print:text-[9px]">
        Étoiles : Yale Bright Star Catalogue (domaine public). Ciel profond : OpenNGC (Mattia Verga, CC BY-SA 4.0). Limites et figures : d3-celestial
        (Olaf Frohn, BSD-3). Comme les cartes des constellations de Céleste ; fiche pour {place}.
      </p>
    </div>
  )
}
