// Verifies fallback data, turn resolution, and level-based character progression.
import { describe, expect, it, beforeEach } from 'vitest'
import { defaultBestiary, defaultCharacters } from '../data/seeds'
import { createBattleState, postBattleRewards, resolveEnemyTurn, resolvePlayerTurn } from '../systems/combat'
import { initializeDefaults, loadBestiary } from '../utils/storage'

function installLocalStorage() {
  const values = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size }
  } as Storage
}

describe('bestiary fallback data', () => {
  beforeEach(installLocalStorage)

  it('contains three bosses and two minions', () => {
    const monsters = defaultBestiary().monsters
    expect(monsters.filter((monster) => monster.kind === 'boss')).toHaveLength(3)
    expect(monsters.filter((monster) => monster.id.startsWith('minion-'))).toHaveLength(2)
  })

  it('adds missing fallback entries to an existing bestiary', () => {
    localStorage.setItem('rpg.bestiary', JSON.stringify({ monsters: [{ ...defaultBestiary().monsters[0] }] }))
    initializeDefaults()
    const monsters = loadBestiary().monsters
    expect(monsters.some((monster) => monster.id === 'b-1')).toBe(true)
    expect(monsters.some((monster) => monster.id === 'minion-1')).toBe(true)
    expect(monsters.some((monster) => monster.id === 'minion-2')).toBe(true)
  })
})

describe('turn-based combat', () => {
  it('resolves a single action for a character turn', () => {
    const players = defaultCharacters()
    const state = createBattleState(players, [defaultBestiary().monsters[0]])
    const next = resolvePlayerTurn(state, { [players[0].id]: { type: 'attack', targetId: 'm-1' } })
    expect(next.phase).toBe('enemies')
    expect(next.monsters[0].hp).toBeLessThan(30)
  })

  it('uses a stored attack pattern without an API key', async () => {
    const players = defaultCharacters()
    const monster = defaultBestiary().monsters.find((entry) => entry.id === 'm-1')!
    const state = createBattleState(players, [monster])
    const result = await resolveEnemyTurn(state)
    expect(result.usedFallback).toBe(true)
    expect(result.state.logs.some((entry) => entry.text.includes('Goblin attacks Mira'))).toBe(true)
  })

  it('grants four skills at level two and five at level three', () => {
    const players = defaultCharacters()
    const levelTwo = postBattleRewards('players', players).players
    expect(levelTwo).toHaveLength(3)
    expect(levelTwo.every((player) => player.skills.length === 4)).toBe(true)
    const levelThree = postBattleRewards('players', levelTwo).players
    expect(levelThree.every((player) => player.level === 3 && player.skills.length === 5)).toBe(true)
  })
})
