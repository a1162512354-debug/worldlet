import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { SillytavernProvider } from './hooks/useSillytavern'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SillytavernProvider>
      <App />
    </SillytavernProvider>
  </React.StrictMode>,
)
