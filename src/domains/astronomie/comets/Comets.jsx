import { useParams } from 'react-router-dom'
import CometList from './CometList'
import CometPage from './CometPage'

/** L'outil Comètes : la liste (#/astronomie/cometes) ou la fiche d'une comète (#/astronomie/cometes/<comète>). */
export default function Comets() {
  const { item } = useParams()
  return item ? <CometPage id={item} /> : <CometList />
}
