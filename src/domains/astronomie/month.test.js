/**
 * La fiche du mois (month/month.js), comme month_sheet.py de Céleste (4.19) : novembre 2026 à Cherbourg. Les heures
 * sont celles du navigateur (ou de la machine des tests) : les attentes sont écrites en heures locales.
 */
import { describe, expect, it } from 'vitest'
import { makeObserver } from './lib/astro'
import { collect, daysInMonth, mapTime, moonDays, sameSky } from './month/month'

const CHERBOURG = makeObserver({ lat: 49.6333, lon: -1.6167 })
const at = (iso) => new Date(iso)

describe('La fiche du mois', () => {
  it('montre le ciel du 15 à 22 h, et quand il revient le premier et le dernier jour', () => {
    expect(mapTime(2026, 10).getDate()).toBe(15)
    expect(mapTime(2026, 10).getHours()).toBe(22)
    expect(daysInMonth(2026, 10)).toBe(30)
    // 3 min 56 s plus tôt chaque jour : 55 min plus tard le 1er, une heure plus tôt le 30
    const [first, last] = sameSky(2026, 10)
    expect(Math.abs(first - at('2026-11-01T22:55:00')) / 60_000).toBeLessThan(1)
    expect(Math.abs(last - at('2026-11-30T21:01:00')) / 60_000).toBeLessThan(1)
  })

  it('dessine la Lune chaque jour et marque ses phases principales', () => {
    const days = moonDays(2026, 10)
    expect(days).toHaveLength(30)
    // dernier quartier le 1er, nouvelle lune le 9, premier quartier le 17, pleine lune le 24 (UT), chacun le jour où il tombe
    const quarters = days.filter((d) => d.quarter != null)
    expect(quarters.slice(0, 4).map((d) => d.quarter)).toEqual([3, 0, 1, 2]) // à l'ouest, le dernier quartier du 1er décembre UT tombe aussi en novembre
    expect(quarters.every((d) => d.date.getDate() === d.quarterDate.getDate())).toBe(true)
    const full = days.find((d) => d.quarter === 2)
    expect(Math.abs(full.quarterDate - at('2026-11-24T14:54:00Z')) / 60_000).toBeLessThan(2) // 14 h 54 UT
    expect(Math.abs(days[full.date.getDate() - 1].phase - 180)).toBeLessThan(13) // à 22 h ce jour-là : moins d'un jour de la pleine lune
  })

  it('rassemble les planètes et les évènements du mois', () => {
    const sheet = collect(2026, 10, CHERBOURG)
    expect(sheet.planets.map((p) => p.id)).toEqual(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'])
    expect(sheet.planets.find((p) => p.id === 'Saturn').visibility.visible).toBe(true)
    expect(sheet.events.length).toBeGreaterThan(10)
    expect(sheet.events.every((e) => e.time >= at('2026-11-01T00:00:00') && e.time < at('2026-12-01T00:00:00'))).toBe(true)
    expect(sheet.events.some((e) => e.title === 'Pleine lune')).toBe(true)
  })
})
