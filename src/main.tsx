import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@fontsource/big-shoulders-stencil-display/600'
import '@fontsource/big-shoulders-stencil-display/700'
import '@fontsource/big-shoulders-stencil-display/800'
import '@fontsource/big-shoulders-stencil-display/900'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
