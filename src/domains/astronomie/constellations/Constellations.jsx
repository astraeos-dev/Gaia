import { Suspense, lazy } from 'react'
import { useParams } from 'react-router-dom'
import Loader from '../../../components/Loader'
import ConstellationList from './ConstellationList'

// La fiche charge les étoiles et le ciel profond : la liste s'affiche sans les attendre
const ConstellationPage = lazy(() => import('./ConstellationPage'))

/** L'outil Constellations : la liste des 88 (#/astronomie/constellations) ou la fiche de l'une d'elles. */
export default function Constellations() {
  const { item } = useParams()
  if (!item) return <ConstellationList />
  return (
    <Suspense fallback={<Loader />}>
      <ConstellationPage id={item} />
    </Suspense>
  )
}
