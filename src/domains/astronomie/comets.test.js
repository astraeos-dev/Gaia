import { describe, expect, it } from 'vitest'
import { cometPosition, julianDay, orbitInfo, orbitPoints, predictedMagnitude, speedKmS } from './lib/comets'
import DATA from './data/comets.json'
import ASTEROIDS from './data/asteroids.json'

const at = new Date(Date.UTC(2026, 10, 15, 17, 53, 6))
const arcsec = (a, b) => {
  const dRa = (((a.ra - b.ra + 540) % 360) - 180) * Math.cos((b.dec * Math.PI) / 180)
  return Math.hypot(dRa, a.dec - b.dec) * 3600
}

describe('comètes : orbites à deux corps', () => {
  it('jour julien', () => {
    expect(julianDay(2000, 1, 1.5)).toBe(2451545)
    expect(julianDay(1987, 6, 19.5)).toBe(2446966)
  })

  // Éléments MPC du 15 novembre 2026 ; valeurs de Heavens-Above (comet.aspx?cid=29P) au même instant
  const p29 = { q: 5.798006, e: 0.042908, peri: 51.1929, node: 312.399, i: 9.3548, tp: julianDay(2034, 3, 14.33), H: 4, G: 4 }

  it('29P comme Heavens-Above : position, distances, élongation, latitude, orbite', () => {
    const p = cometPosition(p29, at)
    expect(p.raHours * 60).toBeCloseTo(12 * 60 + 33.5, 0)
    expect(p.dec).toBeCloseTo(-(11 + 1 / 60), 1)
    expect(p.delta).toBeCloseTo(7.025, 2)
    expect(p.r).toBeCloseTo(6.318, 2)
    expect(p.elongation).toBeCloseTo(41.4, 0)
    expect(p.helioLat).toBeCloseTo(-7.6, 0)
    const o = orbitInfo(p29)
    expect(o.aphelion).toBeCloseTo(6.318, 2)
    expect(o.period).toBeCloseTo(14.9, 1)
    expect(speedKmS(p29, p.r)).toBeCloseTo(11.593, 1)
  })

  // Références : Skyfield (orbite à deux corps, éphéméride DE440s), comme Céleste
  it('orbite hyperbolique (C/2024 T5) à la seconde d’arc près de Skyfield', () => {
    const el = { q: 3.839334, e: 1.002304, i: 52.3876, node: 100.6772, peri: 352.4889, tp: julianDay(2027, 5, 6.3303) }
    const p = cometPosition(el, at)
    expect(arcsec(p, { ra: 84.4439897, dec: -13.1202693 })).toBeLessThan(2)
    expect(p.delta).toBeCloseTo(3.3723332, 4)
  })

  it('orbite elliptique très allongée (C/2026 A2) à la seconde d’arc près de Skyfield', () => {
    const el = { q: 1.937771, e: 0.997664, i: 82.3062, node: 206.5873, peri: 155.9389, tp: julianDay(2026, 12, 22.3548) }
    const p = cometPosition(el, at)
    expect(arcsec(p, { ra: 314.6836886, dec: 44.4324165 })).toBeLessThan(2)
    expect(p.delta).toBeCloseTo(1.5820272, 4)
  })

  // Vesta : éléments du JPL (époque JD 2461200,5) ; référence JPL Horizons au même instant (RA/Dec astrométriques, APmag)
  it('astéroïde (Vesta) : position et magnitude H, G comme JPL Horizons', () => {
    const vesta = { kind: 'asteroid', q: 2.148361914524259, e: 0.09020374382834395, i: 7.143925545058711, node: 103.701293265032, peri: 151.4686478221564, tp: 2460901.587379843, H: 3.25, G: 0.32 }
    const p = cometPosition(vesta, at)
    expect(arcsec(p, { ra: 15.931, dec: -4.50368 })).toBeLessThan(30)
    expect(p.delta).toBeCloseTo(1.66348, 2)
    expect(p.r).toBeCloseTo(2.4943, 2)
    expect(p.mag).toBeCloseTo(7.009, 1)
  })

  it('magnitude prévue : m = H + 5 log Δ + 2,5 G log r', () => {
    expect(predictedMagnitude({ H: 5, G: 4 }, 10, 10)).toBeCloseTo(5 + 5 + 10, 6)
    expect(predictedMagnitude({ H: null, G: 4 }, 1, 1)).toBeNull()
  })

  it('une ellipse se referme ; une orbite ouverte s’arrête à rMax', () => {
    const pts = orbitPoints(p29, 90)
    expect(Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y)).toBeLessThan(1e-9)
    const open = orbitPoints({ q: 1, e: 1.2, i: 10, node: 0, peri: 0 }, 50, 8)
    expect(open[0].r).toBeCloseTo(8, 6)
    expect(open.at(-1).r).toBeCloseTo(8, 6)
  })
})

describe('astéroïdes : données du site', () => {
  it('chaque astre a ses éléments, ses paramètres H et un identifiant d’adresse unique', () => {
    expect(ASTEROIDS.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(ASTEROIDS.asteroids.length).toBeGreaterThan(20)
    expect(new Set(ASTEROIDS.asteroids.map((a) => a.id)).size).toBe(ASTEROIDS.asteroids.length)
    for (const a of ASTEROIDS.asteroids) {
      expect(a.id).toMatch(/^[a-z0-9-]+$/)
      for (const k of ['q', 'e', 'i', 'node', 'peri', 'tp']) expect(Number.isFinite(a.orbit[k])).toBe(true)
      expect(Number.isFinite(a.H)).toBe(true)
    }
  })
})

describe('comètes : données du site', () => {
  it('chaque comète a ses éléments, un identifiant d’adresse unique et une source datée', () => {
    expect(DATA.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(DATA.comets.length).toBeGreaterThan(5)
    const ids = new Set()
    for (const c of DATA.comets) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/)
      expect(ids.has(c.id)).toBe(false)
      ids.add(c.id)
      for (const k of ['q', 'e', 'i', 'node', 'peri', 'tp']) expect(Number.isFinite(c.orbit[k])).toBe(true)
      expect(c.designation).toBeTruthy()
    }
  })
})
