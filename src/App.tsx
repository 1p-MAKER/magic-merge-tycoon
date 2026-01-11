import './App.css'
import { GameGrid } from './features/core/components/GameGrid'

import { EconomyProvider } from './features/economy/context/EconomyContext'
import { ThemeProvider } from './features/visuals/context/ThemeContext'

import { HUD } from './features/ui/components/HUD'

function App() {
  return (
    <div className="app-container" style={{ gap: '0', padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <ThemeProvider>
        {/* Compact Title with Safe Area padding */}


        <EconomyProvider>
          <HUD />
          <GameGrid />
        </EconomyProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
