import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download, Search } from 'lucide-react'
import { SITE } from '../config/site'
import { ACTIVE_PROJECTS, PROJECTS, getProject, projectOfDomain } from '../data/projects'
import { DOMAINS, TOOLS, rubriquePath, toolsOf, toolsOfDomain } from '../registry'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import SectionTitle from '../components/SectionTitle'
import ToolCard from '../components/ToolCard'
import ProjectCard from '../components/ProjectCard'
import Loader from '../components/Loader'
import ErrorBoundary from '../components/ErrorBoundary'
import { Logo } from '../components/Brand'

// Chargé à part : le moteur astronomique ne pèse pas sur le premier affichage.
const TonightWidget = lazy(() => import('../domains/astronomie/tonight/TonightWidget.jsx'))

// La palette de recherche est gérée par l'en-tête, qui écoute cet événement.
const openSearch = () => window.dispatchEvent(new Event('open-search'))

const celeste = getProject('celeste')

export default function Home() {
  useDocumentTitle()
  const featured = TOOLS.filter((t) => t.featured)

  return (
    <>
      <section className="relative overflow-hidden bg-night-950 text-night-50">
        <div className="bg-stars absolute inset-0 opacity-70" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:py-20">
          <div>
            <p className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-accent-400">
              <Logo size={40} className="[&_path]:stroke-night-100 [&_polygon]:fill-accent-400" /> {SITE.name}
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Les projets d’Astraeos,
              <br />
              <span className="text-accent-400">du ciel au calcul.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-night-200">{SITE.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/celeste" className="btn-primary px-4 py-2.5">
                <Download size={16} /> Céleste {celeste.version} pour Windows
              </Link>
              <button
                type="button"
                onClick={openSearch}
                className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-night-700 bg-night-900/80 px-4 py-2.5 text-left text-night-300 transition-colors hover:border-accent-400 sm:w-auto sm:flex-1 sm:max-w-sm"
              >
                <Search size={17} className="text-accent-400" />
                <span className="flex-1 truncate">Rechercher parmi {TOOLS.length} outils…</span>
                <kbd className="hidden rounded border border-night-600 px-1.5 font-mono text-[11px] sm:block">Ctrl K</kbd>
              </button>
            </div>
          </div>
          <ErrorBoundary>
            <Suspense fallback={<div className="card"><Loader label="Calcul du ciel…" /></div>}>
              <div className="text-night-900 dark:text-night-100">
                <TonightWidget />
                <p className="mt-2 text-right text-xs text-night-400">
                  Céleste dans le navigateur ·{' '}
                  <Link to="/celeste/dans-le-navigateur" className="text-accent-400 hover:underline">
                    tous ses outils
                  </Link>
                </p>
              </div>
            </Suspense>
          </ErrorBoundary>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="pt-14">
          <SectionTitle kicker="Les projets" title="Un projet, une section">
            Des applications, des intégrations Home Assistant et une bibliothèque, toutes open source, sous licence MIT.
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ACTIVE_PROJECTS.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>

        <section className="pt-14">
          <SectionTitle kicker="Dans le navigateur" title={`${TOOLS.length} outils, sans rien installer`}>
            Les outils de Céleste et de Ganymède, qui calculent entièrement dans votre navigateur.
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            {DOMAINS.map((d) => {
              const project = projectOfDomain(d.id)
              return (
                <article key={d.id} className="card group flex flex-col p-5 transition-colors hover:border-accent-400/70">
                  <Link to={`/${d.id}`} className="flex items-start gap-4">
                    <span className="rounded-xl bg-accent-400/15 p-3 text-accent-700 transition-colors group-hover:bg-accent-400 group-hover:text-night-950 dark:text-accent-300">
                      <d.icon size={26} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xl font-semibold">{d.label}</span>
                        <span className="chip">{toolsOfDomain(d.id).length} outils</span>
                      </span>
                      <span className="mt-1 block text-sm text-night-600 dark:text-night-400">{d.description}</span>
                    </span>
                  </Link>
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`Rubriques de ${d.label}`}>
                    {d.rubriques.map((r) => (
                      <li key={r.id}>
                        <Link to={rubriquePath(r)} className="chip gap-1.5 px-2.5 py-1 text-xs hover:border-accent-400">
                          <r.icon size={12} /> {r.label} <span className="text-night-400">{toolsOf(r.id).length}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link to={`/${d.id}`} className="inline-flex items-center gap-1 font-medium text-accent-700 dark:text-accent-400">
                      Ouvrir l’espace <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    {project && (
                      <Link to={`/${project.id}`} className="text-xs text-night-500 hover:text-accent-700 dark:hover:text-accent-300">
                        Projet {project.title}
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="pt-14">
          <SectionTitle kicker="Les plus utilisés" title="Outils à la une" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>

        <section className="pt-14">
          <SectionTitle kicker="Archives" title="Les projets d’avant">
            Anciens dépôts dont les outils ont rejoint le site ou un autre projet ; ils restent consultables en lecture seule.
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.filter((p) => p.status === 'archive').map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
