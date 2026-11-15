import { describe, expect, it } from 'vitest'
import { SHOWERS, activity, nextMaximum, solarLongitude, whenSolarLongitude } from './meteors/showers'

const byCode = (code) => SHOWERS.find((s) => s.code === code)

describe('étoiles filantes : maxima d’après la longitude du Soleil', () => {
  it('le Soleil atteint la longitude cherchée', () => {
    const t = whenSolarLongitude(140, 2027)
    expect(solarLongitude(t)).toBeCloseTo(140, 4)
  })

  it('les maxima tombent aux dates du calendrier de l’IMO', () => {
    // Perséides 2027 : 13 août ; Géminides 2026 : 14 décembre ; Quadrantides 2027 : 4 janvier
    expect(whenSolarLongitude(byCode('PER').lambda, 2027).toISOString().slice(0, 10)).toBe('2027-08-13')
    expect(whenSolarLongitude(byCode('GEM').lambda, 2026).toISOString().slice(0, 10)).toBe('2026-12-14')
    expect(whenSolarLongitude(byCode('QUA').lambda, 2026).toISOString().slice(0, 10)).toBe('2027-01-04')
  })

  it('le prochain maximum, et une activité qui enjambe le nouvel an', () => {
    const today = new Date(Date.UTC(2026, 11, 20))
    const qua = nextMaximum(byCode('QUA'), today)
    expect(qua.toISOString().slice(0, 7)).toBe('2027-01')
    const { start, end } = activity(byCode('QUA'), qua)
    expect(start.getFullYear()).toBe(2026)
    expect(end.getFullYear()).toBe(2027)
  })
})
