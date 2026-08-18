import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { hydrateFromUrl } from './hooks/useUrlState'

// Before the first render, so a shared link never flashes the unfiltered table.
hydrateFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
