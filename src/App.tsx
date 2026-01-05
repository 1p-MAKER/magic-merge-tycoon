import './App.css'
import { GameGrid } from './features/core/components/GameGrid'

import { EconomyProvider } from './features/economy/context/EconomyContext'
import { ThemeProvider } from './features/visuals/context/ThemeContext'

function App() {
  return (
    <div className="app-container">
      <ThemeProvider>
        <div className="glass-panel" style={{ padding: '2rem 4rem', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', textShadow: '0 0 10px var(--color-accent)' }}>Magic Merge Tycoon</h1>
        </div>
        <EconomyProvider>
          <GameGrid />
        </EconomyProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
