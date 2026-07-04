import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// WPR house type, self-hosted (Fontsource) so no reader request leaves the
// site from inside the WordPress iframe. Same stack as wpr-community-board:
// Oswald (nameplate), Merriweather (reading serif), Courier Prime (typewriter).
import '@fontsource/oswald/latin-400.css'
import '@fontsource/oswald/latin-500.css'
import '@fontsource/oswald/latin-600.css'
import '@fontsource/merriweather/latin-400.css'
import '@fontsource/merriweather/latin-700.css'
import '@fontsource/merriweather/latin-400-italic.css'
import '@fontsource/courier-prime/latin-400.css'
import '@fontsource/courier-prime/latin-700.css'

import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
