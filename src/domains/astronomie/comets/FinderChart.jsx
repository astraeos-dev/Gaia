import { useMemo } from 'react'
import STARS from '../data/stars.json'
import LINES from '../data/constellation-lines.json'
import CONSTELLATIONS from '../data/constellations.json'
import { Astronomy, addDays } from '../lib/astro'
import { cometPosition } from '../lib/comets'
import { CIEL_000, CIEL_200, ENCRE, ENCRE_ATTENUEE, OR_ALERTE } from '../../../kit/charte'

const DEG = Math.PI / 180
const W = 760
const H = 480
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** Projection gnomonique (plan tangent) centrée sur (ra0, dec0), en degrés : un grand cercle y est une droite. */
function gnomonic(ra0, dec0) {
  const a0 = ra0 * DEG
  const sd0 = Math.sin(dec0 * DEG)
  const cd0 = Math.cos(dec0 * DEG)
  return (ra, dec) => {
    const da = ra * DEG - a0
    const sd = Math.sin(dec * DEG)
    const cd = Math.cos(dec * DEG)
    const cosc = sd0 * sd + cd0 * cd * Math.cos(da)
    if (cosc < 0.25) return null
    return [(cd * Math.sin(da)) / cosc, (cd0 * sd - sd0 * cd * Math.cos(da)) / cosc]
  }
}

const unit = (ra, dec) => [Math.cos(dec * DEG) * Math.cos(ra * DEG), Math.cos(dec * DEG) * Math.sin(ra * DEG), Math.sin(dec * DEG)]
const angle = (a, b) => {
  const [u, v] = [unit(a.ra, a.dec), unit(b.ra, b.dec)]
  return Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) / DEG
}

/** L'angle de position (depuis le nord, vers l'est) de `to` vu depuis `from`, en radians. */
function positionAngle(from, to) {
  const da = (to.ra - from.ra) * DEG
  const [d1, d2] = [from.dec * DEG, to.dec * DEG]
  return Math.atan2(Math.sin(da) * Math.cos(d2), Math.cos(d1) * Math.sin(d2) - Math.sin(d1) * Math.cos(d2) * Math.cos(da))
}

/**
 * Carte de repérage, comme celles de Heavens-Above et d'In-The-Sky : le trajet de la comète parmi les étoiles
 * (jusqu'à la magnitude 6,5, 5,5 dans un grand champ) et les figures des constellations, avec ses dates ; la comète à l'instant choisi, sa
 * queue à l'opposé du Soleil. Nord en haut, est à gauche, comme le ciel.
 */
export default function FinderChart({ comet, date, span = 60 }) {
  const chart = useMemo(() => {
    const before = Math.round(span / 6)
    const path = []
    for (let d = -before; d <= span - before; d++) {
      const p = cometPosition(comet.el, addDays(date, d))
      path.push({ d, t: addDays(date, d), ra: p.ra, dec: p.dec })
    }
    // Le centre du champ : la direction moyenne du trajet
    const sum = path.reduce((s, p) => unit(p.ra, p.dec).map((x, k) => s[k] + x), [0, 0, 0])
    const center = { ra: ((Math.atan2(sum[1], sum[0]) / DEG + 360) % 360), dec: Math.asin(sum[2] / Math.hypot(...sum)) / DEG }
    const extent = Math.max(...path.map((p) => angle(p, center)))
    const fov = Math.min(80, Math.max(18, extent * 2.6))
    const scale = W / 2 / Math.tan((fov / 2) * DEG)
    const tangent = gnomonic(center.ra, center.dec)
    const project = (ra, dec) => {
      const q = tangent(ra, dec)
      return q ? [W / 2 - q[0] * scale, H / 2 - q[1] * scale] : null
    }
    const inside = (p, margin = 10) => p && p[0] > -margin && p[0] < W + margin && p[1] > -margin && p[1] < H + margin

    const magLimit = fov > 50 ? 5.5 : 6.5
    const stars = []
    for (const [ra, dec, mag] of STARS) {
      if (mag > magLimit) continue
      const p = project(ra, dec)
      if (inside(p)) stars.push({ x: p[0], y: p[1], r: Math.max(0.6, 3.6 - 0.52 * mag) })
    }
    const lines = []
    for (const c of LINES) {
      for (const seg of c.l) {
        for (let k = 1; k < seg.length; k++) {
          const [a, b] = [project(...seg[k - 1]), project(...seg[k])]
          if (a && b && (inside(a, 0) || inside(b, 0))) lines.push([a, b])
        }
      }
    }
    const names = CONSTELLATIONS.map((c) => ({ id: c.id, name: c.fr, p: project(c.ra, c.dec) })).filter(
      (c) => c.p && c.p[0] > 40 && c.p[0] < W - 40 && c.p[1] > 24 && c.p[1] < H - 24,
    )
    const track = path.map((p) => ({ ...p, xy: project(p.ra, p.dec) })).filter((p) => p.xy)
    const step = span <= 30 ? 5 : span <= 60 ? 10 : 20
    // Les dates, sur le côté du trajet (perpendiculairement à sa direction), pour ne pas le couvrir
    const ticks = track
      .map((p, k) => ({ ...p, k }))
      .filter((p) => p.d % step === 0 || p.d === -before)
      .map((p) => {
        const [a, b] = [track[Math.max(0, p.k - 1)].xy, track[Math.min(track.length - 1, p.k + 1)].xy]
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
        let [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
        if (ny > 0) [nx, ny] = [-nx, -ny] // au-dessus du trajet, quand c'est possible
        return { ...p, label: [p.xy[0] + nx * 12, p.xy[1] + ny * 12 + 4], anchor: nx > 0.3 ? 'start' : nx < -0.3 ? 'end' : 'middle' }
      })
    const now = track.find((p) => p.d === 0)
    // La queue, à l'opposé du Soleil
    const sun = Astronomy.EquatorFromVector(Astronomy.GeoVector(Astronomy.Body.Sun, date, true))
    const pa = positionAngle(path.find((p) => p.d === 0), { ra: sun.ra * 15, dec: sun.dec })
    const tail = now ? { x: now.xy[0] + Math.sin(pa) * 30, y: now.xy[1] + Math.cos(pa) * 30 } : null
    return { stars, lines, names, track, ticks, now, tail, fov, magLimit }
  }, [comet, date, span])

  const { stars, lines, names, track, ticks, now, tail, fov, magLimit } = chart
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-xl" role="img" aria-label={`Carte de repérage de ${comet.short}`}>
        <defs>
          <clipPath id={`champ-${comet.id}`}>
            <rect width={W} height={H} rx="12" />
          </clipPath>
        </defs>
        <g clipPath={`url(#champ-${comet.id})`}>
          <rect width={W} height={H} style={{ fill: CIEL_000 }} />
          {lines.map(([a, b], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: ENCRE_ATTENUEE }} strokeOpacity="0.35" strokeWidth="1" />
          ))}
          {names.map((c) => (
            <text key={c.id} x={c.p[0]} y={c.p[1]} textAnchor="middle" className="text-[11px] uppercase tracking-wide" style={{ fill: ENCRE_ATTENUEE }} fillOpacity="0.8">
              {c.name}
            </text>
          ))}
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} style={{ fill: ENCRE }} />
          ))}
          <polyline points={track.map((p) => p.xy.join(',')).join(' ')} fill="none" style={{ stroke: OR_ALERTE }} strokeWidth="1.6" strokeLinejoin="round" />
          {ticks.map((p) => (
            <g key={p.d}>
              <circle cx={p.xy[0]} cy={p.xy[1]} r="2.6" style={{ fill: OR_ALERTE, stroke: CIEL_000 }} strokeWidth="1" />
              <text x={p.label[0]} y={p.label[1]} textAnchor={p.anchor} className="text-[10px]" style={{ fill: ENCRE }}>
                {dayMonth.format(p.t)}
              </text>
            </g>
          ))}
          {now && (
            <g>
              <line x1={now.xy[0]} y1={now.xy[1]} x2={tail.x} y2={tail.y} style={{ stroke: OR_ALERTE }} strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
              <circle cx={now.xy[0]} cy={now.xy[1]} r="5" style={{ fill: OR_ALERTE, stroke: CIEL_000 }} strokeWidth="1.5" />
            </g>
          )}
          <rect width={W} height={H} rx="12" fill="none" style={{ stroke: CIEL_200 }} strokeWidth="2" />
          <text x="14" y={H - 14} className="font-mono text-[11px]" style={{ fill: ENCRE_ATTENUEE }}>
            N ↑ · E ← · champ {Math.round(fov)}°
          </text>
        </g>
      </svg>
      <figcaption className="mt-2 text-xs text-night-500">
        Le trajet de {comet.short} du {dayMonth.format(track[0].t)} au {dayMonth.format(track.at(-1).t)}, parmi les étoiles jusqu’à la magnitude {String(magLimit).replace('.', ',')} ;
        le gros point est la comète à l’instant choisi, sa queue tournée à l’opposé du Soleil.
      </figcaption>
    </figure>
  )
}
