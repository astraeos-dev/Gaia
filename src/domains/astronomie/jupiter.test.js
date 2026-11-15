import { describe, expect, it } from 'vitest'
import { jupiterMoons, moonEvents } from './jupiter/moons'

const start = new Date(Date.UTC(2026, 10, 15))

describe('satellites de Jupiter vus de la Terre', () => {
  it('chacun s’écarte de Jupiter autant que son orbite le permet', () => {
    const max = { io: 0, europa: 0, ganymede: 0, callisto: 0 }
    for (let h = 0; h < 24 * 17; h += 1) {
      for (const m of jupiterMoons(new Date(start.getTime() + h * 3_600_000))) max[m.id] = Math.max(max[m.id], Math.hypot(m.x, m.y))
    }
    // demi-grands axes : 5,9 ; 9,4 ; 15,0 ; 26,4 rayons de Jupiter
    expect(max.io).toBeGreaterThan(5.5)
    expect(max.io).toBeLessThan(6.3)
    expect(max.europa).toBeGreaterThan(8.9)
    expect(max.ganymede).toBeGreaterThan(14.4)
    expect(max.callisto).toBeGreaterThan(25.5)
    expect(max.callisto).toBeLessThan(27)
  })

  it('Io passe devant Jupiter et derrière en quatre jours (période de 1,77 jour)', () => {
    const io = moonEvents(start, 4).filter((e) => e.moon.id === 'io')
    expect(io.some((e) => e.kind === 'transit')).toBe(true)
    expect(io.some((e) => e.kind === 'occulted')).toBe(true)
    for (const e of io.filter((x) => x.kind === 'transit' && x.start && x.end)) {
      const hours = (e.end - e.start) / 3_600_000
      expect(hours).toBeGreaterThan(1.5)
      expect(hours).toBeLessThan(2.8)
    }
  })
})
