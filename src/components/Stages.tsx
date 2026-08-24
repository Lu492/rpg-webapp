// Provides stage-specific enemy selection and generation before an encounter begins.
import React, { useState } from 'react'
import { Monster } from '../models'
import { generateMonsters } from '../utils/generator'
import { loadBestiary, saveBestiary } from '../utils/storage'
import { loadApiKey } from '../utils/storage'

type StagesProps = {
  stage: number
  onStartStage: (monsters: Monster[]) => void
}

export default function Stages({ stage, onStartStage }: StagesProps) {
  const [bestiary, setBestiary] = useState(() => loadBestiary())
  const [selectedMonsters, setSelectedMonsters] = useState<string[]>([])
  const hasApiKey = Boolean(loadApiKey())

  function toggleMonster(id: string) {
    setSelectedMonsters((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  async function createGeneratedMonsters() {
    const count = stage === 4 ? 3 : Math.floor(Math.random() * 6) + 1
    const generated: Monster[] = await generateMonsters(stage, count)
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
    const boss = selected.find((monster) => monster.kind === 'boss')
    if (!boss) return alert('Select or generate a boss first')
    const minions = selected.filter((monster) => monster.id !== boss.id && monster.kind !== 'boss').slice(0, 2)
    onStartStage([boss, ...minions])
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h2>{stage === 4 ? 'Boss Stage Setup' : `Stage ${stage} Setup`}</h2>
      <p>How to play: load saved enemies or generate new ones, select the enemies for this encounter, then press Start Stage. Your party was chosen on the main page.</p>
      {stage === 4 ? <>
        <strong>Bosses</strong>
        <ul>{bestiary.monsters.filter((monster) => monster.kind === 'boss').map((monster) => <li key={monster.id}><label><input type="checkbox" checked={selectedMonsters.includes(monster.id)} onChange={() => toggleMonster(monster.id)} /> {monster.name} Lv{monster.level}</label></li>)}</ul>
        <strong>Minions and regular monsters</strong>
        <ul>{bestiary.monsters.filter((monster) => monster.kind !== 'boss').map((monster) => <li key={monster.id}><label><input type="checkbox" checked={selectedMonsters.includes(monster.id)} onChange={() => toggleMonster(monster.id)} /> {monster.name} Lv{monster.level}</label></li>)}</ul>
      </> : <>
        <strong>Monsters</strong>
        <ul>{bestiary.monsters.filter((monster) => monster.kind !== 'boss').map((monster) => <li key={monster.id}><label><input type="checkbox" checked={selectedMonsters.includes(monster.id)} onChange={() => toggleMonster(monster.id)} /> {monster.name} Lv{monster.level}</label></li>)}</ul>
      </>}
      <button className="btn" disabled={!hasApiKey} onClick={createGeneratedMonsters}>Generate {stage === 4 ? 'Boss and Minions' : 'Monsters'}{!hasApiKey ? ' (API key required)' : ''}</button>
      <button className="btn" style={{ marginTop: 8 }} onClick={startStage}>Start Stage</button>
    </div>
  )
}
