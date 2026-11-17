import { Link, NavLink, useParams } from 'react-router-dom'
import { ArrowRight, Download, ExternalLink, FileText } from 'lucide-react'
import { getProject } from '../../data/projects'
import { DOMAINS, toolsOf, toolPath, toolsOfDomain, rubriquePath } from '../../registry'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import Markdown from '../../components/Markdown'
import ToolCard from '../../components/ToolCard'
import { ProjectLogo, ProjectStatus } from '../../components/ProjectCard'
import NotFound from '../../pages/NotFound'
import { DOCUMENTS, PAGES, changelog, doc, getDocument, getPage, latestVersion, resolveLink } from './pages'

const PROJECT = getProject('celeste')
const pageLink = (id) => (id ? `/celeste/${id}` : '/celeste')

/** Les outils d'astronomie du site : Céleste dans le navigateur. */
function InBrowser() {
  const domains = DOMAINS.filter((d) => PROJECT.domains.includes(d.id))
  return (
    <div className="space-y-10">
      <div className="prose-gaia">
        <p>
          Une partie de Céleste fonctionne déjà ici, sans rien installer : les outils d’astronomie du site calculent pour votre lieu
          (choisi dans l’en-tête) le ciel de ce soir, ce qu’il y a de mieux à voir cette nuit selon vos contraintes, la fiche du mois à imprimer, la carte du ciel et celles des 88 constellations, le calendrier, les éclipses, les
          étoiles filantes, les minima d’Algol, les novae et les supernovae du moment, le Soleil, la Lune, les planètes et leurs satellites, les comètes, les astéroïdes, ceux qui passent près de la Terre et les étoiles qu’ils cachent, et les satellites artificiels. Ils s’appuient sur Astronomy Engine, un autre moteur que celui de Céleste, d’une précision de l’ordre de la
          minute d’arc : assez pour observer, pas pour naviguer.
        </p>
      </div>
      {domains.map((d) =>
        d.rubriques.map((r) => (
          <section key={r.id}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <r.icon size={20} className="text-accent-700 dark:text-accent-400" /> {r.label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {toolsOf(r.id).map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        )),
      )}
      <p className="text-sm text-night-600 dark:text-night-400">
        Tout l’espace{' '}
        {domains.map((d) => (
          <Link key={d.id} to={`/${d.id}`} className="font-medium text-accent-700 hover:underline dark:text-accent-400">
            {d.label} ({toolsOfDomain(d.id).length} outils)
          </Link>
        ))}
        .
      </p>
    </div>
  )
}

function Versions() {
  return (
    <div className="space-y-6">
      <div className="prose-gaia">
        <p>
          L’historique complet de Céleste, tel que le dépôt le tient, de la plus récente à la plus ancienne. Chaque section est aussi la
          note de la version sur GitHub et le texte de la fenêtre de mise à jour : il est écrit en anglais, comme le code du projet.
        </p>
      </div>
      <Markdown source={changelog()} resolve={(t) => resolveLink(t)} className="changelog" />
    </div>
  )
}

function Documentation() {
  const groups = [
    { id: 'wiki', title: 'Le wiki du projet', text: 'Des fiches pratiques pour modifier Céleste : quels fichiers toucher, dans quel ordre, et comment vérifier le résultat.' },
    { id: 'conception', title: 'Documents de conception (en anglais)', text: 'L’Atelier et ses instruments, la version Android, Céleste sur le web.' },
  ]
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.id}>
          <h2 className="text-xl font-semibold">{g.title}</h2>
          <p className="mt-1 text-sm text-night-600 dark:text-night-400">{g.text}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {DOCUMENTS.filter((d) => d.group === g.id).map((d) => (
              <li key={d.slug}>
                <Link to={`/celeste/documentation/${d.slug}`} className="card flex items-center gap-3 px-4 py-3 transition-colors hover:border-accent-400/70">
                  <FileText size={16} className="shrink-0 text-accent-700 dark:text-accent-400" />
                  <span className="font-medium">{d.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function DocumentPage({ slug }) {
  const d = getDocument(slug)
  if (!d) return <NotFound />
  const from = d.file.includes('/') ? 'docs/wiki' : 'docs'
  return (
    <div className="space-y-4">
      <Link to="/celeste/documentation" className="text-sm text-accent-700 hover:underline dark:text-accent-400">
        ← Toute la documentation
      </Link>
      <Markdown source={doc(d.file)} resolve={(t) => resolveLink(t, from)} />
      <a
        href={`https://github.com/astraeos-dev/Celeste_App/blob/master/${from}/${d.file.split('/').pop()}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-night-500 hover:text-accent-600"
      >
        <ExternalLink size={12} /> Ce document sur GitHub
      </a>
    </div>
  )
}

function Body({ page, docSlug }) {
  if (docSlug) return <DocumentPage slug={docSlug} />
  if (page.id === 'dans-le-navigateur') return <InBrowser />
  if (page.id === 'versions') return <Versions />
  if (page.id === 'documentation') return <Documentation />
  return <Markdown source={page.source} resolve={(t) => resolveLink(t)} />
}

/** La section de Céleste : son en-tête, ses pages, et la page demandée (#/celeste/<page>[/<document>]). */
export default function CelesteSection() {
  const { page: pageId = '', doc: docSlug } = useParams()
  const page = getPage(docSlug ? 'documentation' : pageId)
  const shown = docSlug ? getDocument(docSlug) : null
  useDocumentTitle(shown ? `${shown.title} — Céleste` : page?.id ? `${page.title} — Céleste` : 'Céleste')
  if (!page) return <NotFound />
  const version = latestVersion() || PROJECT.version

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-5">
          <ProjectLogo project={PROJECT} size={72} />
          <div>
            <p className="text-sm font-medium text-accent-700 dark:text-accent-400">{PROJECT.kind}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {PROJECT.title} <ProjectStatus status={PROJECT.status} />
            </h1>
            <p className="mt-2 max-w-2xl text-lg text-night-700 dark:text-night-300">{PROJECT.tagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={PROJECT.links[0].href} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2.5">
            <Download size={16} /> Céleste {version} pour Windows
          </a>
          <a href={PROJECT.links[1].href} target="_blank" rel="noreferrer" className="btn px-4 py-2.5">
            <ExternalLink size={16} /> Code source
          </a>
        </div>
      </header>

      <nav className="scrollbar-thin -mx-4 mt-8 flex gap-1 overflow-x-auto border-b border-night-200 px-4 dark:border-night-800" aria-label="Pages de Céleste">
        {PAGES.map((p) => (
          <NavLink
            key={p.id}
            to={pageLink(p.id)}
            end
            className={({ isActive }) =>
              `inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive || (p.id === 'documentation' && docSlug)
                  ? 'border-accent-500 text-accent-800 dark:border-accent-400 dark:text-accent-300'
                  : 'border-transparent text-night-600 hover:text-night-950 dark:text-night-400 dark:hover:text-night-50'
              }`
            }
          >
            <p.icon size={15} /> {p.title}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="min-w-0">
          <Body page={page} docSlug={docSlug} />
        </article>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card card-pad text-sm">
            <p className="label">Dans le navigateur</p>
            <ul className="grid gap-1">
              {PROJECT.tools.map((id) => {
                const tool = toolsOfDomain('astronomie').find((t) => t.id === id)
                return tool ? (
                  <li key={id}>
                    <Link to={toolPath(tool)} className="inline-flex items-center gap-1.5 text-accent-700 hover:underline dark:text-accent-400">
                      <tool.icon size={14} /> {tool.title}
                    </Link>
                  </li>
                ) : null
              })}
              {DOMAINS.filter((d) => PROJECT.domains.includes(d.id)).flatMap((d) => d.rubriques).map((r) => (
                <li key={r.id}>
                  <Link to={rubriquePath(r)} className="inline-flex items-center gap-1.5 text-night-600 hover:text-accent-700 dark:text-night-400 dark:hover:text-accent-300">
                    <r.icon size={14} /> {r.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/celeste/dans-le-navigateur" className="mt-3 inline-flex items-center gap-1 font-medium text-accent-700 dark:text-accent-400">
              Tous les outils <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card card-pad text-sm text-night-600 dark:text-night-400">
            <p className="label">En bref</p>
            <ul className="grid gap-1">
              <li>Version {version}, licence MIT</li>
              <li>Windows ; macOS et Linux depuis les sources</li>
              <li>Français, anglais, espagnol, allemand</li>
              <li>{PROJECT.tech.join(', ')}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
