/**
 * LA CHARTE DANS LES GRAPHIQUES
 * -----------------------------
 * Les couleurs de la charte Astræos (celles de Céleste, config.py) pour ce que les classes Tailwind ne colorent
 * pas : les courbes, les points et les légendes des graphiques, passés en style (style={{ stroke: OR }}).
 * Ce sont des variables CSS (src/index.css) : elles suivent le thème, Jour, Nuit ou Observation.
 */
const token = (name) => `rgb(var(--${name}))`

export const OR = token('or')
export const LUNE = token('lune')
export const ENCRE = token('encre')
export const ENCRE_ATTENUEE = token('encre-attenuee')
export const OK = token('signal-ok')
export const ALERTE = token('signal-alerte')

/** Les couleurs des séries d'un graphique, dans l'ordre de ceux de Céleste (charts.py), puis répétées. */
export const SERIES = [OR, LUNE, OK, ENCRE, token('or-lune'), ALERTE, token('lune-ok'), ENCRE_ATTENUEE]

export const seriesColor = (i) => SERIES[i % SERIES.length]

/**
 * Une pastille (.chip), un bouton ou un champ dans la couleur d'un jeton. Les variantes dark: sont nécessaires :
 * le style sombre de ces composants (.chip:is(.dark *)) l'emporterait sur une simple classe de couleur.
 */
export const TONE = {
  ok: 'border-ok/40 text-ok dark:border-ok/40 dark:text-ok',
  lune: 'border-lune/40 text-lune dark:border-lune/40 dark:text-lune',
  or: 'border-or/40 text-or dark:border-or/40 dark:text-or',
  alerte: 'border-alerte/40 text-alerte dark:border-alerte/40 dark:text-alerte',
}

/** Le cadre d'un champ dont la valeur n'est pas reconnue. */
export const INVALID = 'border-alerte dark:border-alerte'
