import './App.css'
import { GameGrid } from './features/core/components/GameGrid'

import { EconomyProvider } from './features/economy/context/EconomyContext'
import { ThemeProvider } from './features/visuals/context/ThemeContext'

import { HUD } from './features/ui/components/HUD'

function App() {
  return (
    <div className="app-container" style={{ gap: '0px', padding: '0px', margin: '0px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
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
