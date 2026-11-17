/**
 * Le planificateur de nuit (planner/planner.js), comme tests/test_planner.py de Céleste (4.10) : de Cherbourg, la
 * nuit du 1er au 2 novembre 2026 (la Lune éclairée à 49 %, levée à 22 h 42 UT).
 */
import { describe, expect, it } from 'vitest'
import { Astronomy, makeObserver, refraction } from './lib/astro'
import { airmass, catalog, customTarget, grid, horizonAltitude, label, matches, nightWindow, plan, reportJson } from './planner/planner'

const CHERBOURG = makeObserver({ lat: 49.6333, lon: -1.6167 })
const NIGHT = new Date('2026-11-01T21:30:00Z')
const MESSIER = plan(NIGHT, CHERBOURG)
const find = (result, name) => result.deepSky.find((o) => o.label === name)
const minutes = (a, b) => Math.abs(a - b) / 60_000

describe('Les catalogues', () => {
  it('a les 110 objets de Messier, les 109 de Caldwell et les autres brillants', () => {
    expect(catalog('messier')).toHaveLength(110)
    expect(catalog('caldwell')).toHaveLength(109)
    expect(catalog('all').length).toBeGreaterThan(400)
  })

  it('nomme les objets', () => {
    const m31 = catalog('messier')[30]
    expect([label(m31), m31.id, m31.name, m31.type, m31.mag]).toEqual(['M31', 'NGC 224', 'Galaxie d’Andromède'.replace('’', "'"), 'galaxy', 3.4])
    expect(m31.size).toBeGreaterThan(150)
    const c14 = catalog('caldwell').find((o) => o.c === 14)
    expect([label(c14), c14.name]).toEqual(['C14', 'Double amas de Persée'])
    expect(catalog('messier')[101].id).toBe('NGC 5866')
  })

  it('reconnaît un objet par son étiquette, sa désignation ou son nom', () => {
    const m31 = catalog('messier')[30]
    expect(matches(m31, ['m 31'])).toBe(true)
    expect(matches(m31, ['NGC224'])).toBe(true)
    expect(matches(m31, ["galaxie d'andromède"])).toBe(true)
    expect(matches(m31, ['M3'])).toBe(false)
  })

  it('ajoute les cibles de l’observateur à chaque catalogue', () => {
    const mine = customTarget('Mon objet', 10.684, 41.269, { type: 'galaxy', constellation: 'And', size: 30, mag: 9 })
    for (const name of ['messier', 'caldwell', 'all']) expect(catalog(name, [mine]).at(-1).id).toBe('Mon objet')
    expect(label(mine)).toBe('Mon objet')
    expect(customTarget('x', -10, 0).ra).toBe(350)
  })
})

describe('La géométrie', () => {
  it('prend la sécante pour masse d’air', () => {
    expect(airmass(90)).toBeCloseTo(1, 10)
    expect(airmass(30)).toBeCloseTo(2, 10)
    expect(airmass(-1)).toBe(Infinity)
  })

  it('réfracte comme Sæmundsson', () => {
    // 29′ pour une hauteur vraie de 0 (vue à 0,5°), 1′ à 45°
    expect(Math.abs(refraction(0) * 60 - 29)).toBeLessThan(0.3)
    expect(Math.abs(refraction(45) * 60 - 0.98)).toBeLessThan(0.05)
  })

  it('interpole le masque d’horizon tout autour', () => {
    const points = [
      [0, 10],
      [90, 20],
      [180, 0],
      [270, 30],
    ]
    const found = [45, 90, 315, 359].map((az) => horizonAltitude(az, points))
    ;[15, 20, 20, 10 + 20 / 90].forEach((h, i) => expect(found[i]).toBeCloseTo(h, 10))
    expect(horizonAltitude(123, [])).toBe(0)
  })
})

describe('La nuit', () => {
  it('est astronomique en novembre à Cherbourg', () => {
    const { window, times } = MESSIER
    expect(window.kind).toBe('astro')
    // le Soleil à −18° : la recherche d'Astronomy Engine, indépendante de l'échantillonnage
    const dusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, CHERBOURG, -1, new Date('2026-11-01T12:00:00Z'), 1, -18).date
    const dawn = Astronomy.SearchAltitude(Astronomy.Body.Sun, CHERBOURG, +1, dusk, 1, -18).date
    expect(minutes(window.start, dusk)).toBeLessThan(2)
    expect(minutes(window.end, dawn)).toBeLessThan(2)
    expect(window.start.toISOString().slice(11, 16)).toBe('18:33')
    expect([times[0], times.at(-1)]).toEqual([window.start, window.end])
    expect(Math.max(...times.slice(1).map((t, i) => t - times[i]))).toBeLessThanOrEqual(600_000)
    expect(grid(window, 10)).toHaveLength(times.length)
  })

  it('est nautique ou civile en juin à 59° de latitude', () => {
    const { kind } = nightWindow(new Date('2026-06-21T22:00:00Z'), makeObserver({ lat: 59.3, lon: 18.07 }))
    expect(['naut', 'civil']).toContain(kind)
  })

  it('n’existe pas pendant le jour polaire', () => {
    const result = plan(new Date('2026-06-21T22:00:00Z'), makeObserver({ lat: 78.22, lon: 15.65 }))
    expect(result.window.kind).toBeNull()
    expect(result.deepSky).toEqual([])
    expect(result.times).toEqual([])
  })
})

describe('Le ciel profond', () => {
  it('respecte les contraintes', () => {
    const c = MESSIER.constraints
    expect(MESSIER.deepSky.length).toBeGreaterThan(0)
    expect(MESSIER.deepSky.length).toBeLessThanOrEqual(c.maxTargets)
    for (const o of MESSIER.deepSky) {
      expect(o.fraction).toBeGreaterThanOrEqual(c.fractionMin)
      expect(o.size).toBeGreaterThanOrEqual(c.sizeMin)
      expect(o.size).toBeLessThanOrEqual(c.sizeMax)
      expect(o.best).not.toBeNull()
      expect(o.altMax).toBeGreaterThanOrEqual(c.altitudeMin)
    }
  })

  it('classe par la part de la nuit', () => {
    const fractions = MESSIER.deepSky.map((o) => o.fraction)
    expect(fractions).toEqual([...fractions].sort((a, b) => b - a))
    expect(MESSIER.deepSky.slice(0, 4).map((o) => o.label)).toEqual(['M33', 'M34', 'M45', 'M31'])
  })

  it('fait passer M31 au méridien à 22 h 05 UT', () => {
    const m31 = find(MESSIER, 'M31')
    expect(m31.transit.toISOString().slice(0, 16)).toBe('2026-11-01T22:05')
    expect(Math.abs(m31.altMax - (90 - (49.6333 - 41.4)))).toBeLessThan(0.3)
  })

  it('tient compte de la Lune', () => {
    const near = plan(NIGHT, CHERBOURG, { constraints: { moonSeparationMin: 0 } })
    const far = plan(NIGHT, CHERBOURG, { constraints: { moonSeparationMin: 100 } })
    expect(far.deepSky.length).toBeLessThan(near.deepSky.length)
    const lit = plan(NIGHT, CHERBOURG, { constraints: { moonSeparationFromIllumination: true } })
    expect(lit.moon.separationMin).toBeCloseTo(lit.moon.illumination, 10)
    expect(lit.moon.illumination).toBeGreaterThan(45)
    expect(lit.moon.illumination).toBeLessThan(52)
  })

  it('filtre par type, taille et magnitude', () => {
    const result = plan(NIGHT, CHERBOURG, { constraints: { types: ['open_cluster'], sizeMin: 0, magnitudeMax: 6, fractionMin: 0.1 } })
    expect(result.deepSky.length).toBeGreaterThan(0)
    expect(result.deepSky.every((o) => o.type === 'open_cluster' && o.mag <= 6)).toBe(true)
  })

  it('cache le sud derrière un mur', () => {
    // un mur au sud, haut de 75°, cache la culmination de M33 (71°) : une plus petite part de la nuit
    const wall = [
      [0, 0],
      [110, 0],
      [120, 75],
      [240, 75],
      [250, 0],
    ]
    const free = plan(NIGHT, CHERBOURG, { constraints: { fractionMin: 0 } })
    const masked = plan(NIGHT, CHERBOURG, { constraints: { fractionMin: 0 }, horizon: wall })
    expect(find(masked, 'M33').fraction).toBeLessThan(find(free, 'M33').fraction - 0.2)
  })

  it('montre toujours les cibles « à voir » et jamais celles « déjà vues »', () => {
    // M42 n'atteint jamais la part voulue de la nuit, mais la liste « à voir » la montre ; « déjà vues » ôte M31
    expect(find(MESSIER, 'M42')).toBeUndefined()
    const lists = plan(NIGHT, CHERBOURG, { bucket: ["Nébuleuse d'Orion"], done: ['M31'] })
    expect(find(lists, 'M42').bucket).toBe(true)
    expect(find(lists, 'M31')).toBeUndefined()
  })

  it('suit une cible de l’observateur', () => {
    const mine = customTarget('Mon objet', 10.684, 41.269, { type: 'galaxy', constellation: 'And', size: 30, mag: 9 })
    const result = plan(NIGHT, CHERBOURG, { custom: [mine] })
    expect(Math.abs(find(result, 'Mon objet').fraction - find(result, 'M31').fraction)).toBeLessThanOrEqual(0.02)
  })
})

describe('Les planètes, la Lune et les comètes', () => {
  it('donne les astres levés pendant la nuit', () => {
    expect(MESSIER.bodies.map((b) => b.body)).toEqual(['Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'])
    const saturn = MESSIER.bodies[3]
    const transit = Astronomy.SearchHourAngle(Astronomy.Body.Saturn, CHERBOURG, 0, new Date('2026-11-01T12:00:00Z')).time.date
    expect(Math.abs(saturn.transit - transit) / 1000).toBeLessThan(90)
    expect(saturn.mag).toBeGreaterThan(0)
    expect(saturn.mag).toBeLessThan(1.5)
  })

  it('garde les comètes assez brillantes et levées', () => {
    // deux comètes de test, immobiles près de M31 : l'une de magnitude 8, l'autre de 13
    const still = (mag) => () => ({ ra: 10.7, dec: 41.3, mag, earthAu: 0.6, sunAu: 1.2 })
    const result = plan(NIGHT, CHERBOURG, {
      comets: [
        { name: 'Brillante', position: still(8) },
        { name: 'Faible', position: still(13) },
      ],
    })
    expect(result.comets.map((c) => c.name)).toEqual(['Brillante'])
    expect(result.comets[0].altMax).toBeGreaterThan(80)
  })

  it('écrit le rapport comme uptonight', () => {
    const data = JSON.parse(reportJson(MESSIER, 'Cherbourg'))
    expect([data.place, data.night.kind]).toEqual(['Cherbourg', 'astro'])
    expect(data.night.start.slice(0, 16)).toBe('2026-11-01T18:33')
    expect(data.deep_sky[0].label).toBe('M33')
    expect(data.deep_sky[0].fraction).toBeGreaterThan(0)
    expect(data.deep_sky[0].fraction).toBeLessThanOrEqual(1)
    expect(data.constraints.airmassMax).toBe(2)
    expect(data.bodies[0].body).toBe('Moon')
  })
})
