import './App.css'
import { GameGrid } from './features/core/components/GameGrid'

import { EconomyProvider } from './features/economy/context/EconomyContext'

function App() {
  return (
    <div className="app-container">
      <h1>Magic Merge Tycoon</h1>
      <EconomyProvider>
        <GameGrid />
      </EconomyProvider>
    </div>
  )
}

export default App
