import { useCallback, useEffect, useMemo, useState } from 'react'
import { THEMES, THEME_COLORS, ThemeContext } from './theme'

const initialTheme = () => {
  if (typeof document === 'undefined') return 'dark'
  const root = document.documentElement.classList
  return root.contains('observation') ? 'observation' : root.contains('dark') ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    const root = document.documentElement.classList
    // Observation est un thème sombre : les variantes dark: s'appliquent, ses couleurs viennent de index.css.
    root.toggle('dark', theme !== 'light')
    root.toggle('observation', theme === 'observation')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // ignoré
    }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]), [])
  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
