import { useEffect, useState } from 'react'
import Board from './views/Board.jsx'
import PostJob from './views/PostJob.jsx'
import Success from './views/Success.jsx'
import Admin from './views/Admin.jsx'

// Hash routing: four views, GitHub Pages friendly, zero dependencies.
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const route = useHashRoute()
  if (route.startsWith('#/post')) return <PostJob />
  if (route.startsWith('#/success')) return <Success />
  if (route.startsWith('#/admin')) return <Admin />
  return <Board />
}
