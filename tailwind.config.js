/**
 * Thème du site : la charte Astræos (celle de Céleste), en deux échelles de couleur et ses jetons.
 *  - night  : les fonds, l'encre et les bordures (Jour en clair, Nuit en sombre)
 *  - accent : l'or d'Astræos
 * Les valeurs sont des variables CSS (src/index.css) : le thème Observation, rouge pour garder la vision
 * de nuit, les remplace toutes sans toucher aux classes.
 */
const scale = (name) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, `rgb(var(--${name}-${k}) / <alpha-value>)`]))

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        accent: scale('accent'),
        night: scale('night'),
        // Les jetons de la charte qui suivent le thème (rouges eux aussi en Observation) : l'or, la lune
        // (le bleu de Céleste), signal-ok (le vert de « Actif ») et signal-alerte (les erreurs) ; puis trois
        // mélanges de deux jetons pour les familles d'un schéma (brochages, diagramme de l'air humide).
        or: 'rgb(var(--or) / <alpha-value>)',
        lune: 'rgb(var(--lune) / <alpha-value>)',
        ok: 'rgb(var(--signal-ok) / <alpha-value>)',
        alerte: 'rgb(var(--signal-alerte) / <alpha-value>)',
        'or-alerte': 'rgb(var(--or-alerte) / <alpha-value>)',
        'lune-ok': 'rgb(var(--lune-ok) / <alpha-value>)',
        'lune-alerte': 'rgb(var(--lune-alerte) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
