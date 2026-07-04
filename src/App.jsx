import { lazy, Suspense, useEffect, useState } from 'react'
import Board from './views/Board.jsx'
import PostJob from './views/PostJob.jsx'
import Success from './views/Success.jsx'

// Code-split: employers and readers never download the newsroom's desk.
const Admin = lazy(() => import('./views/Admin.jsx'))

// Hash routing: GitHub Pages friendly, zero dependencies.
// #/job/:id deep-links a single opening — it renders the Board with that
// card open and scrolled into view.
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

// Report height to the parent page so the WordPress iframe fits exactly
// (same contract as wpr-community-board — see docs/embedding.md).
function useHeightReporter() {
  useEffect(() => {
    const post = () =>
      window.parent.postMessage(
        { type: 'wpr-jobs-height', height: document.documentElement.scrollHeight },
        '*',
      )
    const observer = new ResizeObserver(post)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [])
}

export default function App() {
  const route = useHashRoute()
  useHeightReporter()

  if (route.startsWith('#/post')) return <PostJob />
  if (route.startsWith('#/success')) return <Success />
  if (route.startsWith('#/admin')) {
    return (
      <Suspense
        fallback={
          <div className="page">
            <div className="notice">Opening the desk&hellip;</div>
          </div>
        }
      >
        <Admin />
      </Suspense>
    )
  }
  if (route.startsWith('#/job/')) {
    return <Board jobId={route.slice('#/job/'.length)} />
  }
  return <Board />
}
