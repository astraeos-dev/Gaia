import { fmt } from '../../../lib/format'
import { useAstroClock } from '../../../hooks/useAstroClock'
import { Row } from '../components/InfoCard'
import SmallBodyPage from '../comets/SmallBodyPage'
import { getAsteroid, nextOpposition } from './data'

const dayMonthYear = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** La fiche d'un astéroïde ou d'une planète naine, sur le modèle de celle des comètes. */
export default function AsteroidPage({ id }) {
  const asteroid = getAsteroid(id)
  const { date } = useAstroClock({ live: true, intervalMs: 3_600_000 })
  const opposition = asteroid ? nextOpposition(asteroid, date) : null
  return (
    <SmallBodyPage
      body={asteroid}
      back={{ to: '/astronomie/asteroides', label: 'Tous les astéroïdes' }}
      missing="Cet astéroïde n’est pas dans la liste du site."
      intro={(sky) =>
        [
          asteroid.dwarf ? 'Planète naine.' : 'Astéroïde.',
          sky.mag != null && `Magnitude prévue à l’instant choisi : ${fmt(sky.mag, 1)}.`,
          asteroid.diameter != null && `Diamètre : ${fmt(asteroid.diameter, 0)} km.`,
        ]
          .filter(Boolean)
          .join(' ')
      }
      nightExtra={
        opposition && <Row label="Prochaine opposition" value={dayMonthYear.format(opposition.t)} sub={`mag ${fmt(opposition.mag, 1)}`} />
      }
    />
  )
}
