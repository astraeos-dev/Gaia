import { useEffect, useState } from 'react'

/**
 * Le thème appliqué à la page (les classes de <html>), relu à chaque changement. Un canevas qui lit les jetons
 * de la charte (canvasPalette) s'en sert pour se redessiner : les classes changent après le contexte du thème,
 * dans l'effet du ThemeProvider, donc après le dessin des composants qui le lisent.
 */
export function useAppliedTheme() {
  const read = () => document.documentElement.className
  const [applied, setApplied] = useState(read)
  useEffect(() => {
    const observer = new MutationObserver(() => setApplied(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return applied
}
