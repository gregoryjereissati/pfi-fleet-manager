import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import type { AppState } from '@auth0/auth0-react'
import './lib/i18n'
import './index.css'
import App from './App'

const domain = import.meta.env.VITE_AUTH0_DOMAIN as string
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string
const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI as string

function Auth0ProviderWithNavigate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? '/dashboard', { replace: true })
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0ProviderWithNavigate>
        <App />
      </Auth0ProviderWithNavigate>
    </BrowserRouter>
  </React.StrictMode>,
)
