/**
 * Les lunes des planètes et les anneaux de Saturne (moons/moons.js), comme planet_moons() et saturn_rings() de
 * Céleste. Les échantillons sont de vraies réponses de JPL Horizons du 17 novembre 2026 : les états de Titan et de
 * Rhéa par rapport à Saturne (SAT441), chaque jour du 17 au 20 novembre. Leurs positions vues de la Terre sont
 * comparées aux décalages qu'Horizons donne lui-même (quantité 6), et les anneaux à la latitude de la Terre vue de
 * Saturne et à l'angle de son pôle (quantités 14 et 17).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MOONS, parseVectors, planetMoons, saturnRings, twoBody, vectorsQuery } from './moons/moons'

const read = (name) => readFileSync(new URL(`./test-data/${name}`, import.meta.url), 'utf8')
const TITAN = parseVectors(read('horizons_titan_vectors.txt'))
const RHEA = parseVectors(read('horizons_rhea_vectors.txt'))
const TABLE = {
  jd0: TITAN[0][0],
  moons: [
    { name: 'Titan', planet: 'Saturn', mag: 8.4, states: TITAN.map((r) => r.slice(1)) },
    { name: 'Rhéa', planet: 'Saturn', mag: 9.7, states: RHEA.map((r) => r.slice(1)) },
  ],
}

// Horizons, vu du centre de la Terre : heure UT, décalages à l'est et au nord de Saturne (″) de Titan et de Rhéa
const HORIZONS = [
  ['2026-11-18T06:00:00Z', [82.437, -23.108], [-82.982, 5.833]],
  ['2026-11-18T12:00:00Z', [99.571, -23.015], [-79.371, 2.557]],
  ['2026-11-18T18:00:00Z', [115.672, -22.688], [-66.243, -1.019]],
]

describe('Les lunes', () => {
  it('lit les états d’Horizons', () => {
    expect(TITAN).toHaveLength(4)
    expect(TITAN[0][0]).toBe(2461361.5)
    expect(TITAN[0].slice(1, 4)).toEqual([1176836.409388185, 120073.5647662247, -112329.6561746683])
    expect(() => parseVectors('No ephemeris for target "foo"')).toThrow()
  })

  it('demande des états par rapport au centre de la planète', () => {
    const titan = MOONS.find((m) => m.name === 'Titan')
    const query = vectorsQuery(titan, '2026-11-17', '2026-11-20')
    expect([query.COMMAND, query.CENTER, query.EPHEM_TYPE, query.REF_PLANE]).toEqual(["'606'", "'500@699'", "'VECTORS'", "'FRAME'"])
  })

  it('prolonge un état sur son orbite d’un jour à l’autre', () => {
    // l'état du 17 prolongé d'un jour retrouve celui du 18 à quelques dizaines de kilomètres (le jour d'une orbite de 16 jours)
    const [state17, state18] = [TITAN[0].slice(1), TITAN[1].slice(1)]
    const moved = twoBody(state17.slice(0, 3), state17.slice(3), 37931206.2, 86_400)
    expect(Math.hypot(...moved.map((c, i) => c - state18[i]))).toBeLessThan(200)
  })

  it('place Titan et Rhéa comme Horizons', () => {
    for (const [iso, titan, rhea] of HORIZONS) {
      const moons = Object.fromEntries(planetMoons(new Date(iso), 'Saturn', TABLE).map((m) => [m.name, m]))
      expect(Math.abs(moons.Titan.east - titan[0]), iso).toBeLessThan(0.3)
      expect(Math.abs(moons.Titan.north - titan[1]), iso).toBeLessThan(0.3)
      expect(Math.abs(moons['Rhéa'].east - rhea[0]), iso).toBeLessThan(0.3)
      expect(Math.abs(moons['Rhéa'].north - rhea[1]), iso).toBeLessThan(0.3)
      expect(moons.Titan.state).toBe('free')
    }
  })

  it('ne devine rien hors de la table', () => {
    expect(planetMoons(new Date('2027-06-01T00:00:00Z'), 'Saturn', TABLE)).toEqual([])
    expect(planetMoons(new Date('2026-11-18T00:00:00Z'), 'Uranus', TABLE)).toEqual([])
  })
})

describe('Les anneaux de Saturne', () => {
  it('s’inclinent comme Horizons le voit', () => {
    const rings = saturnRings(new Date('2026-11-18T12:00:00Z'))
    // Horizons : la Terre à −7,626567° de latitude planétodésique sous l'équateur de Saturne, aplati (rayons 60 268 et
    // 54 364 km) ; l'inclinaison des anneaux est la latitude planétocentrique, tan φ′ = (b/a)² tan φ
    const centric = (Math.atan((54364 / 60268) ** 2 * Math.tan((-7.626567 * Math.PI) / 180)) * 180) / Math.PI
    expect(Math.abs(rings.tilt - centric)).toBeLessThan(0.001)
    // son pôle nord à 3,4791° vers l'est du nord céleste
    expect(Math.abs(rings.poleAngle - 3.4791)).toBeLessThan(0.05)
    expect(rings.lit).toBe(true) // le Soleil éclaire aussi la face sud depuis 2025
    // le disque fait 19,04″ (Horizons) : les anneaux 136 775 / 60 268 fois plus
    expect(Math.abs(rings.majorArcsec - (19.04177 * 136775) / 60268)).toBeLessThan(0.1)
    expect(rings.minorArcsec).toBeCloseTo(rings.majorArcsec * Math.sin((-centric * Math.PI) / 180), 2)
  })
})
