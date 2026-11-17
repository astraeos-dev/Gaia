/** Les chiffres des passages en mots, pour la page des géocroiseurs, Ce soir et le calendrier. */
import { fmt } from '../../../lib/format'
import { lunarDistances, sizeM } from './neo'

/** « 3,1 DL » : une décimale à partir d'une distance lunaire, deux en deçà. */
export function ldText(au) {
  const value = lunarDistances(au)
  return `${fmt(value, value >= 1 ? 1 : 2)} DL`
}

export const kmText = (value) => `${fmt(value, 0)} km`

/** « 8 à 18 m », « 665 m », « — ». */
export function sizeText(approach) {
  const size = sizeM(approach)
  if (!size) return '—'
  const [small, large] = size
  return Math.abs(large - small) < 0.5 ? `${fmt(small, 0)} m` : `${fmt(small, 0)} à ${fmt(large, 0)} m`
}

/** Une durée en minutes : « 14 min », « 2 h 59 min », « 5 j 3 h ». */
export function minutesText(minutes) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ${String(Math.round(minutes % 60)).padStart(2, '0')} min`
  return `${Math.floor(minutes / 1440)} j ${Math.round((minutes % 1440) / 60)} h`
}
