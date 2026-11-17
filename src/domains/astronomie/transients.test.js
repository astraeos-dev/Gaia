/**
 * Les novae et les supernovae du moment (transients/transients.js), comme tests/test_transients.py de Céleste
 * (4.21). Les échantillons sont de vraies lignes des deux listes, copiées le 13 novembre 2026 : les supernovae
 * actives de David Bishop (rochesterastronomy.org) et les novae récentes de notre galaxie de Koji Mukai (NASA
 * Goddard) ; et trois fiches de la page principale de David Bishop, du 17 novembre 2026.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { makeObserver } from './lib/astro'
import { nightSamples } from './comets/sky'
import { bestTonight } from './transients/sky'
import { chosen, distanceMly, merge, parseNovae, parseSupernovae, parseSupernovaPage, separationArcsec, sexagesimal, unescapeHtml } from './transients/transients'

const read = (name) => readFileSync(new URL(`./test-data/${name}`, import.meta.url), 'utf8')
const TODAY = '2026-11-13'
const SUPERNOVAE = parseSupernovae(read('snactive_sample.html'))
const NOVAE = parseNovae(read('novae_sample.html'), '2024-11-13')
const named = (objects, name) => objects.find((o) => o.name === name)

describe('Les listes', () => {
  it('lit les supernovae actives', () => {
    // la variable cataclysmique, le transitoire non classé et la supernova de magnitude 18 sont laissés de côté
    expect(SUPERNOVAE.map((o) => o.name)).toEqual(['LMC V1341', 'SN 2026ahvu', 'AT 2026aina', 'AT 2026abbx', 'SN 2026sqf', 'SN 2026ahvi'])
    const sn = named(SUPERNOVAE, 'SN 2026ahvu')
    expect([sn.kind, sn.type, sn.host]).toEqual(['supernova', 'Ia', 'NGC 1433'])
    expect(sn.ra).toBeCloseTo(3 + 41 / 60 + 55.511 / 3600, 10)
    expect(sn.dec).toBeCloseTo(-(47 + 13 / 60 + 39.39 / 3600), 10)
    expect([sn.mag, sn.magDate, sn.stale]).toEqual([12.3, '2026-11-10', false])
    expect([sn.discovered, sn.discoverer]).toEqual(['2026-11-02', 'ATLAS'])
    expect(sn.z).toBeCloseTo(0.003589, 8)
    expect(sn.aka).toEqual(['ATLAS26ncp', 'GOTO26ltt'])
    const sqf = named(SUPERNOVAE, 'SN 2026sqf')
    expect([sqf.type, sqf.peak, sqf.peakDate]).toEqual(['Ia-CSM', 11.2, '2026-07-28'])
    const nova = named(SUPERNOVAE, 'AT 2026aina')
    expect([nova.kind, nova.type, nova.host, nova.z]).toEqual(['nova', 'EGN', 'LMC', null])
    expect(named(SUPERNOVAE, 'AT 2026abbx').host).toBeNull() // une nova de notre galaxie
  })

  it('laisse de côté les lignes illisibles', () => {
    const text = read('snactive_sample.html').replace('03:41:55.511', '3h41')
    expect(parseSupernovae(text).map((o) => o.name)).not.toContain('SN 2026ahvu')
    expect(parseSupernovae('<html>not found</html>')).toEqual([])
    expect(parseSupernovae(read('snactive_sample.html'), 13)).toHaveLength(4)
    expect(() => sexagesimal('3h41', true)).toThrow()
    expect(unescapeHtml('&amp;&deg;&#233;&#xE9;&nbsp;')).toBe('&°éé ')
  })

  it('lit les novae de notre galaxie', () => {
    expect(NOVAE.map((o) => o.name)).toEqual(['V8056 Sgr', 'TCP J17520680-2343207', 'V488 Sge', 'V1452 Tau'])
    const v488 = named(NOVAE, 'V488 Sge')
    expect([v488.peak, v488.discovered, v488.mag]).toEqual([7.1, '2026-08-25', null])
    expect(v488.ra).toBeCloseTo(19 + 45 / 60 + 6.49 / 3600, 10)
    expect(v488.dec).toBeCloseTo(18 + 22 / 60 + 42.1 / 3600, 10)
    expect(v488.aka).toEqual(['Nova Sagittae 2026 PNV J19450648+1822422'])
    expect(named(NOVAE, 'V8056 Sgr').peak).toBe(9.3) // « 9.3 (V) 7.8 (unfiltered?) »
    const tcp = named(NOVAE, 'TCP J17520680-2343207') // pas encore de nom d'étoile variable
    expect(tcp.aka).toEqual(['ASASSN-26fc', 'AT 2026abbx', 'Nova in Saggitarius'])
    expect(named(parseNovae(read('novae_sample.html')), 'AT 2023tow').peak).toBeCloseTo(12.26, 10) // « G=12.26 »
  })

  it('lit la page principale quand la page des objets actifs est vide', () => {
    const found = parseSupernovaPage(read('supernova_page_sample.html'), '2026-11-17')
    // le transitoire non classé est laissé de côté
    expect(found.map((o) => o.name)).toEqual(['SN 2026ahvu', 'AT 2026abbx', 'SN 2026sqf'])
    const sn = named(found, 'SN 2026ahvu')
    expect([sn.kind, sn.type, sn.host, sn.mag, sn.magDate, sn.discovered, sn.discoverer]).toEqual(['supernova', 'Ia', 'NGC 1433', 12.3, '2026-11-10', '2026-11-02', 'ATLAS'])
    expect(sn.ra).toBeCloseTo(3 + 41 / 60 + 55.511 / 3600, 10)
    expect(sn.dec).toBeCloseTo(-(47 + 13 / 60 + 39.39 / 3600), 10)
    expect(sn.z).toBeCloseTo(0.003589, 8)
    expect(sn.aka).toEqual(['ATLAS26ncp', 'GOTO26ltt'])
    const sqf = named(found, 'SN 2026sqf')
    expect([sqf.type, sqf.mag, sqf.magDate, sqf.peak, sqf.peakDate, sqf.discoverer]).toEqual(['Ia-CSM', 13.3, '2026-11-03', 11.2, '2026-07-28', 'Patrick Wiggins'])
    const nova = named(found, 'AT 2026abbx')
    expect([nova.kind, nova.host, nova.mag, nova.magDate]).toEqual(['nova', null, 12.6, '2026-09-08'])
    // la même nova que celle de Koji Mukai : montrée une fois
    expect(merge(found, NOVAE).filter((o) => o.name === 'TCP J17520680-2343207' || o.name === 'AT 2026abbx')).toHaveLength(1)
  })
})

describe('Ce qui est montré', () => {
  it('montre une fois une nova des deux listes', () => {
    const merged = merge(SUPERNOVAE, NOVAE)
    expect(merged).toHaveLength(SUPERNOVAE.length + NOVAE.length - 1)
    const tcp = named(merged, 'TCP J17520680-2343207')
    expect([tcp.mag, tcp.magDate]).toEqual([12.6, '2026-09-08']) // la dernière mesure, celle de David Bishop
    expect(tcp.peak).toBe(11.3)
    expect(tcp.aka).toContain('AT 2026abbx')
    expect(named(merged, 'AT 2026abbx')).toBeUndefined()
    expect(separationArcsec(tcp, named(SUPERNOVAE, 'AT 2026abbx'))).toBeLessThan(5)
  })

  it('choisit les objets assez brillants et récents', () => {
    const merged = merge(SUPERNOVAE, NOVAE)
    const shown = chosen(merged, TODAY, { magLimit: 15, novaDays: 365 }).map((o) => o.name)
    // la dernière magnitude de LMC V1341 date de 2024 : éteinte ou oubliée
    expect(new Set(shown)).toEqual(
      new Set(['SN 2026ahvu', 'AT 2026aina', 'SN 2026sqf', 'SN 2026ahvi', 'V8056 Sgr', 'TCP J17520680-2343207', 'V488 Sge', 'V1452 Tau']),
    )
    expect(shown.slice(0, 3)).toEqual(['V488 Sge', 'SN 2026ahvu', 'AT 2026aina']) // une nova à son maximum + 5
    expect(shown.at(-1)).toBe('TCP J17520680-2343207') // sa mesure date de deux mois
    const bright = chosen(merged, TODAY, { magLimit: 13, novaDays: 365 }).map((o) => o.name)
    expect(bright).not.toContain('SN 2026sqf')
    expect(bright).toContain('SN 2026ahvu')
    expect(bright).toContain('V488 Sge')
    const recent = chosen(merged, TODAY, { magLimit: 15, novaDays: 60 }).map((o) => o.name)
    expect(recent).toContain('V8056 Sgr')
    expect(recent).not.toContain('V488 Sge')
  })

  it('estime la distance des galaxies', () => {
    expect(distanceMly(0.003589)).toBeCloseTo(50.1, 0)
    expect(Math.abs(distanceMly(0.003589) - 50.1)).toBeLessThan(0.2)
    expect(distanceMly(null)).toBeNull()
    expect(distanceMly(0)).toBeNull()
  })

  it('trouve quand les voir cette nuit', () => {
    // De Paris, la nuit du 13 au 14 novembre 2026 : SN 2026sqf (+53°) haute avant l'aube, SN 2026ahvu (−47°) jamais levée
    // toutes les 5 minutes, comme la page : la fin de la nuit noire (le Soleil à −12° vers 5 h 41 UT) compte
    const samples = nightSamples(makeObserver({ lat: 48.85, lon: 2.35 }), new Date('2026-11-13T21:00:00Z'), 5)
    const sqf = bestTonight(named(SUPERNOVAE, 'SN 2026sqf'), samples)
    expect(bestTonight(named(SUPERNOVAE, 'SN 2026ahvu'), samples)).toBeNull()
    expect(Math.abs(sqf.alt - 78)).toBeLessThan(2)
    expect(sqf.az).toBeGreaterThan(40)
    expect(sqf.az).toBeLessThan(320)
    expect(sqf.t.getUTCHours()).toBeGreaterThanOrEqual(4)
    expect(sqf.t.getUTCHours()).toBeLessThan(8)
  })
})
