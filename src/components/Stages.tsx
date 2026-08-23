import React, { useState } from 'react'
import { Monster } from '../models'
import { loadBestiary, saveBestiary } from '../utils/storage'

type StagesProps = {
  stage: number
  onStartStage: (monsters: Monster[]) => void
}

export default function Stages({ stage, onStartStage }: StagesProps) {
  const [bestiary, setBestiary] = useState(() => loadBestiary())
  const [selectedMonsters, setSelectedMonsters] = useState<string[]>([])

  function toggleMonster(id: string) {
    setSelectedMonsters((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  function generateMonsters() {
    const count = stage === 4 ? 3 : Math.floor(Math.random() * 6) + 1
    const generated: Monster[] = Array.from({ length: count }, (_, index) => ({
      id: `stage-${Date.now()}-${index}`,
      name: stage === 4 ? (index === 0 ? 'Generated Boss' : `Generated Minion ${index}`) : `Generated Monster ${index + 1}`,
      level: stage,
      stats: { stamina: stage + 3, dexterity: stage + 2 },
      hp: stage === 4 ? 120 : 20 + stage * 15,
      mp: stage === 4 ? 40 : 0,
      skills: [],
      attackPattern: stage % 2 === 0 ? 'focus-lowest-hp' : 'focus-weakest'
    }))
    const next = { monsters: [...bestiary.monsters, ...generated] }
    saveBestiary(next)
    setBestiary(next)
    setSelectedMonsters(generated.map((monster) => monster.id))
  }

  function startStage() {
    const selected = bestiary.monsters.filter((monster) => selectedMonsters.includes(monster.id))
    if (stage < 4) {
      const foes = selected.slice(0, 6)
      if (!foes.length) return alert('Select or generate monsters first')
      onStartStage(foes)
      return
    }
    const boss = selected.find((monster) => monster.id.startsWith('b-') || monster.name.toLowerCase().includes('boss')) || bestiary.monsters.find((monster) => monster.id.startsWith('b-'))
    if (!boss) return alert('Select or generate a boss first')
    const minions = selected.filter((monster) => monster.id !== boss.id && !monster.id.startsWith('b-')).slice(0, 2)
    onStartStage([boss, ...minions])
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h2>{stage === 4 ? 'Boss Stage Setup' : `Stage ${stage} Setup`}</h2>
      <p>How to play: load saved enemies or generate new ones, select the enemies for this encounter, then press Start Stage. Your party was chosen on the main page.</p>
      <strong>{stage === 4 ? 'Load a boss and up to two minions, or generate a boss' : 'Load monsters or generate 1 to 6 monsters'}</strong>
      <ul>{bestiary.monsters.map((monster) => <li key={monster.id}><label><input type="checkbox" checked={selectedMonsters.includes(monster.id)} onChange={() => toggleMonster(monster.id)} /> {monster.name} Lv{monster.level}</label></li>)}</ul>
      <button className="btn" onClick={generateMonsters}>Generate {stage === 4 ? 'Boss and Minions' : 'Monsters'}</button>
      <button className="btn" style={{ marginTop: 8 }} onClick={startStage}>Start Stage</button>
    </div>
  )
}
