import { Link } from 'react-router-dom'
import { SITE } from '../config/site'
import MARK from './gaia-mark.json'

/**
 * Logo : le G de Gaïa et son point d'or (scripts/make-logo.py). Charte Astræos, comme les logos des projets : la
 * lettre à l'encre, le point en or, aux couleurs du thème ; ni ombre, ni contour, ni dégradé.
 */
export function Logo({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={className}>
      <path
        d={MARK.letter}
        fill="none"
        strokeWidth={MARK.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-night-900 dark:stroke-night-100"
      />
      <circle cx={MARK.dot.cx} cy={MARK.dot.cy} r={MARK.dot.r} className="fill-accent-700 dark:fill-accent-400" />
    </svg>
  )
}

export default function Brand({ onClick }) {
  return (
    <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-2" aria-label={`${SITE.name} — accueil`}>
      <Logo />
      <span className="font-display text-lg font-semibold tracking-tight">{SITE.name}</span>
    </Link>
  )
}
