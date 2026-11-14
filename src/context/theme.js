import { createContext, useContext } from 'react'

/** Les trois thèmes de la charte Astræos, dans l'ordre où le bouton les fait défiler. */
export const THEMES = ['light', 'dark', 'observation']

export const THEME_LABELS = { light: 'Jour', dark: 'Nuit', observation: 'Observation' }

/** La couleur de la barre du navigateur (ciel-000 de chaque thème). */
export const THEME_COLORS = { light: '#f6f4ef', dark: '#0b0f17', observation: '#0a0000' }

export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {}, setTheme: () => {} })

export const useTheme = () => useContext(ThemeContext)
