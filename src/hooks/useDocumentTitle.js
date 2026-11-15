import { useEffect } from 'react'
import { SITE } from '../config/site'

/** Le titre de l'onglet : « <title> — Gaïa », celui du site sans titre ; null le laisse à un composant enfant. */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (title === null) return
    document.title = title ? `${title} — ${SITE.name}` : `${SITE.name} — ${SITE.tagline.toLowerCase()}`
  }, [title])
}
