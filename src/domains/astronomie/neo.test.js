/**
 * Les géocroiseurs (neo/neo.js), comme tests/test_neo.py de Céleste (4.20). Les échantillons sont de vraies réponses
 * des API du JPL, du 13 novembre 2026 : la Close-Approach Data API (sept passages) et Horizons (2016 NV, éphémérides
 * géocentriques autour de son passage du 8 décembre 2026). Les positions vues de Paris sont comparées aux
 * éphémérides d'Horizons pour Paris même.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { makeObserver } from './lib/astro'
import {
  LD_AU,
  asteroidName,
  bestMagnitude,
  cadQuery,
  horizonsCommand,
  horizonsQuery,
  lunarDistances,
  notable,
  parseCad,
  parseEphemeris,
  seenFrom,
  sigmaMinutes,
  sizeM,
  windows,
  worthAnEphemeris,
} from './neo/neo'

const read = (name) => readFileSync(new URL(`./test-data/${name}`, import.meta.url), 'utf8')
const PAYLOAD = JSON.parse(read('cad_sample.json'))
const APPROACHES = parseCad(PAYLOAD)
const EPHEMERIS = read('horizons_2016NV.txt')
const PARIS = makeObserver({ lat: 48.85, lon: 2.35 })
const find = (designation, year) => APPROACHES.find((a) => a.designation === designation && (year == null || a.date.getUTCFullYear() === year))
const utc = (...parts) => new Date(Date.UTC(parts[0], parts[1] - 1, ...parts.slice(2)))

describe('Les passages du CNEOS', () => {
  it('lit les passages, par date', () => {
    expect(APPROACHES).toHaveLength(7)
    expect(APPROACHES.every((a, i) => i === 0 || APPROACHES[i - 1].date <= a.date)).toBe(true)
    const nv = find('2016 NV')
    // 18 h 43 TDB, c'est 18 h 42 UT (ΔT 69 s)
    expect(nv.date >= utc(2026, 12, 8, 18, 41, 30) && nv.date <= utc(2026, 12, 8, 18, 42, 30)).toBe(true)
    expect(nv.distanceAu).toBeCloseTo(0.0366182473671146, 12)
    expect(nv.speed).toBeCloseTo(10.416, 3)
    expect(nv.h).toBe(19.86)
    expect(nv.name).toBe('2016 NV')
    expect(nv.diameterKm).toBeNull()
    expect(nv.sigmaMinutes).toBe(0)
  })

  it('lit les noms et les incertitudes', () => {
    expect(find('506074').name).toBe('506074 Svarog')
    expect(find('506074').diameterKm).toBe(0.665)
    expect(find('137108').name).toBe('137108 (1999 AN10)')
    expect(find('2026 VQ5').sigmaMinutes).toBe(179) // « 02:59 »
    expect(find('2023 VE6').sigmaMinutes).toBe(5 * 1440 + 3 * 60 + 28) // « 5_03:28 »
    expect(sigmaMinutes('')).toBeNull()
    expect(sigmaMinutes('??')).toBeNull()
    expect(asteroidName('       (2026 VP8)', '2026 VP8')).toBe('2026 VP8')
    expect(asteroidName('', '2026 VP8')).toBe('2026 VP8')
  })

  it('omet les lignes illisibles', () => {
    const damaged = { ...PAYLOAD, data: [PAYLOAD.fields.map(() => 'x'), ...PAYLOAD.data] }
    expect(parseCad(damaged)).toHaveLength(7)
    expect(parseCad({})).toEqual([])
  })

  it('demande une semaine avant et un an après, à moins de 0,05 ua', () => {
    const query = cadQuery(utc(2026, 11, 13))
    expect(query['date-min']).toBe('2026-11-06')
    expect(query['date-max']).toBe('2027-11-14')
    expect(query['dist-max']).toBe('0.05')
  })
})

describe('Ce que les chiffres veulent dire', () => {
  it('estime la taille', () => {
    const [small, large] = sizeM(find('2016 NV')) // H 19,86
    expect(small).toBeGreaterThan(284 * 0.99)
    expect(small).toBeLessThan(284 * 1.01)
    expect(large).toBeGreaterThan(634 * 0.99)
    expect(large).toBeLessThan(634 * 1.01)
    expect(sizeM(find('506074'))).toEqual([665, 665]) // mesuré
    expect(sizeM({ h: null })).toBeNull()
  })

  it('compte en distances lunaires', () => {
    expect(lunarDistances(find('137108').distanceAu)).toBeCloseTo(1.014, 2)
    expect(lunarDistances(LD_AU)).toBeCloseTo(1, 10)
  })

  it('reconnaît les remarquables', () => {
    expect(notable(find('137108'))).toBe(true) // 1 km, à une distance lunaire
    expect(notable(find('2016 NV'))).toBe(true) // H 19,9 : 280 à 630 m
    expect(notable(find('2026 VP8', 2026))).toBe(false) // 8 à 18 m à 3 DL
    expect(notable({ distanceAu: 0.5 * LD_AU, h: 30 })).toBe(true) // plus près que la Lune
  })

  it('choisit ceux qui valent des éphémérides', () => {
    expect(bestMagnitude(find('2016 NV'))).toBeCloseTo(12.7, 1)
    expect(worthAnEphemeris(find('2016 NV'))).toBe(true)
    expect(worthAnEphemeris(find('2026 VP8', 2026))).toBe(false) // 16,7 au mieux
    expect(worthAnEphemeris({ distanceAu: 0.01, h: null })).toBe(false)
  })
})

describe('Horizons', () => {
  it('nomme les petits corps', () => {
    expect(horizonsCommand('99942')).toBe("'99942;'")
    expect(horizonsCommand('2016 NV')).toBe("'DES=2016 NV;'")
  })

  it('demande des positions géocentriques : le lieu n’est pas envoyé', () => {
    const query = horizonsQuery(find('2016 NV'))
    expect(query.COMMAND).toBe("'DES=2016 NV;'")
    expect(query.CENTER).toBe("'500@399'")
    expect(query.START_TIME).toBe("'2026-12-06 18:41'")
    expect(query.STOP_TIME).toBe("'2026-12-10 18:41'")
  })

  it('lit les éphémérides', () => {
    const rows = parseEphemeris(EPHEMERIS)
    expect(rows).toHaveLength(21)
    const [first] = rows
    expect(first.date).toEqual(utc(2026, 12, 8, 12, 0))
    expect(first.ra).toBeCloseTo(2.807159596 / 15, 12)
    expect(first.dec).toBeCloseTo(10.43865839, 12)
    expect(first.mag).toBe(15.056)
    expect(first.distanceAu).toBeCloseTo(0.0366599638844, 12)
    expect(() => parseEphemeris('No matches found.')).toThrow()
  })

  // Horizons pour Paris même (2,35° E, 48,85° N, apparent sans réfraction) : heure UT, hauteur, azimut
  const HORIZONS_PARIS = [
    [18, 48.253, 157.141],
    [19, 49.999, 179.316],
    [20, 48.001, 201.401],
    [21, 42.743, 220.836],
    [22, 35.217, 236.969],
  ]

  it('voit l’astéroïde de Paris comme Horizons', () => {
    const seen = Object.fromEntries(
      seenFrom(parseEphemeris(EPHEMERIS), PARIS)
        .filter((r) => r.date.getUTCDate() === 8)
        .map((r) => [r.date.getUTCHours(), r]),
    )
    for (const [hour, alt, az] of HORIZONS_PARIS) {
      expect(Math.abs(seen[hour].alt - alt), `${hour} h`).toBeLessThan(0.02)
      expect(Math.abs(seen[hour].az - az), `${hour} h`).toBeLessThan(0.02)
    }
    const row = seen[19]
    expect(Math.abs(row.distanceKm / (row.distanceAu * 149_597_870.7) - 1)).toBeLessThan(0.002)
    expect(row.rate).toBeGreaterThan(15) // secondes d'arc par minute
    expect(row.rate).toBeLessThan(30)
    expect(row.sun).toBeLessThan(-25)
  })

  it('trouve quand le voir', () => {
    const seen = seenFrom(parseEphemeris(EPHEMERIS), PARIS)
    const found = windows(seen)
    expect(found).toHaveLength(1)
    const [window] = found
    expect(window.start).toEqual(utc(2026, 12, 8, 18, 0)) // le Soleil à 12° sous l'horizon après 17 h 15 UT
    expect(window.end).toEqual(utc(2026, 12, 9, 0, 0)) // puis trop bas à l'ouest
    expect(window.best.alt).toBeGreaterThanOrEqual(45) // le plus brillant à travers le moins d'air
    expect(windows(seen, { minAlt: 60 })).toEqual([])
  })
})
