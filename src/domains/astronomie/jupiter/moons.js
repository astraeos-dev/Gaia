/**
 * LES SATELLITES GALILÉENS DE JUPITER, VUS DE LA TERRE
 * ---------------------------------------------------
 * Astronomy Engine donne la position d'Io, Europe, Ganymède et Callisto autour de Jupiter (théorie L1.2 de
 * Lieske, comme Céleste). On la projette sur le ciel vu de la Terre, au temps de lumière près : décalage vers
 * l'est et le nord, en rayons équatoriaux de Jupiter, et devant ou derrière la planète. Les ombres et les éclipses
 * suivent la direction du Soleil (Jupiter est pris pour une sphère).
 */
import * as Astronomy from 'astronomy-engine'

const RJ = 71_492 / Astronomy.KM_PER_AU // rayon équatorial de Jupiter (UA)
const LIGHT_DAYS_PER_AU = 0.0057755183

export const MOONS = [
  { id: 'io', name: 'Io', letter: 'I' },
  { id: 'europa', name: 'Europe', letter: 'E' },
  { id: 'ganymede', name: 'Ganymède', letter: 'G' },
  { id: 'callisto', name: 'Callisto', letter: 'C' },
]

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const unit = (v) => {
  const l = Math.hypot(...v)
  return v.map((x) => x / l)
}

/**
 * Les quatre satellites à un instant : x (vers l'est) et y (vers le nord) en rayons de Jupiter, depth (> 0 :
 * plus loin que Jupiter) ; transit (devant le disque), occulted (derrière), eclipsed (dans l'ombre de Jupiter),
 * shadow (la position de son ombre sur le disque, ou null).
 */
export function jupiterMoons(date) {
  const time = Astronomy.MakeTime(date)
  const jv = Astronomy.GeoVector(Astronomy.Body.Jupiter, time, true)
  const toJupiter = [jv.x, jv.y, jv.z]
  const back = time.AddDays(-Math.hypot(...toJupiter) * LIGHT_DAYS_PER_AU)
  const moons = Astronomy.JupiterMoons(back)
  const u = unit(toJupiter)
  const ra = Math.atan2(u[1], u[0])
  const dec = Math.asin(u[2])
  const east = [-Math.sin(ra), Math.cos(ra), 0]
  const north = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)]
  const jh = Astronomy.HelioVector(Astronomy.Body.Jupiter, back)
  const s = unit([jh.x, jh.y, jh.z]) // du Soleil vers Jupiter : la direction des ombres
  return MOONS.map((m) => {
    const v = moons[m.id]
    const p = [v.x, v.y, v.z]
    const x = dot(p, east) / RJ
    const y = dot(p, north) / RJ
    const depth = dot(p, u) / RJ
    const onDisc = Math.hypot(x, y) < 1
    const along = dot(p, s)
    const perp = p.map((c, k) => c - along * s[k])
    const offAxis = Math.hypot(...perp) / RJ
    return {
      ...m,
      x,
      y,
      depth,
      transit: onDisc && depth < 0,
      occulted: onDisc && depth > 0,
      eclipsed: along > 0 && offAxis < 1,
      shadow: along < 0 && offAxis < 1 ? { x: dot(perp, east) / RJ, y: dot(perp, north) / RJ } : null,
    }
  })
}

const KINDS = [
  ['transit', 'passe devant Jupiter'],
  ['shadow', 'projette son ombre sur Jupiter'],
  ['occulted', 'passe derrière Jupiter'],
  ['eclipsed', 'entre dans l’ombre de Jupiter'],
]

/** Les phénomènes des `days` jours qui suivent `start` : début et fin de chaque passage, ombre, occultation, éclipse. */
export function moonEvents(start, days = 4, stepMinutes = 4) {
  const events = []
  const open = new Map()
  const steps = Math.round((days * 1440) / stepMinutes)
  for (let k = 0; k <= steps; k++) {
    const t = new Date(start.getTime() + k * stepMinutes * 60_000)
    for (const m of jupiterMoons(t)) {
      for (const [kind] of KINDS) {
        const key = `${m.id}:${kind}`
        const on = Boolean(m[kind])
        if (on && !open.has(key)) open.set(key, k === 0 ? null : t)
        if (!on && open.has(key)) {
          events.push({ moon: m, kind, start: open.get(key), end: t })
          open.delete(key)
        }
      }
    }
  }
  for (const [key, begin] of open) {
    const [id, kind] = key.split(':')
    events.push({ moon: MOONS.find((m) => m.id === id), kind, start: begin, end: null })
  }
  return events
    .map((e) => ({ ...e, label: KINDS.find(([k]) => k === e.kind)[1] }))
    .sort((a, b) => (a.start ?? start) - (b.start ?? start))
}
