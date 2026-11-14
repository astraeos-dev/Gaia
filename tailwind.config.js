/**
 * Thème du site : la charte Astræos (celle de Céleste), en deux jetons de couleur.
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
        // signal-ok de la charte : le vert de « Actif », rouge lui aussi en Observation
        ok: 'rgb(var(--signal-ok) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
