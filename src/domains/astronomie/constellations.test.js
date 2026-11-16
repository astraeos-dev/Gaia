import { describe, expect, it } from 'vitest'
import { Astronomy } from './lib/astro'
import { CONSTELLATIONS, area, bestMonth, center, constellationFacts, getConstellation, neighbours, visibility } from './constellations/geometry'
import { BRIGHT_STARS, DEEP_SKY_OBJECTS, chartScene, deepSkyOf, starsOf } from './constellations/scene'
import { pointDay } from './constellations/night'

// Superficies officielles de l'UAI, en degrés carrés
const IAU_AREAS = {
  Hya: 1302.844,
  Vir: 1294.428,
  UMa: 1279.66,
  Ori: 594.12,
  Cru: 68.447,
  UMi: 255.864,
  Oct: 291.045,
  Ser: 636.928,
  Cep: 587.787,
}
const SPHERE = 4 * Math.PI * (180 / Math.PI) ** 2

describe('constellations : limites, superficies, voisines', () => {
  it('88 constellations, une adresse chacune', () => {
    expect(CONSTELLATIONS).toHaveLength(88)
    expect(new Set(CONSTELLATIONS.map((c) => c.slug)).size).toBe(88)
    expect(getConstellation('orion').id).toBe('Ori')
    expect(getConstellation('ecu-de-sobieski').id).toBe('Sct')
    expect(getConstellation('UMa').name).toBe('Grande Ourse')
  })

  it('les superficies des limites à un degré carré près des valeurs officielles ; ensemble, tout le ciel', () => {
    for (const [key, official] of Object.entries(IAU_AREAS)) expect(Math.abs(area(key) - official)).toBeLessThan(1)
    const total = CONSTELLATIONS.reduce((sum, c) => sum + area(c.id), 0)
    expect(Math.abs(total - SPHERE)).toBeLessThan(1)
    const facts = constellationFacts()
    expect(facts.Hya.rank).toBe(1)
    expect(facts.Ori.rank).toBe(26)
    expect(facts.Cru.rank).toBe(88)
  })

  it('les voisines : celles qui ont un côté commun', () => {
    expect(neighbours('Ori').sort()).toEqual(['Eri', 'Gem', 'Lep', 'Mon', 'Tau'])
    expect(neighbours('UMa').sort()).toEqual(['Boo', 'CVn', 'Cam', 'Com', 'Dra', 'LMi', 'Leo', 'Lyn'])
    expect(neighbours('Cru').sort()).toEqual(['Cen', 'Mus'])
    // l'Hydre ne touche le Loup que par un coin
    expect(neighbours('Hya')).toHaveLength(13)
    expect(neighbours('Hya')).not.toContain('Lup')
  })

  it('le mois où elle est au plus haut à 22 h', () => {
    expect(bestMonth(center('Ori').ra)).toBe(1)
    expect(bestMonth(center('UMa').ra)).toBe(4)
    expect(bestMonth(center('Cyg').ra)).toBe(8)
    expect(bestMonth(center('And').ra)).toBe(11)
  })

  it('ce qui se lève à une latitude', () => {
    expect(visibility('Ori', 48.85)).toBe('all')
    expect(visibility('Oct', 48.85)).toBe('none')
    expect(visibility('Cen', 48.85)).toBe('part')
    expect(visibility('UMi', -33.87)).toBe('none')
    expect(visibility('Cru', -33.87)).toBe('all')
  })

  it('le centre se lève et se couche, ou reste levé', () => {
    const paris = new Astronomy.Observer(48.85, 2.35, 35)
    const start = new Date(Date.UTC(2026, 10, 16, 11))
    const ori = pointDay(center('Ori').ra * 15, center('Ori').dec, paris, start)
    expect(ori.rise).toBeTruthy()
    expect(ori.set).toBeTruthy()
    expect(ori.transit.alt).toBeCloseTo(90 - 48.85 + center('Ori').dec, 0)
    expect(pointDay(center('UMi').ra * 15, center('UMi').dec, paris, start).always).toBe(true)
    expect(pointDay(center('Oct').ra * 15, center('Oct').dec, paris, start).never).toBe(true)
  })
})

describe('constellations : la carte', () => {
  it('Orion : ses étoiles et ses objets, ses voisines nommées, un cadre carré', () => {
    const scene = chartScene('Ori')
    const { view } = scene
    expect(view.x1 - view.x0).toBeCloseTo(view.y1 - view.y0, 9)
    const betelgeuse = scene.stars.find((s) => s.name === 'Bételgeuse')
    expect(betelgeuse).toMatchObject({
      own: true,
      letter: 'α',
      title: 'Bételgeuse',
    })
    expect(scene.stars.every((s) => s.x >= view.x0 && s.x <= view.x1 && s.y >= view.y0 && s.y <= view.y1)).toBe(true)
    expect(scene.deepSky.find((o) => o.label === 'M42')).toMatchObject({
      own: true,
      named: true,
    })
    expect(scene.names.map((n) => n.key)).toEqual(expect.arrayContaining(['Tau', 'Gem', 'Mon', 'Eri', 'Lep']))
    // l'est à gauche : Bételgeuse (à l'est) à gauche de Rigel
    const rigel = scene.stars.find((s) => s.name === 'Rigel')
    expect(betelgeuse.x).toBeLessThan(rigel.x)
  })

  it('une constellation autour d’un pôle a aussi sa carte', () => {
    const scene = chartScene('Oct')
    expect(scene.stars.length).toBeGreaterThan(20)
    expect(scene.gridLabels.some((g) => g.kind === 'dec')).toBe(true)
  })

  it('les données : 8 404 étoiles, 475 objets dont les 110 de Messier', () => {
    expect(BRIGHT_STARS).toHaveLength(8404)
    expect(BRIGHT_STARS.every((s) => s.mag <= 6.5 && /^[A-Z][A-Za-z]{2}$/.test(s.constellation))).toBe(true)
    expect(DEEP_SKY_OBJECTS.filter((o) => o.m)).toHaveLength(110)
    expect(starsOf('Ori')[0]).toMatchObject({ label: 'β', name: 'Rigel' })
    expect(deepSkyOf('And')[0]).toMatchObject({
      label: 'M31',
      name: "Galaxie d'Andromède",
    })
  })
})
