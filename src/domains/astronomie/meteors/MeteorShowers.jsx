import { useState } from 'react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { LocationButton } from '../../../components/LocationPicker'
import { compass, fmt, fmtTime } from '../../../lib/format'
import { Astronomy, addDays, bodyPosition, makeJ2000ToHorizon, makeObserver, moonInfo, startOfDay } from '../lib/astro'
import AltitudeChart from '../components/AltitudeChart'
import { InfoCard, Row } from '../components/InfoCard'
import { nightStart } from '../comets/sky'
import { OR, OR_ALERTE } from '../../../kit/charte'
import { SHOWERS, activity, nextMaximum } from './showers'

const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const DEG = Math.PI / 180

/** La nuit du maximum chez l'observateur : hauteur du radiant, quand le compter, combien en attendre. */
function nightOfMaximum(shower, maximum, observer) {
  const start = nightStart(maximum)
  const end = addDays(start, 1)
  const sun = []
  const radiant = []
  let best = null
  for (let t = start.getTime(); t <= end.getTime(); t += 10 * 60_000) {
    const d = new Date(t)
    const sunAlt = bodyPosition(Astronomy.Body.Sun, d, observer).alt
    const { alt, az } = makeJ2000ToHorizon(d, observer)(shower.ra, shower.dec)
    sun.push({ t: d, alt: sunAlt })
    radiant.push({ t: d, alt })
    if (sunAlt < -12 && alt > 0 && (!best || alt > best.alt)) best = { t: d, alt, az }
  }
  return {
    start,
    end,
    best,
    // Taux horaire sous un ciel noir (magnitude limite 6,5) : le ZHR réduit par la hauteur du radiant
    rate: best ? shower.zhr * Math.sin(best.alt * DEG) : 0,
    series: [
      { id: 'Sun', name: 'Soleil', color: OR, points: sun },
      { id: 'radiant', name: 'Radiant', color: OR_ALERTE, points: radiant },
    ],
  }
}

/**
 * Les pluies d'étoiles filantes de l'année, comme les pages d'In-The-Sky : le maximum de chacune (calculé d'après la
 * longitude du Soleil, comme le calendrier de l'IMO), son activité, son taux zénithal, son radiant, la Lune ; et
 * chez vous, la nuit du maximum, la hauteur du radiant et le nombre de météores à attendre.
 */
export default function MeteorShowers() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 600_000 })
  const observer = makeObserver(location)
  const day = startOfDay(clock.date).getTime()
  const [code, setCode] = useState(null)

  // Peu de calculs (13 pluies, une nuit toutes les 10 minutes) et une page qui ne se redessine que toutes les
  // 10 minutes ou à un choix : pas de mémoïsation
  const today = new Date(day)
  const list = SHOWERS.map((s) => {
    const max = nextMaximum(s, today)
    const act = activity(s, max)
    return { s, max, act, moon: moonInfo(max), active: today >= act.start && today <= act.end }
  }).sort((a, b) => a.max - b.max)

  const selected = list.find((x) => x.s.code === code) ?? list[0]
  const night = nightOfMaximum(selected.s, selected.max, observer)

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-night-600 dark:text-night-400">
          Les maxima des douze prochains mois, en heure locale. Choisissez une pluie pour voir la nuit de son maximum chez vous.
        </p>
        <LocationButton />
      </div>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-data min-w-[900px]">
            <thead>
              <tr>
                <th>Pluie</th>
                <th>Maximum</th>
                <th>Activité</th>
                <th className="text-right">ZHR</th>
                <th>Radiant</th>
                <th className="text-right">Vitesse</th>
                <th>Lune au maximum</th>
                <th>Corps parent</th>
              </tr>
            </thead>
            <tbody>
              {list.map(({ s, max, act, moon, active }) => (
                <tr
                  key={s.code}
                  onClick={() => setCode(s.code)}
                  className={`cursor-pointer ${s.code === selected.s.code ? 'bg-accent-400/10' : ''}`}
                  aria-selected={s.code === selected.s.code}
                >
                  <td>
                    <button type="button" onClick={() => setCode(s.code)} className="text-left font-semibold text-accent-700 hover:underline dark:text-accent-400">
                      {s.name}
                    </button>
                    <span className="block text-xs text-night-500">
                      {s.code}
                      {active && <span className="ml-1.5 font-medium text-ok">· en cours</span>}
                    </span>
                  </td>
                  <td>
                    {dayMonthYear.format(max)} <span className="font-mono text-night-500">{fmtTime(max)}</span>
                  </td>
                  <td>
                    {dayMonth.format(act.start)} – {dayMonth.format(act.end)}
                  </td>
                  <td className="text-right font-mono">{s.zhr}</td>
                  <td>{s.constellation}</td>
                  <td className="text-right font-mono">{s.speed} km/s</td>
                  <td>
                    <span className="font-mono">{fmt(moon.illumination * 100, 0)} %</span> <span className="text-night-500">{moon.name.toLowerCase()}</span>
                  </td>
                  <td className="text-night-600 dark:text-night-400">{s.parent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <InfoCard title={`${selected.s.name} (${selected.s.code})`}>
          <Row label="Maximum" value={`${dayMonthYear.format(selected.max)} ${fmtTime(selected.max)}`} />
          <Row label="Activité" value={`${dayMonth.format(selected.act.start)} – ${dayMonth.format(selected.act.end)}`} />
          <Row label="Taux horaire zénithal (ZHR)" value={selected.s.zhr} hint="Météores par heure, radiant au zénith, ciel noir (magnitude limite 6,5)" />
          <Row label="Radiant" value={`${fmt(selected.s.ra, 0)}°, ${selected.s.dec > 0 ? '+' : ''}${selected.s.dec}°`} sub={selected.s.constellation} />
          <Row label="Vitesse d’entrée" value={`${selected.s.speed} km/s`} />
          <Row label="Indice de population r" value={fmt(selected.s.r, 1)} hint="Plus il est petit, plus il y a de météores brillants" />
          <Row label="Corps parent" value={selected.s.parent} />
          <Row label="Lune au maximum" value={`${fmt(selected.moon.illumination * 100, 0)} %`} sub={selected.moon.name.toLowerCase()} />
          <p className="mt-3 text-sm">
            {night.best
              ? `Chez vous, la nuit du maximum, le radiant culmine vers ${fmtTime(night.best.t)} à ${fmt(night.best.alt, 0)}° (${compass(night.best.az)}) : environ ${Math.round(night.rate)} météores par heure sous un ciel noir, moins avec la Lune ou la pollution lumineuse.`
              : 'Chez vous, le radiant reste sous l’horizon pendant la nuit du maximum : cette pluie ne se voit pas, ou à peine.'}
          </p>
        </InfoCard>
        <section className="card card-pad">
          <h2 className="mb-1 font-display text-lg font-semibold">La nuit du maximum chez vous</h2>
          <p className="mb-3 text-xs text-night-500">
            Hauteur du radiant pour {location.name ?? 'votre lieu'}, de midi à midi ; plus il est haut, plus on voit de météores (ZHR × sinus de sa hauteur).
          </p>
          <AltitudeChart series={night.series} start={night.start} end={night.end} now={selected.max} />
        </section>
      </div>

      <p className="text-xs text-night-500">
        Pluies, radiants, vitesses et taux : liste de travail de l’International Meteor Organization (IMO), comme Céleste. Les maxima sont les instants
        où le Soleil atteint la longitude de chaque pluie (J2000) ; le trait doré du graphique marque celui de la pluie choisie.
      </p>
    </div>
  )
}
