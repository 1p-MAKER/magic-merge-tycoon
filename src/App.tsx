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


        <EconomyProvider>
          <HUD />
          <GameGrid />
        </EconomyProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
