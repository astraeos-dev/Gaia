import { useId, useMemo } from 'react'
import { LAND_PATH } from '../data/world-land'
import { nightPaths } from '../lib/geo'
import { CIEL_000, CIEL_100, CIEL_200, ENCRE_ATTENUEE, LUNE, OR } from '../../../kit/charte'

const GRID_LON = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150]
const GRID_LAT = [-60, -30, 0, 30, 60]

/**
 * Planisphère équirectangulaire avec zones de jour, crépuscules et nuit à l'instant `date`, dans les couleurs des
 * cartes de Céleste : mers en ciel-000, terres en ciel-200, votre lieu en lune ; le côté jour est voilé d'or (le
 * Soleil), la nuit de plus en plus sombre.
 * Les éléments enfants sont dessinés par-dessus, dans le même repère (utiliser `xy`).
 */
export default function WorldMap({ date, observer, showNight = true, showSun = true, children, label = 'Carte du monde' }) {
  const night = useMemo(() => (showNight ? nightPaths(date) : null), [date, showNight])
  const dayMask = `jour${useId().replace(/[^\w-]/g, '')}`
  return (
    <svg viewBox="0 0 360 180" className="block h-auto w-full rounded-xl" role="img" aria-label={label}>
      <rect width="360" height="180" style={{ fill: CIEL_000 }} />
      <path d={LAND_PATH} style={{ fill: CIEL_200, stroke: ENCRE_ATTENUEE }} strokeOpacity="0.5" strokeWidth="0.15" />
      <g style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.15" strokeWidth="0.2">
        {GRID_LON.map((lon) => (
          <line key={lon} x1={lon + 180} x2={lon + 180} y1="0" y2="180" />
        ))}
        {GRID_LAT.map((lat) => (
          <line key={lat} x1="0" x2="360" y1={90 - lat} y2={90 - lat} strokeOpacity={lat === 0 ? 0.3 : 0.15} />
        ))}
      </g>
      {night && (
        <>
          <mask id={dayMask}>
            <rect width="360" height="180" fill="white" />
            <path d={night.layers[0].d} fill="black" />
          </mask>
          <rect width="360" height="180" mask={`url(#${dayMask})`} style={{ fill: OR }} fillOpacity="0.12" />
        </>
      )}
      {night?.layers.map((l) => (
        <path key={l.h} d={l.d} className="fill-night-950" fillOpacity="0.22" />
      ))}
      {night && showSun && (
        <g>
          <circle cx={night.sun.lon + 180} cy={90 - night.sun.lat} r="3.2" style={{ fill: OR }} fillOpacity="0.25" />
          <circle cx={night.sun.lon + 180} cy={90 - night.sun.lat} r="1.8" style={{ fill: OR, stroke: CIEL_100 }} strokeWidth="0.3" />
        </g>
      )}
      {observer && (
        <g>
          <circle cx={observer.lon + 180} cy={90 - observer.lat} r="1.6" style={{ fill: LUNE, stroke: CIEL_100 }} strokeWidth="0.4" />
        </g>
      )}
      {children}
    </svg>
  )
}
