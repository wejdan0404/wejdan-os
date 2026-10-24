import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/fonts'
import './ui/styles/tokens.css'
import './ui/styles/base.css'
import App from './App'
import './pwa'

document.documentElement.lang = 'ar'
document.documentElement.dir = 'rtl'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
