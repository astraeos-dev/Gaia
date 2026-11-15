import { useParams } from 'react-router-dom'
import AsteroidList from './AsteroidList'
import AsteroidPage from './AsteroidPage'

/** L'outil Astéroïdes : la liste (#/astronomie/asteroides) ou la fiche d'un astre (#/astronomie/asteroides/<astre>). */
export default function Asteroids() {
  const { item } = useParams()
  return item ? <AsteroidPage id={item} /> : <AsteroidList />
}
