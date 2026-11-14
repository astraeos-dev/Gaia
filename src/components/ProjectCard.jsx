import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { PROJECT_STATUS } from '../data/projects'
import { SITE } from '../config/site'

/** Le logo d'un projet (image de public/), ou son icône. */
export function ProjectLogo({ project, size = 44 }) {
  if (project.logo) {
    return <img src={`${import.meta.env.BASE_URL}${project.logo}`} alt="" width={size} height={size} className="shrink-0 rounded-xl" />
  }
  const Icon = project.icon
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent-400/15 text-accent-700 dark:text-accent-300" style={{ width: size, height: size }}>
      {Icon && <Icon size={Math.round(size * 0.5)} />}
    </span>
  )
}

export function ProjectStatus({ status }) {
  const s = PROJECT_STATUS[status] ?? PROJECT_STATUS.prototype
  return <span className={`chip self-center bg-transparent leading-4 tracking-normal dark:bg-transparent ${s.className}`}>{s.label}</span>
}

/** La carte d'un projet : vers sa section (projet actif) ou son dépôt (archive). */
export default function ProjectCard({ project }) {
  const archived = project.status === 'archive'
  const body = (
    <>
      <div className="flex items-start gap-4">
        <ProjectLogo project={project} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold leading-tight">{project.title}</h3>
            <ProjectStatus status={project.status} />
          </div>
          {project.kind && <p className="mt-0.5 text-xs text-night-500 dark:text-night-400">{project.kind}</p>}
        </div>
      </div>
      {project.tagline && <p className="mt-3 font-medium text-night-800 dark:text-night-100">{project.tagline}</p>}
      <p className="mt-1 flex-1 text-sm text-night-600 dark:text-night-400">{project.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.tech.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>
    </>
  )
  if (archived) {
    return (
      <article className="card flex h-full flex-col p-5">
        {body}
        {project.private ? (
          <p className="mt-3 text-xs text-night-500">Dépôt privé</p>
        ) : (
          <a href={`${SITE.github}/${project.repo}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-night-500 hover:text-accent-600">
            <ExternalLink size={12} /> github.com/astraeos-dev/{project.repo}
          </a>
        )}
      </article>
    )
  }
  return (
    <Link to={`/${project.id}`} className="card group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-accent-400/70">
      {body}
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-700 dark:text-accent-400">
        Découvrir {project.title} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
