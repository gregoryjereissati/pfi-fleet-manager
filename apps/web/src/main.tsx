import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './lib/i18n'
import './index.css'
import App from './App'
import { SessionDataProvider } from './lib/session-data'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionDataProvider>
        <App />
      </SessionDataProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
