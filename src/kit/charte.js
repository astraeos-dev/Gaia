/**
 * LA CHARTE DANS LES GRAPHIQUES
 * -----------------------------
 * Les couleurs de la charte Astræos (celles de Céleste, config.py) pour ce que les classes Tailwind ne colorent
 * pas : les courbes, les points et les légendes des graphiques, passés en style (style={{ stroke: OR }}).
 * Ce sont des variables CSS (src/index.css) : elles suivent le thème, Jour, Nuit ou Observation.
 */
const token = (name) => `rgb(var(--${name}))`

export const CIEL_000 = token('ciel-000')
export const CIEL_100 = token('ciel-100')
export const CIEL_200 = token('ciel-200')
export const OR = token('or')
export const LUNE = token('lune')
export const ENCRE = token('encre')
export const ENCRE_ATTENUEE = token('encre-attenuee')
export const OK = token('signal-ok')
export const ALERTE = token('signal-alerte')
// Mélanges à parts égales de deux jetons (config.mix de Céleste)
export const OR_LUNE = token('or-lune')
export const LUNE_OK = token('lune-ok')
export const OR_ALERTE = token('or-alerte')
export const LUNE_ALERTE = token('lune-alerte')

/** Les couleurs des séries d'un graphique, dans l'ordre de ceux de Céleste (charts.py), puis répétées. */
export const SERIES = [OR, LUNE, OK, ENCRE, OR_LUNE, ALERTE, LUNE_OK, ENCRE_ATTENUEE]

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

/**
 * Les jetons pour un canevas, qui ne lit pas les variables CSS : lus sur la page au moment du dessin, car ils
 * changent avec le thème. palette.color('lune', 0.85) donne « rgba(143, 184, 232, 0.85) » ; palette.mix(a, b, poids)
 * mêle deux jetons, le poids étant celui du premier (config.mix de Céleste).
 */
export function canvasPalette(root = document.documentElement) {
  const style = getComputedStyle(root)
  const rgb = (name) => style.getPropertyValue(`--${name}`).trim().split(/\s+/).map(Number)
  const css = (channels, alpha) => `rgba(${channels.join(', ')}, ${alpha})`
  return {
    color: (name, alpha = 1) => css(rgb(name), alpha),
    mix: (a, b, weight, alpha = 1) => {
      const [first, second] = [rgb(a), rgb(b)]
      return css(first.map((x, i) => Math.round(x * weight + second[i] * (1 - weight))), alpha)
    },
  }
}
