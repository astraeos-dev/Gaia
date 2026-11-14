import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react'
import { getProject } from '../data/projects'
import { DOMAINS, TOOLS, rubriquePath, toolsOf, toolsOfDomain } from '../registry'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import ToolCard from '../components/ToolCard'
import SectionTitle from '../components/SectionTitle'
import { ProjectLogo, ProjectStatus } from '../components/ProjectCard'
import NotFound from './NotFound'

/** La section d'un projet (#/<id>) : présentation, fonctionnalités, installation, liens, et ses outils sur le site. */
export default function ProjectPage({ id }) {
  const project = getProject(id)
  useDocumentTitle(project?.title)
  if (!project) return <NotFound />
  const domains = DOMAINS.filter((d) => project.domains?.includes(d.id))
  const tools = TOOLS.filter((t) => project.tools?.includes(t.id))

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-5">
          <ProjectLogo project={project} size={72} />
          <div>
            <p className="text-sm font-medium text-accent-700 dark:text-accent-400">{project.kind}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {project.title} <ProjectStatus status={project.status} />
            </h1>
            <p className="mt-2 max-w-2xl text-lg text-night-700 dark:text-night-300">{project.tagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {project.links?.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={l.primary ? 'btn-primary px-4 py-2.5' : 'btn px-4 py-2.5'}>
              <ExternalLink size={16} /> {l.label}
            </a>
          ))}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-10">
          <section className="prose-gaia">
            <p className="text-lg">{project.description}</p>
            {project.intro?.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>

          {project.features?.length > 0 && (
            <section>
              <SectionTitle kicker="Fonctionnalités" title={`Ce que fait ${project.title}`} />
              <div className="grid gap-4 md:grid-cols-2">
                {project.features.map((f) => (
                  <article key={f.title} className="card card-pad">
                    <h3 className="font-semibold">{f.title}</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-night-700 dark:text-night-300">
                      {f.items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent-700 dark:text-accent-400" /> {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          )}

          {domains.length > 0 && (
            <section>
              <SectionTitle kicker="Dans le navigateur" title="Ses outils sur le site">
                Ils fonctionnent entièrement dans le navigateur, sans compte ni publicité.
              </SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                {domains.map((d) => (
                  <article key={d.id} className="card group flex flex-col p-5 transition-colors hover:border-accent-400/70">
                    <Link to={`/${d.id}`} className="flex items-start gap-4">
                      <span className="rounded-xl bg-accent-400/15 p-3 text-accent-700 transition-colors group-hover:bg-accent-400 group-hover:text-night-950 dark:text-accent-300">
                        <d.icon size={24} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-lg font-semibold">{d.label}</span>
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
                    <Link to={`/${d.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-400">
                      Ouvrir l’espace <ArrowRight size={14} />
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {domains.length === 0 && tools.length > 0 && (
            <section>
              <SectionTitle kicker="Sur le site" title="Les outils qui en viennent" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {project.install?.length > 0 && (
            <div className="card card-pad text-sm">
              <p className="label">Installation</p>
              <ol className="grid list-decimal gap-2 pl-4 text-night-700 dark:text-night-300">
                {project.install.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="card card-pad text-sm text-night-600 dark:text-night-400">
            <p className="label">En bref</p>
            <ul className="grid gap-1">
              {project.version && <li>Version {project.version}</li>}
              <li>{project.tech.join(', ')}</li>
              <li>Licence MIT</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
