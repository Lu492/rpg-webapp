// Renders one encounter and collects exactly one action per living character each turn.
import React, { useState } from 'react'
import { Character, Monster } from '../models'
import { loadApiKey, loadBestiary, loadCharacters, saveCharacters } from '../utils/storage'
import {
  createBattleState,
  InteractiveBattleState,
  PlayerAction,
  postBattleRewards,
  resolveEnemyTurn,
  resolvePlayerTurn
} from '../systems/combat'

type BattleProps = {
  initialCharacters?: Character[]
  initialMonsters?: Monster[]
  onBattleEnd?: (winner: 'players' | 'monsters', players: Character[], items: import('../models').Item[]) => void
}

export default function Battle({ initialCharacters, initialMonsters, onBattleEnd }: BattleProps) {
  const [chars] = useState<Character[]>(() => initialCharacters || loadCharacters())
  const [bestiary] = useState(() => loadBestiary())
  const [state, setState] = useState<InteractiveBattleState | null>(() => initialMonsters?.length ? createBattleState(chars, initialMonsters) : null)
  const [stageMonsters, setStageMonsters] = useState<Monster[]>(() => initialMonsters || [])
  const [actions, setActions] = useState<Record<string, PlayerAction>>({})
  const [toast, setToast] = useState('')
  const [infoSkill, setInfoSkill] = useState<string | null>(null)
  const hasApiKey = Boolean(loadApiKey())

  function pickRandomMonsters() {
    const count = Math.max(1, Math.floor(Math.random() * 6) + 1)
    setStageMonsters(Array.from({ length: count }, (_, i) => ({
      id: `rm-${Date.now()}-${i}`,
      name: `Grunt ${i + 1}`,
      level: 1,
      stats: { stamina: 3 },
      hp: 20 + Math.floor(Math.random() * 40),
      mp: 0,
      skills: [],
      attackPattern: 'random' as const
    })))
  }

  function startBattle() {
    if (!chars.length || !stageMonsters.length) {
      setToast('Choose characters and at least one monster first.')
      return
    }
    setToast('')
    setActions({})
    setState(createBattleState(chars, stageMonsters))
  }

  function chooseAction(player: Character, type: PlayerAction['type'], skillId?: string) {
    const target = state?.monsters.find((monster) => monster.hp > 0)
    if (!target) return
    setActions((current) => ({ ...current, [player.id]: { type, targetId: target.id, skillId } }))
  }

  function submitPlayerTurn() {
    if (!state) return
    const living = state.players.filter((player) => player.hp > 0)
    if (living.some((player) => !actions[player.id])) {
      setToast('Choose an action for every living character.')
      return
    }
    setToast('')
    setState(resolvePlayerTurn(state, actions))
    setActions({})
  }

  async function submitEnemyTurn() {
    if (!state || state.phase !== 'enemies') return
    const result = await resolveEnemyTurn(state, loadApiKey() || undefined)
    if (result.usedFallback) setToast('AI connection not found. Monsters are following their stored attack patterns.')
    setState(result.state)
  }

  function finishBattle() {
    if (!state || (state.phase !== 'won' && state.phase !== 'lost')) return
    if (state.phase === 'won') {
      const reward = postBattleRewards('players', state.players)
      saveCharacters(reward.players)
      onBattleEnd?.('players', reward.players, reward.items)
    } else onBattleEnd?.('monsters', state.players, [])
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Turn-Based Battle</h3>
      <p>How to play: choose exactly one action for each living character, then resolve the character turn. Resolve the enemy turn once, and repeat until victory or defeat.</p>
      {toast && <div role="status" style={{ padding: 10, marginBottom: 10, background: '#5b3a12', borderRadius: 8 }}>{toast}</div>}
      {!state && !initialMonsters?.length && <>
        <div className="row">
          <button className="btn" disabled={!hasApiKey} onClick={pickRandomMonsters}>Create Random Monsters{!hasApiKey ? ' (API key required)' : ''}</button>
          <button className="btn" onClick={() => setStageMonsters(bestiary.monsters.slice(0, 3))}>Use Bestiary</button>
        </div>
        <div style={{ marginTop: 8 }}><strong>Monsters:</strong> {stageMonsters.map((monster) => monster.name).join(', ') || 'none selected'}</div>
        <button className="btn" style={{ marginTop: 8 }} onClick={startBattle}>Start Battle</button>
      </>}

      {state && <>
        <p>Turn {state.turn} · Phase: {state.phase}</p>
        {state.phase === 'players' && state.players.map((player) => player.hp > 0 && (
          <div key={player.id} style={{ borderTop: '1px solid rgba(255,255,255,.12)', padding: '10px 0' }}>
            <strong>{player.name}</strong> Lv {player.level} | HP {player.hp} / MP {player.mp} | STA {player.stats.stamina} | DEX {player.stats.dexterity} | INT {player.stats.intelligence} | EMP {player.stats.empathy}
            <div className="row">
              <button className="btn" onClick={() => chooseAction(player, 'attack')}>Attack</button>
              {player.skills.filter((skill) => skill.active).map((skill) => (
                <span key={skill.id} style={{ display: 'inline-flex', gap: 4, flex: 1 }}><button className="btn" onClick={() => chooseAction(player, 'skill', skill.id)}>{skill.name}</button><button type="button" className="btn" style={{ flex: 0 }} aria-label={`Info for ${skill.name}`} onClick={() => setInfoSkill(infoSkill === skill.id ? null : skill.id)}>i</button></span>
              ))}
              <button className="btn" onClick={() => chooseAction(player, 'defend')}>Defend</button>
            </div>
            <small>{actions[player.id] ? `Chosen: ${actions[player.id].type}` : 'Choose an action'}</small>
            {player.skills.filter((skill) => skill.id === infoSkill).map((skill) => <div key={skill.id} role="dialog"><strong>{skill.name}</strong>: {skill.description || 'Active skill'} Formula: {skill.formula || 'Base damage plus skill modifier.'}</div>)}
          </div>
        ))}
        <div><strong>Enemies:</strong> {state.monsters.map((monster) => `${monster.name} HP ${monster.hp}`).join(' · ')}</div>
        {state.phase === 'players' && <button className="btn" style={{ marginTop: 10 }} onClick={submitPlayerTurn}>Resolve Character Turns</button>}
        {state.phase === 'enemies' && <button className="btn" style={{ marginTop: 10 }} onClick={submitEnemyTurn}>Resolve Enemy Turns</button>}
        {(state.phase === 'won' || state.phase === 'lost') && <button className="btn" style={{ marginTop: 10 }} onClick={finishBattle}>Finish Battle</button>}
        <div style={{ marginTop: 12, maxHeight: 240, overflow: 'auto' }}>
          {state.logs.map((entry, index) => <div key={index}>{entry.turn}: {entry.text}</div>)}
        </div>
      </>}
    </div>
  )
}
