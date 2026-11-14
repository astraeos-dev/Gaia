import { useMemo } from 'react'
import { marked } from 'marked'

/**
 * Un document Markdown (les pages de Céleste, son wiki, son historique), en HTML dans le style du site.
 * `resolve(cible)` traduit un lien relatif du document (« Architecture.md », « docs/WEB.md ») en adresse du site,
 * ou en lien vers GitHub ; les liens externes s'ouvrent dans un nouvel onglet.
 * Les documents viennent du dépôt du projet, dans le site lui-même : ils ne sont pas saisis par les visiteurs.
 */
export default function Markdown({ source, resolve = (target) => target, className = '' }) {
  const html = useMemo(() => {
    const text = source.replace(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g, (_m, target) => `](${resolve(target)})`)
    return marked
      .parse(text, { gfm: true, async: false })
      .replace(/<a href="(https?:[^"]*)"/g, '<a target="_blank" rel="noreferrer" href="$1"')
  }, [source, resolve])
  return <div className={`prose-gaia ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}
