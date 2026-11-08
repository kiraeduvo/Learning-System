import '@fontsource/fredoka/latin-500.css'
import '@fontsource/fredoka/latin-600.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StoreProvider } from './state/store'
import './styles.css'

// 防止长按出现选单、双指缩放（小孩常常不小心按到）
document.addEventListener('contextmenu', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
