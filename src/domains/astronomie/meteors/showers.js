/**
 * LES PLUIES D'ÉTOILES FILANTES
 * -----------------------------
 * Les treize grandes pluies de la liste de travail de l'International Meteor Organization (calendrier de l'IMO,
 * table 5), comme Céleste (engine.py, METEOR_SHOWERS) : la date du maximum change d'une année à l'autre, pas la
 * longitude du Soleil à laquelle il arrive ; on cherche donc l'instant où le Soleil l'atteint.
 */
import * as Astronomy from 'astronomy-engine'

const DEG = Math.PI / 180

// code de l'UAI : [nom, numéro de l'UAI, début (mois, jour), fin, λ☉ du maximum (J2000, °), radiant α, δ (°),
// vitesse V∞ (km/s), indice de population r, ZHR, corps parent, constellation qui donne son nom à la pluie (le radiant
// est souvent au bord : celui des Perséides est dans Cassiopée d'après les frontières de l'UAI, celui des Lyrides dans Hercule)]
const TABLE = {
  QUA: ['Quadrantides', 10, [12, 28], [1, 12], 283.15, 230, 49, 41, 2.1, 80, '(196256) 2003 EH1', 'Bouvier'],
  LYR: ['Lyrides', 6, [4, 14], [4, 30], 32.32, 271, 34, 49, 2.1, 18, 'C/1861 G1 (Thatcher)', 'Lyre'],
  ETA: ['η-Aquarides', 31, [4, 19], [5, 28], 45.5, 338, -1, 66, 2.4, 50, '1P/Halley', 'Verseau'],
  SDA: ['δ-Aquarides du Sud', 5, [7, 12], [8, 23], 128, 340, -16, 41, 2.5, 25, '96P/Machholz', 'Verseau'],
  CAP: ['α-Capricornides', 1, [7, 3], [8, 15], 128, 307, -10, 23, 2.5, 5, '169P/NEAT', 'Capricorne'],
  PER: ['Perséides', 7, [7, 17], [8, 24], 140, 48, 58, 59, 2.2, 100, '109P/Swift-Tuttle', 'Persée'],
  DRA: ['Draconides', 9, [10, 6], [10, 10], 195.4, 262, 54, 20, 2.6, 5, '21P/Giacobini-Zinner', 'Dragon'],
  ORI: ['Orionides', 8, [10, 2], [11, 7], 208, 95, 16, 66, 2.5, 20, '1P/Halley', 'Orion'],
  STA: ['Taurides du Sud', 2, [9, 20], [11, 20], 223, 52, 15, 27, 2.3, 7, '2P/Encke', 'Taureau'],
  NTA: ['Taurides du Nord', 17, [10, 20], [12, 10], 230, 58, 22, 29, 2.3, 5, '2P/Encke', 'Taureau'],
  LEO: ['Léonides', 13, [11, 6], [11, 30], 235.27, 152, 22, 71, 2.5, 15, '55P/Tempel-Tuttle', 'Lion'],
  GEM: ['Géminides', 4, [12, 4], [12, 20], 262.2, 112, 33, 35, 2.6, 150, '(3200) Phaéton', 'Gémeaux'],
  URS: ['Ursides', 15, [12, 17], [12, 26], 270.7, 217, 76, 33, 2.8, 10, '8P/Tuttle', 'Petite Ourse'],
}

export const SHOWERS = Object.entries(TABLE).map(([code, [name, number, start, end, lambda, ra, dec, speed, r, zhr, parent, constellation]]) => ({
  code,
  name,
  number,
  start,
  end,
  lambda,
  ra,
  dec,
  speed,
  r,
  zhr,
  parent,
  constellation,
}))

const toEcliptic = Astronomy.Rotation_EQJ_ECL()

/** Longitude géométrique du Soleil sur l'écliptique J2000 (°), sans aberration, comme les calendriers de météores. */
export function solarLongitude(date) {
  const v = Astronomy.RotateVector(toEcliptic, Astronomy.GeoVector(Astronomy.Body.Sun, date, false))
  return (Math.atan2(v.y, v.x) / DEG + 360) % 360
}

/** L'instant où le Soleil atteint la longitude `lambda` (J2000) au cours de l'année qui suit l'équinoxe de mars de `year`. */
export function whenSolarLongitude(lambda, year) {
  let t = new Date(Date.UTC(year, 2, 20) + (lambda / 0.985647) * 86_400_000)
  for (let k = 0; k < 8; k++) {
    const diff = ((lambda - solarLongitude(t) + 540) % 360) - 180
    t = new Date(t.getTime() + (diff / 0.985647) * 86_400_000)
    if (Math.abs(diff) < 1e-6) break
  }
  return t
}

/** Le prochain maximum d'une pluie à partir de `date` (ceux des deux derniers jours comptent encore). */
export function nextMaximum(shower, date) {
  const from = date.getTime() - 2 * 86_400_000
  const year = date.getUTCFullYear()
  return [year - 1, year, year + 1].map((y) => whenSolarLongitude(shower.lambda, y)).find((t) => t.getTime() >= from)
}

/** Les dates d'activité autour d'un maximum (la fin peut tomber l'année suivante, le début l'année précédente). */
export function activity(shower, maximum) {
  const y = maximum.getFullYear()
  const at = ([m, d], year) => new Date(year, m - 1, d)
  let start = at(shower.start, y)
  let end = at(shower.end, y)
  if (start > maximum) start = at(shower.start, y - 1)
  if (end < maximum) end = at(shower.end, y + 1)
  return { start, end }
}
