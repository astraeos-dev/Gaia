/**
 * Les étoiles cachées par des astéroïdes (occultations/occultations.js), comme tests/test_occultations.py de Céleste
 * (4.20). L'échantillon garde sept vrais évènements des prédictions de l'IOTA pour 2026 (asteroidoccultation.com,
 * 2026-iota.zip), recopiés tels quels. La lecture des éléments de Bessel (X à l'est, Y au nord, UT) est vérifiée
 * avec JPL Horizons ; la bande au sol avec l'axe de l'ombre et ses bords portés jusqu'à l'ellipsoïde WGS84, en
 * trois dimensions.
 */
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { firstXmlOfZip } from '../../../scripts/lib/zip.mjs'
import { EARTH_KM, hourAngleAt, magDrop, near, observerOnPlane, parseOccelmnt, passAt, placeOnEarth, shadow } from './occultations/occultations'

const SAMPLE = readFileSync(new URL('./test-data/occelmnt_sample.xml', import.meta.url), 'utf8')
const EVENTS = parseOccelmnt(SAMPLE)
const PARIS = [48.85, 2.35]
const LYON = [45.76, 4.84]
const MUNICH = [48.14, 11.58]
const DEG = Math.PI / 180
const SIDEREAL = 15.04106864 * DEG
const event = (name) => EVENTS.find((e) => e.name === name)
const utc = (...parts) => new Date(Date.UTC(parts[0], parts[1] - 1, ...parts.slice(2)))

/** Une archive ZIP d'un seul fichier, comme celles de l'IOTA. */
function zip(name, text) {
  const data = deflateRawSync(Buffer.from(text, 'utf8'))
  const nameBytes = Buffer.from(name, 'utf8')
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(data.length, 18)
  local.writeUInt32LE(Buffer.byteLength(text), 22)
  local.writeUInt16LE(nameBytes.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(data.length, 20)
  central.writeUInt32LE(Buffer.byteLength(text), 24)
  central.writeUInt16LE(nameBytes.length, 28)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + nameBytes.length, 12)
  end.writeUInt32LE(local.length + nameBytes.length + data.length, 16)
  return Buffer.concat([local, nameBytes, data, central, nameBytes, end])
}

describe('Les prédictions', () => {
  it('lit les évènements', () => {
    expect(EVENTS).toHaveLength(7)
    const titania = event('Titania')
    expect(titania.number).toBe('593')
    expect(Math.abs(titania.middle - utc(2026, 1, 1, 0, 28, 56))).toBeLessThan(1000)
    expect(titania.elements.slice(0, 4)).toEqual([-0.0617697, -0.3221017, 13.7466999, -2.6525074])
    expect([titania.diameterKm, titania.starMag, titania.mag]).toEqual([79, 9.73, 14.49])
    expect(titania.star).toBe('UCAC4 474-050539')
    expect([titania.ra, titania.dec]).toEqual([14.01445828, 4.5677527])
    expect(titania.substar).toEqual([102.3014, 4.5678])
    expect(titania.subsolar).toEqual([173.61, -23.02])
    expect(titania.maxDuration).toBe(3.18)
    expect(titania.orbit.startsWith('JPL#68')).toBe(true)
  })

  it('laisse de côté les évènements illisibles', () => {
    const damaged = SAMPLE.replace('<Object>593,Titania,14.49,79.000', '<Object>593,Titania,14.49,x')
    expect(parseOccelmnt(damaged)).toHaveLength(6)
    expect(parseOccelmnt('<html>not found</html>')).toEqual([])
  })

  it('lit l’archive de l’année', () => {
    expect(parseOccelmnt(firstXmlOfZip(zip('2026-iota-all.xml', SAMPLE)))).toHaveLength(7)
    expect(() => firstXmlOfZip(Buffer.from('<html>404</html>'))).toThrow()
  })

  it('calcule la chute d’éclat', () => {
    // Titania (14,49) devant une étoile de 9,73 : la lumière tombe presque à celle de l'astéroïde seul
    expect(Math.abs(magDrop(9.73, 14.49) - 4.76)).toBeLessThan(0.02)
    expect(magDrop(10, 10)).toBeCloseTo(2.5 * Math.log10(2), 9)
    expect(magDrop(null, 12)).toBeNull()
  })
})

describe('Les éléments, comparés à JPL Horizons', () => {
  it('se lisent comme Horizons voit l’astéroïde', () => {
    // 593 Titania, RA, Dec et distance géocentriques apparentes sans réfraction de JPL Horizons (orbite JPL#74) à
    // 0 h 28 et 0 h 29 UT le 1er janvier 2026, portées sur le plan fondamental de la position apparente de l'étoile :
    // à 0,02 rayon terrestre des éléments en leur milieu (le fichier de l'IOTA prenait l'orbite JPL#68), et
    // bougeant comme eux. Lus en TT au lieu de UT, X serait à 0,26 rayon terrestre.
    const titania = event('Titania')
    const rows = [
      [210.216593824, 4.567482208, 2.50028529219166],
      [210.216818481, 4.567438972, 2.50027853642608],
    ]
    const [alphaS, deltaS] = [titania.ra * 15 * DEG, titania.dec * DEG]
    const plane = ([ra, dec, dist]) => {
      const [a, d] = [ra * DEG, dec * DEG]
      const r = (dist * 149_597_870.7) / EARTH_KM
      return [
        r * Math.cos(d) * Math.sin(a - alphaS),
        r * (Math.sin(d) * Math.cos(deltaS) - Math.cos(d) * Math.sin(deltaS) * Math.cos(a - alphaS)),
      ]
    }
    const [[x0, y0], [x1, y1]] = rows.map(plane)
    const frac = (titania.middle - utc(2026, 1, 1, 0, 28)) / 60_000
    const [x, y] = [x0 + frac * (x1 - x0), y0 + frac * (y1 - y0)]
    const [ex, ey, dx, dy] = titania.elements
    expect(Math.abs(x - ex)).toBeLessThan(0.02)
    expect(Math.abs(y - ey)).toBeLessThan(0.02)
    expect(Math.abs((x1 - x0) * 60 - dx) / Math.abs(dx)).toBeLessThan(0.01)
    expect(Math.abs((y1 - y0) * 60 - dy) / Math.abs(dy)).toBeLessThan(0.01)
    expect(Math.abs((dx * 69.2) / 3600)).toBeGreaterThan(10 * 0.02) // en TT, ce serait loin
  })
})

// ── La bande au sol, en trois dimensions ────────────────────────────────────

const A = 6378.137
const B = A * (1 - 1 / 298.257223563)
const E2 = 1 - (B / A) ** 2
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2]

/** La direction de l'étoile et les axes est et nord du plan, fixes par rapport à la Terre, à `tau`. */
function frame(e, tau) {
  const lam = e.substar[0] * DEG - SIDEREAL * tau
  const d = e.dec * DEG
  return {
    star: [Math.cos(d) * Math.cos(lam), Math.cos(d) * Math.sin(lam), Math.sin(d)],
    east: [-Math.sin(lam), Math.cos(lam), 0],
    north: [-Math.sin(d) * Math.cos(lam), -Math.sin(d) * Math.sin(lam), Math.cos(d)],
  }
}

/** Où la droite parallèle à l'étoile qui passe par (x, y) sur le plan rencontre le sol (WGS84) : [lat, lon], NaN si elle le manque. */
function groundPoint(e, tau, x, y) {
  const { star, east, north } = frame(e, tau)
  const origin = [0, 1, 2].map((i) => (x * east[i] + y * north[i] + 3 * star[i]) * A)
  const direction = star.map((c) => -c)
  const k = [1, 1, A / B]
  const o = origin.map((c, i) => c * k[i])
  const d = direction.map((c, i) => c * k[i])
  const [a, b, c] = [dot(d, d), dot(o, d), dot(o, o) - A * A]
  const disc = b * b - a * c
  const s = (-b - Math.sqrt(disc)) / a
  if (!(disc >= 0 && s > 0)) return [Number.NaN, Number.NaN]
  const [px, py, pz] = origin.map((v, i) => v + s * direction[i])
  return [Math.atan2(pz, (1 - E2) * Math.hypot(px, py)) / DEG, Math.atan2(py, px) / DEG]
}

/** Le vecteur unitaire en travers de la bande, sur le plan, au lieu (lat, lon), à `tau`. */
function across(e, tau, lat, lon) {
  const [pc, ps] = placeOnEarth(lat, lon)
  const [, , x1, y1] = shadow(e.elements, tau)
  const [, , xi1, eta1] = observerOnPlane(pc, ps, e.dec * DEG, hourAngleAt(lon, e.substar[0], tau))
  const [vx, vy] = [x1 - xi1, y1 - eta1]
  return [-vy / Math.hypot(vx, vy), vx / Math.hypot(vx, vy)]
}

describe('La bande au sol', () => {
  it.each([-0.01, 0, 0.01])('passe sur la ligne centrale (%s h)', (tau) => {
    for (const e of EVENTS) {
      const [x, y] = shadow(e.elements, tau)
      const [lat, lon] = groundPoint(e, tau, x, y)
      if (Number.isNaN(lat)) continue
      const seen = passAt(e, lat, lon)
      expect(seen.distanceKm, e.name).toBeLessThan(0.05)
      expect(Math.abs(seen.date - (e.middle.getTime() + tau * 3_600_000)), e.name).toBeLessThan(1000)
      expect([seen.inside, seen.edgeKm, seen.direction], e.name).toEqual([true, 0, null])
    }
  })

  it('a les bons bords et les bonnes distances', () => {
    // des lieux portés au sol depuis le plan à 0,9, 1,1 et 3 rayons en travers de la bande
    for (const e of EVENTS) {
      const [x, y] = shadow(e.elements, 0)
      const [lat, lon] = groundPoint(e, 0, x, y)
      if (Number.isNaN(lat)) continue
      const [px, py] = across(e, 0, lat, lon)
      const radius = e.diameterKm / 2 / EARTH_KM
      for (const k of [0.9, 1.1, 3, -3]) {
        const here = groundPoint(e, 0, x + k * radius * px, y + k * radius * py)
        if (Number.isNaN(here[0])) continue
        const seen = passAt(e, ...here)
        expect(Math.abs(seen.distanceKm / (Math.abs(k) * seen.halfWidthKm) - 1), e.name).toBeLessThan(0.02)
        expect(seen.inside, e.name).toBe(Math.abs(k) < 1)
        if (Math.abs(k) === 3) expect(seen.halfWidthKm, e.name).toBeGreaterThanOrEqual((e.diameterKm / 2) * 0.99) // plus large au sol
      }
    }
  })

  it('montre la direction de la ligne centrale', () => {
    for (const e of EVENTS) {
      const [x, y] = shadow(e.elements, 0)
      const [lat, lon] = groundPoint(e, 0, x, y)
      if (Number.isNaN(lat)) continue
      const [px, py] = across(e, 0, lat, lon)
      const radius = e.diameterKm / 2 / EARTH_KM
      const here = groundPoint(e, 0, x + 3 * radius * px, y + 3 * radius * py)
      if (Number.isNaN(here[0])) continue
      const seen = passAt(e, ...here)
      // la distance parcourue dans la direction donnée : la ligne centrale, à quelques pour cent près
      const [az, dist] = [seen.direction * DEG, seen.distanceKm / 6371]
      const [phi1, lam1] = [here[0] * DEG, here[1] * DEG]
      const phi2 = Math.asin(Math.sin(phi1) * Math.cos(dist) + Math.cos(phi1) * Math.sin(dist) * Math.cos(az))
      const lam2 = lam1 + Math.atan2(Math.sin(az) * Math.sin(dist) * Math.cos(phi1), Math.cos(dist) - Math.sin(phi1) * Math.sin(phi2))
      expect(passAt(e, phi2 / DEG, lam2 / DEG).distanceKm, e.name).toBeLessThan(0.05 * seen.distanceKm)
    }
  })

  it('cache l’étoile le temps que donne Occult sur la ligne centrale', () => {
    // au centre de la Terre pour Occult : à la rotation de la Terre près
    for (const e of EVENTS) {
      const [x, y] = shadow(e.elements, 0)
      const [lat, lon] = groundPoint(e, 0, x, y)
      if (Number.isNaN(lat)) continue
      const speed = Math.hypot(e.elements[2], e.elements[3])
      const tolerance = 0.27 / (speed - 0.27) + 0.01 // le sol tourne d'au plus 0,26 rayon terrestre par heure
      expect(Math.abs(passAt(e, lat, lon).duration / e.maxDuration - 1), e.name).toBeLessThan(tolerance)
    }
  })
})

describe('Depuis le lieu', () => {
  it('trouve les bandes qui passent sur le lieu', () => {
    const found = near(EVENTS, ...PARIS)
    const li = found.find((s) => s.event.name === 'Li')
    expect(li.inside).toBe(true)
    expect(li.duration).toBeGreaterThan(0)
    expect(li.date.toISOString().slice(0, 10)).toBe('2026-06-06')
    expect(Math.abs(li.alt - 20.5)).toBeLessThan(1)
    expect(li.sun).toBeLessThan(-12)
    const herrick = near(EVENTS, ...MUNICH).find((s) => s.event.name === 'Herrick')
    expect(herrick.inside).toBe(true)
    expect(herrick.duration).toBeGreaterThan(4)
    expect(herrick.duration).toBeLessThan(8)
    expect(near(EVENTS, ...LYON).find((s) => s.event.name === 'Imatra').inside).toBe(true)
    expect(found.every((s, i) => i === 0 || found[i - 1].date <= s.date)).toBe(true)
  })

  it('filtre par hauteur, ciel, période et distance', () => {
    const names = (options) => near(EVENTS, ...PARIS, 0, options).map((s) => s.event.name)
    expect(names()).toContain('Li')
    expect(names({ minAlt: 25 })).not.toContain('Li') // l'étoile à 20° seulement
    expect(names({ darkSun: -20 })).not.toContain('Li') // le Soleil à −18°
    expect(names({ start: utc(2026, 6, 7) })).not.toContain('Li')
    expect(names({ end: utc(2026, 6, 6) })).not.toContain('Li')
    expect(names({ start: utc(2026, 6, 6), end: utc(2026, 6, 7) })).toContain('Li')
    const edge = passAt(event('Phaethon'), ...MUNICH).edgeKm
    expect(edge).toBeGreaterThan(0)
    const phaethon = (maxKm) => near(EVENTS, ...MUNICH, 0, { maxKm, darkSun: -10 }).map((s) => s.event.name)
    expect(phaethon(edge + 1)).toContain('Phaethon')
    expect(phaethon(edge - 1)).not.toContain('Phaethon')
  })

  it('laisse de côté le jour et l’étoile sous l’horizon', () => {
    // la bande de Titania traverse l'Asie au matin : de Paris, l'étoile est sous l'horizon
    const seen = passAt(event('Titania'), ...PARIS)
    expect(seen.alt < 0 || seen.sun > -12).toBe(true)
    expect(near(EVENTS, ...PARIS, 0, { maxKm: 20_000 }).every((s) => s.event.name !== 'Titania')).toBe(true)
  })
})
