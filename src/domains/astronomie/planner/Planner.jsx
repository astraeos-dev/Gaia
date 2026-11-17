import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, EyeOff, RotateCcw, Star } from 'lucide-react'
import { useObserverLocation } from '../../../context/location'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { useLocalStorage } from '../../../hooks/useLocalStorage'
import { LocationButton } from '../../../components/LocationPicker'
import Segmented from '../../../components/Segmented'
import { compass, fmt, fmtLat, fmtLon, fmtTime } from '../../../lib/format'
import { BODY, makeObserver } from '../lib/astro'
import { cometPosition } from '../lib/comets'
import TimeControls from '../components/TimeControls'
import { CIEL_000, CIEL_200, ENCRE, ENCRE_ATTENUEE, LUNE, OR } from '../../../kit/charte'
import { COMETS, cometPath } from '../comets/sky'
import { constellationPath, getConstellation } from '../constellations/geometry'
import { deepSkyType } from '../constellations/scene'
import { DEFAULTS, nightNoon, nightWindow, plan, reportJson } from './planner'

const CATALOG_OPTIONS = [
  { value: 'messier', label: 'Messier' },
  { value: 'caldwell', label: 'Caldwell' },
  { value: 'all', label: 'Tous' },
]
const TYPES = ['galaxy', 'open_cluster', 'globular_cluster', 'nebula', 'planetary_nebula', 'supernova_remnant', 'star_cloud', 'double_star', 'asterism', 'dark_nebula']
const KIND = { astro: 'Nuit astronomique (Soleil sous −18°)', naut: 'Nuit nautique (Soleil sous −12°)', civil: 'Nuit civile (Soleil sous −6°)' }
const SHOWN_ON_DOME = 10
const pct = (x) => `${fmt(100 * x, 0)} %`

/** Un champ numérique compact pour une contrainte. */
function NumberField({ label, value, onChange, step = 1, min, max, unit, placeholder }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm text-night-600 dark:text-night-400">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          className="input w-20 py-1 text-right font-mono"
          value={value ?? ''}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
        {unit && <span className="w-5 text-xs text-night-500">{unit}</span>}
      </span>
    </label>
  )
}

/** Les contraintes de l'observateur, comme celles d'uptonight dans Céleste. */
function Constraints({ c, set, reset }) {
  const change = (key) => (value) => set((prev) => ({ ...prev, [key]: value }))
  const toggleType = (type) => set((prev) => ({ ...prev, types: prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type] }))
  return (
    <section className="card card-pad space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Les contraintes</h2>
        <button type="button" className="btn" onClick={reset}>
          <RotateCcw size={15} aria-hidden="true" /> Par défaut
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-night-600 dark:text-night-400">
        Catalogue
        <Segmented size="sm" ariaLabel="Catalogue" value={c.catalog} onChange={change('catalog')} options={CATALOG_OPTIONS} />
      </div>
      <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        <NumberField label="Hauteur minimale" value={c.altitudeMin} onChange={change('altitudeMin')} min={0} max={90} unit="°" />
        <NumberField label="Hauteur maximale" value={c.altitudeMax} onChange={change('altitudeMax')} min={0} max={90} unit="°" />
        <NumberField label="Masse d’air au plus" value={c.airmassMax} onChange={change('airmassMax')} step={0.1} min={1} unit="" />
        <NumberField label="Taille au moins" value={c.sizeMin} onChange={change('sizeMin')} min={0} unit="′" />
        <NumberField label="Taille au plus" value={c.sizeMax} onChange={change('sizeMax')} min={0} unit="′" />
        <NumberField label="Magnitude au plus" value={c.magnitudeMax} onChange={change('magnitudeMax')} step={0.5} placeholder="toutes" />
        <NumberField label="Part de la nuit au moins" value={Math.round(c.fractionMin * 100)} onChange={(v) => change('fractionMin')((v ?? 0) / 100)} min={0} max={100} unit="%" />
        <NumberField label="Écart à la Lune au moins" value={c.moonSeparationMin} onChange={change('moonSeparationMin')} min={0} max={180} unit="°" />
        <label className="flex items-center gap-2 text-sm text-night-600 dark:text-night-400" title="1 % d’éclairement de la Lune demande 1° d’écart">
          <input type="checkbox" checked={c.moonSeparationFromIllumination} onChange={(e) => change('moonSeparationFromIllumination')(e.target.checked)} className="accent-accent-500" />
          Écart selon l’éclairement de la Lune
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-night-600 dark:text-night-400">Types</span>
        {TYPES.map((type) => {
          const on = c.types.includes(type)
          return (
            <button key={type} type="button" aria-pressed={on} onClick={() => toggleType(type)} className={`chip ${on ? 'border-or/40 text-or dark:border-or/40 dark:text-or' : ''}`}>
              {deepSkyType(type)}
            </button>
          )
        })}
        {c.types.length > 0 && (
          <button type="button" className="text-xs text-accent-700 hover:underline dark:text-accent-400" onClick={() => change('types')([])}>
            tous les types
          </button>
        )}
      </div>
    </section>
  )
}

/**
 * Les trajets de la nuit sur la voûte, le zénith au centre, le nord en haut et l'est à gauche (comme on lève les yeux) :
 * la cible choisie en or, une étiquette à son point le plus haut et un point à chaque heure ronde.
 */
function SkyDome({ targets, selected, times, minAltitude }) {
  const S = 420
  const R = S / 2 - 22
  const point = (alt, az) => {
    const r = ((90 - Math.max(0, alt)) / 90) * R
    return [S / 2 - r * Math.sin((az * Math.PI) / 180), S / 2 - r * Math.cos((az * Math.PI) / 180)]
  }
  const hours = times.map((t, i) => (t.getMinutes() < 10 && i > 0 ? i : -1)).filter((i) => i >= 0)
  const path = (o) => {
    const parts = []
    let current = []
    o.altitudes.forEach((alt, i) => {
      if (alt > 0) current.push(point(alt, o.azimuths[i]))
      else if (current.length) {
        parts.push(current)
        current = []
      }
    })
    if (current.length) parts.push(current)
    return parts.map((p) => p.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')).join(' ')
  }
  const ordered = [...targets.filter((o) => o !== selected), ...(selected ? [selected] : [])]
  // les étiquettes au point le plus haut, la cible choisie d'abord, sans se chevaucher
  const placed = []
  const labels = new Map()
  for (const o of [...(selected ? [selected] : []), ...targets.filter((t) => t !== selected)]) {
    const k = o.altitudes.indexOf(Math.max(...o.altitudes))
    if (!(o.altitudes[k] > 0)) continue
    const [x, y] = point(o.altitudes[k], o.azimuths[k])
    if (placed.some(([px, py]) => Math.abs(px - x) < 34 && Math.abs(py - y) < 13)) continue
    placed.push([x, y])
    labels.set(o, [x, y])
  }
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto h-auto w-full max-w-[420px]" role="img" aria-label="Les trajets des cibles pendant la nuit">
      <circle cx={S / 2} cy={S / 2} r={R} style={{ fill: CIEL_000, stroke: ENCRE_ATTENUEE }} strokeWidth="1.2" />
      {/* sous la hauteur minimale, trop bas : un anneau grisé entre l'horizon et le cercle de cette hauteur */}
      <circle cx={S / 2} cy={S / 2} r={(R + ((90 - minAltitude) / 90) * R) / 2} fill="none" style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.25" strokeWidth={R - ((90 - minAltitude) / 90) * R} />
      {[30, 60].map((alt) => (
        <circle key={alt} cx={S / 2} cy={S / 2} r={((90 - alt) / 90) * R} fill="none" style={{ stroke: CIEL_200 }} />
      ))}
      {[
        ['N', 0],
        ['E', 90],
        ['S', 180],
        ['O', 270],
      ].map(([l, az]) => {
        const [x, y] = point(-10, az)
        const k = (R + 12) / R
        return (
          <text key={l} x={S / 2 + (x - S / 2) * k} y={S / 2 + (y - S / 2) * k + 4} textAnchor="middle" className="font-mono text-[12px] font-semibold" style={{ fill: l === 'N' ? ENCRE : ENCRE_ATTENUEE }}>
            {l}
          </text>
        )
      })}
      {ordered.map((o) => {
        const on = o === selected
        const at = labels.get(o)
        return (
          <g key={o.label}>
            <path d={path(o)} fill="none" style={{ stroke: on ? OR : LUNE }} strokeOpacity={on ? 1 : 0.45} strokeWidth={on ? 2.5 : 1.2} strokeLinecap="round" />
            {on &&
              hours.map((i, n) => {
                if (!(o.altitudes[i] > 0)) return null
                const [x, y] = point(o.altitudes[i], o.azimuths[i])
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="3" style={{ fill: OR }} />
                    {n % 2 === 0 && (
                      <text x={x + 5} y={y - 4} className="font-mono text-[10px]" style={{ fill: OR }}>
                        {times[i].getHours()} h
                      </text>
                    )}
                  </g>
                )
              })}
            {at && (
              <text x={at[0] + 4} y={at[1] + 12} className={`text-[11px] ${on ? 'font-semibold' : ''}`} style={{ fill: on ? OR : ENCRE_ATTENUEE }}>
                {o.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Que voir cette nuit : le planificateur de Céleste (planner.py, à la manière d'uptonight). */
export default function Planner() {
  const { location } = useObserverLocation()
  const clock = useAstroClock({ intervalMs: 300_000 })
  const observer = useMemo(() => makeObserver(location), [location])
  const [constraints, setConstraints] = useLocalStorage('planner-constraints', DEFAULTS)
  const [bucket, setBucket] = useLocalStorage('planner-bucket', [])
  const [done, setDone] = useLocalStorage('planner-done', [])
  const [chosen, setChosen] = useState(null)
  const c = useMemo(() => ({ ...DEFAULTS, ...constraints }), [constraints])

  // une nuit par jour (de midi à midi), la suivante une fois l'aube passée : le plan se refait quand la nuit, le lieu
  // ou les contraintes changent
  const noon = useMemo(() => {
    const first = nightNoon(clock.date, observer.longitude).getTime()
    const { end } = nightWindow(new Date(first + 9 * 3_600_000), observer)
    return end && end < clock.date ? first + 86_400_000 : first
  }, [clock.date, observer])
  const result = useMemo(() => {
    const comets = COMETS.map((comet) => ({
      id: comet.id,
      name: comet.short,
      comet,
      position: (date) => {
        const p = cometPosition(comet.el, date)
        return { ra: p.ra, dec: p.dec, mag: p.mag, earthAu: p.delta, sunAu: p.r }
      },
    }))
    return plan(new Date(noon + 9 * 3_600_000), observer, { constraints: c, bucket, done, comets })
  }, [noon, observer, c, bucket, done])

  const toggle = (list, setList, name) => setList(list.includes(name) ? list.filter((n) => n !== name) : [...list, name])
  const selected = result.deepSky.find((o) => o.label === chosen) ?? result.deepSky[0] ?? null
  const onDome = [...result.deepSky.slice(0, SHOWN_ON_DOME), ...(selected && !result.deepSky.slice(0, SHOWN_ON_DOME).includes(selected) ? [selected] : [])]
  const place = location.name ?? `${fmtLat(location.lat, 2)}, ${fmtLon(location.lon, 2)}`

  const download = () => {
    const blob = new Blob([reportJson(result, place)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `plan-${result.window.start?.toISOString().slice(0, 10) ?? 'nuit'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <TimeControls clock={clock} steps={['day']} />
        <LocationButton />
      </div>

      <section className="card card-pad">
        {result.window.kind ? (
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {KIND[result.window.kind]} : {fmtTime(result.window.start)} → {fmtTime(result.window.end)}
              </h2>
              <p className="mt-1 text-sm text-night-600 dark:text-night-400">
                Depuis {place}. Lune éclairée à {fmt(result.moon.illumination, 0)} % : les cibles à moins de {fmt(result.moon.separationMin, 0)}° d’elle
                ne comptent pas. {result.deepSky.length} cible{result.deepSky.length > 1 ? 's' : ''} retenue{result.deepSky.length > 1 ? 's' : ''} sur{' '}
                {result.considered} examinée{result.considered > 1 ? 's' : ''}, classées par la part de la nuit où elles répondent aux contraintes.
              </p>
            </div>
            <button type="button" className="btn" onClick={download}>
              <Download size={15} aria-hidden="true" /> Le plan (JSON)
            </button>
          </div>
        ) : (
          <p className="text-sm">Le Soleil ne descend pas à 6° sous l’horizon cette nuit à {place} : pas de nuit pour observer.</p>
        )}
      </section>

      <Constraints c={c} set={(f) => setConstraints((prev) => f({ ...DEFAULTS, ...prev }))} reset={() => setConstraints(DEFAULTS)} />

      {result.window.kind && (
        <>
          <section className="card overflow-hidden">
            <div className="card-pad pb-0">
              <h2 className="font-display text-lg font-semibold">Le ciel profond</h2>
              <p className="mt-1 text-sm text-night-600 dark:text-night-400">
                Choisissez une cible pour voir son trajet. <Star size={13} className="inline" aria-label="à voir" /> : toujours montrée dès qu’elle se
                lève ; <EyeOff size={13} className="inline" aria-label="déjà vue" /> : plus montrée (« Déjà vues » en bas de page).
              </p>
            </div>
            <div className="mt-3 overflow-x-auto">
              {result.deepSky.length ? (
                <table className="table-data sm:min-w-[900px]">
                  <thead>
                    <tr>
                      <th>Objet</th>
                      <th className="hidden sm:table-cell">Type</th>
                      <th className="hidden text-right sm:table-cell">Mag.</th>
                      <th className="hidden text-right sm:table-cell">Taille</th>
                      <th className="hidden sm:table-cell">Le mieux</th>
                      <th className="hidden text-right sm:table-cell">Au plus haut</th>
                      <th className="hidden sm:table-cell">Méridien</th>
                      <th className="hidden text-right sm:table-cell">Nuit</th>
                      <th className="hidden text-right sm:table-cell">Lune</th>
                      <th aria-label="Listes" />
                    </tr>
                  </thead>
                  <tbody>
                    {result.deepSky.map((o) => {
                      const active = selected === o
                      const constellation = getConstellation(o.constellation)
                      return (
                        <tr key={o.label} onClick={() => setChosen(o.label)} className={`cursor-pointer ${active ? 'bg-accent-500/10' : ''}`}>
                          <td className="whitespace-normal sm:whitespace-nowrap">
                            <button type="button" onClick={() => setChosen(o.label)} aria-pressed={active} className="text-left font-semibold text-accent-700 hover:underline dark:text-accent-400">
                              {o.label}
                            </button>
                            {o.name && <span className="ml-2 text-xs text-night-500">{o.name}</span>}
                            <span className="block text-xs text-night-500">
                              {constellation ? (
                                <Link to={constellationPath(constellation)} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                                  {constellation.name}
                                </Link>
                              ) : (
                                o.constellation
                              )}
                              <span className="sm:hidden">
                                {' '}
                                · {deepSkyType(o.type)} · mag {o.mag != null ? fmt(o.mag, 1) : '—'}
                              </span>
                            </span>
                            {/* Sur un téléphone, le meilleur moment et la part de la nuit sous le nom */}
                            <span className="block font-mono text-xs text-night-500 sm:hidden">
                              {o.best ? `${fmtTime(o.best[0])} → ${fmtTime(o.best[1])}` : '—'} · {pct(o.fraction)} de la nuit
                            </span>
                          </td>
                          <td className="hidden sm:table-cell">{deepSkyType(o.type)}</td>
                          <td className="hidden text-right font-mono sm:table-cell">{o.mag != null ? fmt(o.mag, 1) : '—'}</td>
                          <td className="hidden text-right font-mono sm:table-cell">{o.size != null ? `${fmt(o.size, 0)}′` : '—'}</td>
                          <td className="hidden whitespace-nowrap font-mono sm:table-cell">{o.best ? `${fmtTime(o.best[0])} → ${fmtTime(o.best[1])}` : '—'}</td>
                          <td className="hidden whitespace-nowrap text-right font-mono sm:table-cell">
                            {fmt(o.altMax, 0)}° <span className="text-night-500">{fmtTime(o.timeMax)}</span>
                          </td>
                          <td className="hidden font-mono sm:table-cell">{fmtTime(o.transit)}</td>
                          <td className="hidden text-right font-mono sm:table-cell">{pct(o.fraction)}</td>
                          <td className="hidden text-right font-mono sm:table-cell">{fmt(o.moonSeparation, 0)}°</td>
                          <td className="whitespace-nowrap text-right">
                            <button
                              type="button"
                              className={`btn-icon ${bucket.includes(o.label) ? 'text-or' : ''}`}
                              aria-pressed={bucket.includes(o.label)}
                              title={bucket.includes(o.label) ? 'Retirer des cibles à voir' : 'À voir : toujours montrer'}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggle(bucket, setBucket, o.label)
                              }}
                            >
                              <Star size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              title="Déjà vue : ne plus montrer"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDone([...done, o.label])
                                setBucket(bucket.filter((n) => n !== o.label))
                              }}
                            >
                              <EyeOff size={15} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="card-pad text-sm text-night-500">Aucune cible ne répond aux contraintes cette nuit : élargissez-les.</p>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <figure className="card card-pad">
              <SkyDome targets={onDome} selected={selected} times={result.times} minAltitude={c.altitudeMin} />
              <figcaption className="mt-2 text-center text-xs text-night-500">
                Les trajets des {Math.min(SHOWN_ON_DOME, result.deepSky.length)} premières cibles pendant la nuit, le zénith au centre, le nord en haut et
                l’est à gauche ; {selected ? `${selected.label} en or, ` : ''}un point à chaque heure (l’heure toutes les deux). L’anneau grisé est sous la hauteur minimale.
              </figcaption>
            </figure>

            <div className="space-y-6">
              <section className="card overflow-hidden">
                <h2 className="card-pad pb-0 font-display text-lg font-semibold">La Lune et les planètes</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="table-data">
                    <thead>
                      <tr>
                        <th>Astre</th>
                        <th className="text-right">Mag.</th>
                        <th className="text-right">Au plus haut</th>
                        <th>Méridien</th>
                        <th className="text-right">Levé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.bodies.map((b) => (
                        <tr key={b.body}>
                          <td>
                            <span className="sym" style={{ color: BODY[b.body].color }}>
                              {BODY[b.body].symbol}
                            </span>{' '}
                            {BODY[b.body].name}
                          </td>
                          <td className="text-right font-mono">{b.mag != null ? fmt(b.mag, 1) : '—'}</td>
                          <td className="whitespace-nowrap text-right font-mono">
                            {fmt(b.altMax, 0)}° <span className="text-night-500">{fmtTime(b.timeMax)} ({compass(b.azMax)})</span>
                          </td>
                          <td className="font-mono">{fmtTime(b.transit)}</td>
                          <td className="text-right font-mono">{pct(b.fraction)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {result.comets.length > 0 && (
                <section className="card overflow-hidden">
                  <h2 className="card-pad pb-0 font-display text-lg font-semibold">Les comètes</h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="table-data">
                      <thead>
                        <tr>
                          <th>Comète</th>
                          <th className="text-right">Mag.</th>
                          <th className="text-right">Au plus haut</th>
                          <th>Lever</th>
                          <th>Coucher</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.comets.map((k) => (
                          <tr key={k.id}>
                            <td>
                              <Link to={cometPath(k.comet)} className="font-semibold text-accent-700 hover:underline dark:text-accent-400">
                                {k.name}
                              </Link>
                            </td>
                            <td className="text-right font-mono">{fmt(k.mag, 1)}</td>
                            <td className="whitespace-nowrap text-right font-mono">
                              {fmt(k.altMax, 0)}° <span className="text-night-500">{fmtTime(k.timeMax)}</span>
                            </td>
                            <td className="font-mono">{k.rise ? fmtTime(k.rise) : '—'}</td>
                            <td className="font-mono">{k.set ? fmtTime(k.set) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="card-pad pt-2 text-xs text-night-500">Plus brillantes que la magnitude {fmt(c.cometMagnitudeMax, 0)}, levées quand le Soleil est sous −6°.</p>
                </section>
              )}
            </div>
          </div>
        </>
      )}

      {(bucket.length > 0 || done.length > 0) && (
        <section className="card card-pad space-y-2 text-sm">
          {bucket.length > 0 && (
            <p className="flex flex-wrap items-center gap-2">
              <Star size={14} className="text-or" aria-hidden="true" /> À voir : {bucket.join(', ')}
              <button type="button" className="text-xs text-accent-700 hover:underline dark:text-accent-400" onClick={() => setBucket([])}>
                vider
              </button>
            </p>
          )}
          {done.length > 0 && (
            <p className="flex flex-wrap items-center gap-2">
              <Eye size={14} aria-hidden="true" /> Déjà vues :
              {done.map((name) => (
                <button key={name} type="button" className="chip" title="Montrer de nouveau" onClick={() => setDone(done.filter((n) => n !== name))}>
                  {name} ×
                </button>
              ))}
            </p>
          )}
          <p className="text-xs text-night-500">Ces listes et les contraintes restent dans ce navigateur.</p>
        </section>
      )}

      <p className="text-xs text-night-500">
        Comme le planificateur de Céleste, à la manière d’uptonight : chaque cible est suivie toutes les 10 minutes de la nuit (hauteur, masse d’air,
        écart à la Lune). Catalogue : OpenNGC (Mattia Verga, CC BY-SA 4.0) ; « Tous » ajoute à ceux de Messier et de Caldwell les objets plus
        brillants que la magnitude 9.
      </p>
    </div>
  )
}
