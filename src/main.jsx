import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/shell/ErrorBoundary.jsx'
import { OddsFormatProvider } from './lib/odds.jsx'
import { CurrencyProvider } from './lib/currency.jsx'
import { PlayerSettingsProvider } from './lib/usePlayerSettings.jsx'
import { Web3Provider } from './web3/Web3Provider.jsx'

// Provider order is load-bearing. PlayerSettingsProvider needs the wallet
// (it reads the connected address and asks it to sign), so it sits INSIDE
// Web3Provider; currency and odds format are now stored settings rather than
// their own localStorage keys, so those two sit inside it in turn.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Web3Provider>
        <PlayerSettingsProvider>
          <CurrencyProvider>
            <OddsFormatProvider>
              <App />
            </OddsFormatProvider>
          </CurrencyProvider>
        </PlayerSettingsProvider>
      </Web3Provider>
    </ErrorBoundary>
  </StrictMode>,
)
