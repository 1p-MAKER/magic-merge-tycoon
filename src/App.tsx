import './App.css'
import { GameGrid } from './features/core/components/GameGrid'

import { EconomyProvider } from './features/economy/context/EconomyContext'
import { ThemeProvider } from './features/visuals/context/ThemeContext'

import { HUD } from './features/ui/components/HUD'

function App() {
  return (
    <div className="app-container">
      <ThemeProvider>
        {/* Compact Title with Safe Area padding */}
        <div style={{
          paddingTop: 'env(safe-area-inset-top)',
          marginTop: '1rem',
          marginBottom: '1rem'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.8rem',
            textShadow: '0 0 10px var(--color-accent)'
          }}>マジックマージ</h1>
        </div>

        <EconomyProvider>
          <HUD />
          <GameGrid />
        </EconomyProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
