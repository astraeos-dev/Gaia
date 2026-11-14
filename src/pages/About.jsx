import { Link } from 'react-router-dom'
import { ACTIVE_PROJECTS, PROJECTS } from '../data/projects'
import { SITE } from '../config/site'
import { DOMAINS, TOOLS, toolsOfDomain } from '../registry'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import SectionTitle from '../components/SectionTitle'
import ProjectCard from '../components/ProjectCard'
import { Logo } from '../components/Brand'

export default function About() {
  useDocumentTitle('À propos')
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle kicker="À propos" title={`Qu'est-ce que ${SITE.name} ?`} />
      <div className="max-w-3xl space-y-4 text-night-700 dark:text-night-300">
        <p className="flex items-center gap-4">
          <Logo size={56} className="shrink-0" />
          <span>
            {SITE.name} réunit les projets d’Astraeos : pour chacun, ce qu’il fait, comment l’installer et sa documentation. Dans la mythologie grecque, Gaïa est la Terre mère, l’ancêtre des Titans : Astraeos, le Titan des
            étoiles et du crépuscule, est son petit-fils. Elle porte ici tous les projets.
          </span>
        </p>
        <p>
          Le site offre aussi {TOOLS.length} outils gratuits et sans inscription, issus de Céleste et de Ganymède. Tout est calculé
          directement dans votre navigateur : aucune donnée n'est envoyée à un serveur. Seuls les orbites de satellites et les taux de
          change sont téléchargés depuis des sources publiques. Les calculs astronomiques s'appuient sur des théories planétaires
          reconnues (VSOP87, ELP), avec une précision de l'ordre de la minute d'arc : ils conviennent à l'observation et à la curiosité,
          pas à la navigation.
        </p>
        <p>
          Les couleurs, les polices et le logo suivent la charte Astræos, celle de Céleste : trois thèmes (Jour, Nuit et Observation,
          rouge pour garder la vision de nuit), les polices IBM Plex, une lettre à l’encre et une étoile d’or.
        </p>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {DOMAINS.map((d) => (
            <li key={d.id}>
              <Link to={`/${d.id}`} className="inline-flex items-center gap-2 hover:text-accent-700 dark:hover:text-accent-300">
                <d.icon size={15} className="text-accent-600" /> {d.label} ({toolsOfDomain(d.id).length})
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-14">
        <SectionTitle kicker="Les projets" title="Les projets d’Astraeos" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVE_PROJECTS.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle kicker="Archives" title="Projets intégrés au site">
          Anciens dépôts dont les outils ont été repris ici ou dans un autre projet. Ils restent consultables en lecture seule.
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.filter((p) => p.status === 'archive').map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>
    </div>
  )
}
