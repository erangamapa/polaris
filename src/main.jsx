import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/shell/ErrorBoundary.jsx'
import { OddsFormatProvider } from './lib/odds.jsx'
import { CurrencyProvider } from './lib/currency.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <CurrencyProvider>
        <OddsFormatProvider>
          <App />
        </OddsFormatProvider>
      </CurrencyProvider>
    </ErrorBoundary>
  </StrictMode>,
)
