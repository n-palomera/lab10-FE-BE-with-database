import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AsgardeoProvider} from '@asgardeo/react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <AsgardeoProvider clientId="u1vYEXKQ_bTi7QIicVs089e6B1ga" baseUrl="https://api.asgardeo.io/t/nathanpalomera" scopes="openid profile">
      <App />
      </AsgardeoProvider>
  </StrictMode>,
)
