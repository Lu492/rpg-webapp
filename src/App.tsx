import React, { useState } from 'react'
import { Character, Monster, Item } from './models'
import { generateCharacters } from './utils/generator'
import { initializeDefaults, loadAiProvider, loadApiKey, loadCharacters, saveAiProvider, saveApiKey, saveCharacters } from './utils/storage'
import Stages from './components/Stages'
import Battle from './components/Battle'

initializeDefaults()

type Page = 'start' | 'setup' | 'encounter' | 'reward' | 'gameover' | 'winner'

export default function App() {
  const [page, setPage] = useState<Page>('start')
  const [names, setNames] = useState(['', '', ''])
  const [characters, setCharacters] = useState<Character[]>(() => loadCharacters())
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(() => loadCharacters().map((character) => character.id))
  const [stage, setStage] = useState(1)
  const [encounter, setEncounter] = useState<Monster[]>([])
  const [rewardItems, setRewardItems] = useState<Item[]>([])
  const [provider, setProvider] = useState(loadAiProvider())
  const [apiKey, setApiKey] = useState(loadApiKey() || '')

  function updateName(index: number, value: string) {
    const next = [...names]
    next[index] = value.slice(0, 50)
    setNames(next)
  }

  async function createCharacters() {
    const created = await generateCharacters(names)
    saveCharacters(created)
    setCharacters(created)
    setSelectedCharacterIds(created.map((character) => character.id))
  }

  function handleStartStage(monsters: Monster[]) {
    const selectedCharacters = characters.filter((character) => selectedCharacterIds.includes(character.id))
    if (!selectedCharacters.length) return alert('Select at least one character on the main page')
    const healed = selectedCharacters.map((character) => ({
      ...character,
      hp: character.stats.stamina * 12 + character.level * 10,
      mp: character.stats.intelligence * 12 + character.stats.empathy * 6 + character.level * 5
    }))
    setCharacters(healed)
    setEncounter(monsters)
    setPage('encounter')
  }

  function handleBattleEnd(winner: 'players' | 'monsters', players: Character[], items: Item[]) {
    setCharacters(players)
    saveCharacters(players)
    setRewardItems(items)
    setPage(winner === 'players' ? (stage === 4 ? 'winner' : 'reward') : 'gameover')
  }

  function nextStage() {
    setStage((current) => current + 1)
    setPage('setup')
  }

  return (
    <div className="page">
      <header className="header">RPG Campaign</header>
      <div role="status" style={{ padding: 8, marginBottom: 12, background: loadApiKey() ? '#164e3b' : '#5b3a12', borderRadius: 8 }}>
        AI API ({provider}): {loadApiKey() ? 'configured' : 'not configured; stored patterns will be used'}
      </div>
      <main className="card">
        {page === 'start' && <>
          <h2>Start Campaign</h2>
          <p>How to play: create or load your party, choose up to three characters, choose an AI provider, then start each stage. During encounters, choose one action per character and resolve the enemy turn.</p>
          <h3>Choose AI provider</h3>
          <select className="input" value={provider} onChange={(event) => { const value = event.target.value as 'openai' | 'deepseek'; setProvider(value); saveAiProvider(value) }}><option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option></select>
          <input className="input" type="password" placeholder={`${provider} API key`} value={apiKey} onChange={(event) => setApiKey(event.target.value)} onBlur={() => saveApiKey(apiKey)} />
          {names.map((name, index) => <input key={index} className="input" placeholder={`Character ${index + 1} description`} value={name} onChange={(event) => updateName(index, event.target.value)} />)}
          <button className="btn" onClick={async () => { await createCharacters() }}>Create Characters</button>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => { const loaded = loadCharacters(); setCharacters(loaded); setSelectedCharacterIds(loaded.map((character) => character.id)) }}>Load Saved Characters</button>
          <h3>Choose Campaign Characters</h3>
          <ul>{characters.map((character) => <li key={character.id}><label><input type="checkbox" checked={selectedCharacterIds.includes(character.id)} onChange={() => setSelectedCharacterIds((current) => current.includes(character.id) ? current.filter((id) => id !== character.id) : current.length < 3 ? [...current, character.id] : current)} /> {character.name} Lv {character.level}</label></li>)}</ul>
          <button className="btn" onClick={() => setPage('setup')}>Start Campaign</button>
        </>}
        {page === 'setup' && <Stages stage={stage} onStartStage={handleStartStage} />}
        {page === 'encounter' && <Battle initialCharacters={characters} initialMonsters={encounter} onBattleEnd={handleBattleEnd} />}
        {page === 'reward' && <>
          <h2>Stage {stage} Complete</h2>
          <p>How to play: review the rewards from this victory, then continue to the next stage. Your party recovers HP and MP before the next encounter.</p>
          <p>Your characters leveled up. Items acquired:</p>
          <ul>{rewardItems.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
          <button className="btn" onClick={nextStage}>Continue to Stage {stage + 1}</button>
        </>}
        {page === 'gameover' && <>
          <h2>Game Over</h2><p>How to play: all characters were defeated. Return to the main page to create or load a new campaign.</p>
          <button className="btn" onClick={() => setPage('start')}>Return to Main Page</button>
        </>}
        {page === 'winner' && <>
          <h2>Campaign Complete</h2><p>How to play: you defeated the boss and completed all four stages. Review your final rewards, then return to the main page.</p>
          <p>Items acquired:</p><ul>{rewardItems.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
          <button className="btn" onClick={() => setPage('start')}>Return to Main Page</button>
        </>}
      </main>
    </div>
  )
}
