import * as I from 'lucide-react'
import presentation from './content/presentation.md?raw'
import fonctionnalites from './content/fonctionnalites.md?raw'
import installation from './content/installation.md?raw'
import confidentialite from './content/confidentialite.md?raw'
import references from './content/references.md?raw'
import feuilleDeRoute from './content/feuille-de-route.md?raw'

/**
 * LA SECTION CÉLESTE
 * ------------------
 * Ses pages (#/celeste/<id>) : celles écrites pour le site (content/, en français), ses outils dans le navigateur,
 * son historique et sa documentation, recopiés du dépôt Celeste_App par scripts/sync-celeste.mjs (docs/).
 */

const DOCS = import.meta.glob('./docs/**/*.md', { query: '?raw', import: 'default', eager: true })

/** Le titre d'un document : son premier titre Markdown. */
const titleOf = (text) => (text.match(/^#\s+(.+)$/m)?.[1] ?? '').replace(/`/g, '').trim()

/** Un document recopié, par son nom de fichier (« wiki/Architecture.md », « CHANGELOG.md »). */
export const doc = (path) => DOCS[`./docs/${path}`] ?? ''

/**
 * La documentation : le wiki (en français) et les documents de conception (en anglais).
 * slug : #/celeste/documentation/<slug> ; file : le fichier recopié.
 */
export const DOCUMENTS = [
  { slug: 'wiki', file: 'wiki/Home.md', group: 'wiki' },
  ...[
    'Architecture',
    'Textes-et-infobulles',
    'Ajouter-une-planete-mineure',
    'Ajouter-une-comete',
    'Ajouter-une-etoile',
    'Ajouter-une-pluie-d-etoiles-filantes',
    'Ajouter-une-langue',
    'Ajouter-un-instrument',
    'Tester-ses-modifications',
    'Publier-une-version',
  ].map((name) => ({ slug: name.toLowerCase(), file: `wiki/${name}.md`, group: 'wiki' })),
  { slug: 'instruments', file: 'INSTRUMENTS.md', group: 'conception' },
  { slug: 'android', file: 'ANDROID.md', group: 'conception' },
  { slug: 'web', file: 'WEB.md', group: 'conception' },
]
  .filter((d) => doc(d.file))
  .map((d) => ({ ...d, title: d.slug === 'wiki' ? 'Accueil du wiki' : titleOf(doc(d.file)) || d.slug }))

export const getDocument = (slug) => DOCUMENTS.find((d) => d.slug === slug)

/** L'historique des versions, sans l'avertissement aux mainteneurs qui le précède. */
export const changelog = () => {
  const text = doc('CHANGELOG.md')
  const first = text.search(/^## /m)
  return first >= 0 ? text.slice(first) : text
}

/** La dernière version publiée, d'après l'historique. */
export const latestVersion = () => changelog().match(/^## +(\d+(?:\.\d+)+)/m)?.[1] ?? ''

const REPO = 'https://github.com/astraeos-dev/Celeste_App'

/**
 * L'adresse d'un lien relatif d'un document recopié : une page du site si le document y est, sinon le fichier sur
 * GitHub. `from` : le dossier du document dans le dépôt (« docs/wiki », « docs », « »).
 */
export function resolveLink(target, from = '') {
  const [path, anchor] = target.split('#')
  const name = path.split('/').pop()
  if (name === 'CHANGELOG.md') return '#/celeste/versions'
  const found = DOCUMENTS.find((d) => d.file.split('/').pop() === name)
  if (found) return `#/celeste/documentation/${found.slug}`
  const clean = [from, path].filter(Boolean).join('/').replace(/(^|\/)\.\//g, '$1')
  const parts = []
  for (const part of clean.split('/')) {
    if (part === '..') parts.pop()
    else if (part) parts.push(part)
  }
  return `${REPO}/blob/master/${parts.join('/')}${anchor ? `#${anchor}` : ''}`
}

export const PAGES = [
  { id: '', title: 'Présentation', icon: I.Sparkles, source: presentation },
  { id: 'fonctionnalites', title: 'Fonctionnalités', icon: I.ListChecks, source: fonctionnalites },
  { id: 'installation', title: 'Installation', icon: I.Download, source: installation },
  { id: 'dans-le-navigateur', title: 'Dans le navigateur', icon: I.Globe },
  { id: 'versions', title: 'Versions', icon: I.History },
  { id: 'documentation', title: 'Documentation', icon: I.BookOpen },
  { id: 'confidentialite', title: 'Confidentialité', icon: I.ShieldCheck, source: confidentialite },
  { id: 'references', title: 'Références', icon: I.Library, source: references },
  { id: 'feuille-de-route', title: 'Feuille de route', icon: I.Map, source: feuilleDeRoute },
]

export const getPage = (id = '') => PAGES.find((p) => p.id === id)
