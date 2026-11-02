import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyHash } from './lib/hash'

// Open at the moment, surface and tab in the link (#m=4&s=app) without a flash of defaults.
applyHash(window.location.hash)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
