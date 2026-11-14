import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Loader from './components/Loader'
import Home from './pages/Home'
import ToolsIndex from './pages/ToolsIndex'
import DomainPage from './pages/DomainPage'
import ToolPage from './pages/ToolPage'
import ProjectPage from './pages/ProjectPage'
import About from './pages/About'
import NotFound from './pages/NotFound'
import { ACTIVE_PROJECTS } from './data/projects'

// La section de Céleste emporte ses documents (wiki, historique) : chargée à part.
const CelesteSection = lazy(() => import('./projects/celeste/CelesteSection.jsx'))

const celeste = (
  <Suspense fallback={<Loader label="Chargement de Céleste…" />}>
    <CelesteSection />
  </Suspense>
)

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="outils" element={<ToolsIndex />} />
        <Route path="a-propos" element={<About />} />
        <Route path="projets" element={<Navigate to="/" replace />} />
        {/* Les sections des projets : #/celeste/<page>, #/celeste/documentation/<document>, #/<projet> */}
        <Route path="celeste" element={celeste} />
        <Route path="celeste/:page" element={celeste} />
        <Route path="celeste/documentation/:doc" element={celeste} />
        {ACTIVE_PROJECTS.filter((p) => p.id !== 'celeste').map((p) => (
          <Route key={p.id} path={p.id} element={<ProjectPage id={p.id} />} />
        ))}
        <Route path=":domain" element={<DomainPage />} />
        <Route path=":domain/:toolId" element={<ToolPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
