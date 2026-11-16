import { describe, expect, it } from 'vitest'
import { Astronomy } from './lib/astro'
import { ALGOL, DARK_SUN, UNCERTAINTY_MIN, VISIBLE_ALT, jdOf, lightTimeDays, minima, minimaFrom, visibleMinima } from './variables/algol'

describe('Algol : les minima, comme variables.py de Céleste', () => {
  // Minima principaux observés, JJH (CCD), base Lichtenknecker du BAV
  const OBSERVED = [2455800.48358, 2456976.0904, 2457021.9674, 2457059.243, 2457698.6591, 2458065.6732]
  const predictedHjd = (hjd) => ALGOL.epoch + Math.round((hjd - ALGOL.epoch) / ALGOL.period) * ALGOL.period
  const hjdOf = (date) => jdOf(date) + lightTimeDays(jdOf(date))
  const minutes = (days) => days * 1440

  it('suit les minima observés à dix minutes près', () => {
    for (const hjd of OBSERVED) expect(Math.abs(minutes(hjd - predictedHjd(hjd)))).toBeLessThan(10)
  })

  it('s’accorde avec les éléments du BAV et de Kreiner (JJH 2452500,1750 + 2,8673390 E) de 2025 à 2027', () => {
    const dates = minima(new Date(Date.UTC(2025, 0, 1)), new Date(Date.UTC(2028, 0, 1)))
    for (const date of dates.filter((_, i) => i % 20 === 0)) {
      const hjd = hjdOf(date)
      const cycle = Math.round((hjd - 2452500.175) / 2.867339)
      expect(Math.abs(minutes(2452500.175 + cycle * 2.867339 - hjd))).toBeLessThan(10)
    }
  })

  it('retrouve une prévision publiée : le 1er juin 2019 à 18 h 28 UT (Kosmos Himmelsjahr)', () => {
    const [minimum] = minima(new Date(Date.UTC(2019, 5, 1, 12)), new Date(Date.UTC(2019, 5, 2)))
    expect(Math.abs(minimum - new Date(Date.UTC(2019, 5, 1, 18, 28))) / 60_000).toBeLessThan(UNCERTAINTY_MIN)
  })

  it('le temps de lumière suit la Terre : 8,3 minutes au plus', () => {
    for (let d = 0; d < 366; d += 2) expect(Math.abs(minutes(lightTimeDays(jdOf(new Date(Date.UTC(2026, 0, 1 + d))))))).toBeLessThan(8.4)
    expect(minutes(lightTimeDays(jdOf(new Date(Date.UTC(2026, 10, 17)))))).toBeGreaterThan(7.3)
    expect(minutes(lightTimeDays(jdOf(new Date(Date.UTC(2026, 4, 17)))))).toBeLessThan(-7.3)
  })

  it('un minimum à chaque période', () => {
    const dates = minima(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2027, 0, 1)))
    expect([127, 128]).toContain(dates.length)
    for (let i = 1; i < dates.length; i++) expect(Math.abs((dates[i] - dates[i - 1]) / 86_400_000 - ALGOL.period)).toBeLessThan(1 / 1440)
  })

  it('vus de Cherbourg : une trentaine par an, dont celui du 10 novembre 2026 vers 0 h 10 UT, près du zénith', () => {
    const cherbourg = new Astronomy.Observer(49.6333, -1.6167, 0)
    const seen = visibleMinima(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2027, 0, 1)), cherbourg)
    expect(seen.length).toBeGreaterThanOrEqual(20)
    expect(seen.length).toBeLessThanOrEqual(50)
    expect(seen.every((m) => m.alt >= VISIBLE_ALT && m.sun <= DARK_SUN)).toBe(true)
    const near = seen.find((m) => m.date.toISOString().startsWith('2026-11-10'))
    expect(near.alt).toBeGreaterThan(75)
    expect(near.date.getUTCHours()).toBe(0)
  })

  it('à peine vus de Sydney, où Algol culmine à 15°', () => {
    const sydney = new Astronomy.Observer(-33.87, 151.21, 0)
    const all = minimaFrom(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2027, 0, 1)), sydney)
    expect(all.filter((m) => m.visible).length).toBeLessThanOrEqual(6)
  })
})
