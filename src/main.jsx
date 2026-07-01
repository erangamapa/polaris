import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/shell/ErrorBoundary.jsx'
import { OddsFormatProvider } from './lib/odds.jsx'
import { CurrencyProvider } from './lib/currency.jsx'
import { Web3Provider } from './web3/Web3Provider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Web3Provider>
        <CurrencyProvider>
          <OddsFormatProvider>
            <App />
          </OddsFormatProvider>
        </CurrencyProvider>
      </Web3Provider>
    </ErrorBoundary>
  </StrictMode>,
)
