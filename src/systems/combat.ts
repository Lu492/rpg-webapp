import { Character, Monster, Skill, Stats, Item, StatusEffect } from '../models'
import { callOpenAIChat } from '../services/ai'
import { loadAiProvider } from '../utils/storage'

function cloneChars(chars: Character[]) {
  return chars.map((c) => ({ ...c, hp: c.hp, mp: c.mp, statusEffects: c.statusEffects?.map((status) => ({ ...status })) }))
}

function cloneMonsters(ms: Monster[]) {
  return ms.map((m) => ({ ...m, statusEffects: m.statusEffects?.map((status) => ({ ...status })) }))
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function skillDamageMultiplier(skill?: Skill) {
  if (!skill) return 1
  if (skill.power !== undefined) return skill.power
  const name = skill.name.toLowerCase()
  if (name.includes('power')) return 1.6
  if (name.includes('rapid')) return 1.1
  if (name.includes('mind')) return 0.8
  if (name.includes('healing')) return 0
  return 1
}

function computeCharAttackDamage(c: Character, skill?: Skill) {
  const base = c.stats.stamina * 2 + c.stats.dexterity
  const mult = skillDamageMultiplier(skill)
  return Math.max(1, Math.round(base * mult + randInt(-3, 6)))
}

function computeMonsterAttackDamage(m: Monster) {
  const base = (m.stats.stamina || 3) * 1.6 + (m.stats.dexterity || 2)
  return Math.max(1, Math.round(base + randInt(-2, 5)))
}

export type PlayerAction = { type: 'attack' | 'skill' | 'defend'; targetId: string; skillId?: string }
export type EnemyAction = { targetId: string; skillId?: string }
export type InteractiveBattleState = {
  players: Character[]
  monsters: Monster[]
  turn: number
  phase: 'players' | 'enemies' | 'won' | 'lost'
  logs: BattleLog
}

function addStateLog(state: InteractiveBattleState, text: string) {
  state.logs = [...state.logs, { turn: state.turn, text }]
}

function skillTarget(skill: Skill): 'enemy' | 'ally' | 'self' {
  if (skill.target) return skill.target
  const name = skill.name.toLowerCase()
  return name.includes('heal') || name.includes('shield') || name.includes('fortify') ? 'self' : 'enemy'
}

function skillEffect(skill: Skill): 'damage' | 'heal' | 'shield' | 'confuse' {
  if (skill.effect) return skill.effect
  const name = skill.name.toLowerCase()
  if (name.includes('heal')) return 'heal'
  if (name.includes('shield') || name.includes('fortify')) return 'shield'
  return 'damage'
}

function addStatus(target: Character | Monster, status: StatusEffect) {
  target.statusEffects = [...(target.statusEffects || []).filter((entry) => entry.id !== status.id), status]
}

function hasStatus(target: Character | Monster, id: StatusEffect['id']) {
  return (target.statusEffects || []).some((status) => status.id === id && status.remainingTurns > 0)
}

function advanceStatuses(target: Character | Monster) {
  target.statusEffects = (target.statusEffects || [])
    .map((status) => ({ ...status, remainingTurns: status.remainingTurns - 1 }))
    .filter((status) => status.remainingTurns > 0)
}

function applySkill(state: InteractiveBattleState, player: Character, skill: Skill, target: Character | Monster) {
  const effect = skillEffect(skill)
  if (effect === 'heal' && 'inventory' in target) {
    const amount = Math.max(4, player.stats.empathy * 3)
    target.hp = Math.min(target.stats.stamina * 12 + target.level * 10, target.hp + amount)
    addStateLog(state, `${player.name} uses ${skill.name} on ${target.name} and restores ${amount} HP`)
    return
  }
  if (effect === 'shield') {
    addStatus(target, { id: 'shielded', name: 'Shielded', kind: 'positive', remainingTurns: 2, potency: skill.power || 0.5 })
    addStateLog(state, `${player.name} uses ${skill.name}: ${target.name} is Shielded`)
    return
  }
  let damage = computeCharAttackDamage(player, skill)
  if (hasStatus(target, 'shielded')) damage = Math.max(1, Math.round(damage * 0.5))
  target.hp = Math.max(0, target.hp - damage)
  addStateLog(state, `${player.name} uses ${skill.name} on ${target.name} for ${damage} damage`)
  if (effect === 'confuse' && target.hp > 0) {
    addStatus(target, { id: 'confused', name: 'Confused', kind: 'negative', remainingTurns: 1 })
    addStateLog(state, `${target.name} is Confused`)
  }
}

export function createBattleState(players: Character[], monsters: Monster[]): InteractiveBattleState {
  const state: InteractiveBattleState = {
    players: cloneChars(players).map((p) => ({ ...p, skills: [...p.skills] })),
    monsters: cloneMonsters(monsters).map((m) => ({ ...m, skills: [...m.skills] })),
    turn: 1,
    phase: 'players',
    logs: []
  }
  addStateLog(state, `Turn 1: choose an action for every living character`)
  return state
}

export function resolvePlayerTurn(state: InteractiveBattleState, actions: Record<string, PlayerAction>) {
  const next = { ...state, players: state.players.map((p) => ({ ...p })), monsters: state.monsters.map((m) => ({ ...m })), logs: [...state.logs] }
  for (const player of next.players) {
    if (player.hp <= 0) continue
    const action = actions[player.id]
    if (!action) continue
    if (action.type === 'defend') {
      addStatus(player, { id: 'shielded', name: 'Shielded', kind: 'positive', remainingTurns: 1, potency: 0.5 })
      addStateLog(next, `${player.name} guards until the next turn`)
      continue
    }
    const skill = action.type === 'skill' ? player.skills.find((s) => s.id === action.skillId && s.active) : undefined
    const targetKind = skill ? skillTarget(skill) : 'enemy'
    const pool = targetKind === 'enemy' ? next.monsters : next.players
    const target = targetKind === 'self' ? player : pool.find((entry) => entry.id === action.targetId && entry.hp > 0) || pool.find((entry) => entry.hp > 0)
    if (!target) continue
    if (hasStatus(player, 'confused') && Math.random() < 0.5) {
      addStateLog(next, `${player.name} is Confused and loses the action`)
      continue
    }
    if (skill) {
      applySkill(next, player, skill, target)
      continue
    }
    let damage = computeCharAttackDamage(player, skill)
    if (hasStatus(target, 'shielded')) damage = Math.max(1, Math.round(damage * 0.5))
    target.hp = Math.max(0, target.hp - damage)
    addStateLog(next, `${player.name} uses ${skill ? skill.name : 'Attack'} on ${target.name} for ${damage} damage`)
  }
  if (!next.monsters.some((m) => m.hp > 0)) next.phase = 'won'
  else next.phase = 'enemies'
  return next
}

function fallbackEnemyAction(monster: Monster, players: Character[]): EnemyAction {
  const living = players.filter((p) => p.hp > 0)
  const pattern = monster.attackPattern || 'random'
  const target = pattern === 'focus-lowest-hp'
    ? living.reduce((lowest, player) => (player.hp < lowest.hp ? player : lowest), living[0])
    : pattern === 'focus-weakest'
      ? living.reduce((lowest, player) => (player.stats.stamina < lowest.stats.stamina ? player : lowest), living[0])
      : living[randInt(0, living.length - 1)]
  return { targetId: target.id }
}

export async function chooseEnemyAction(monster: Monster, players: Character[], apiKey?: string): Promise<{ action: EnemyAction; usedFallback: boolean }> {
  if (!apiKey) return { action: fallbackEnemyAction(monster, players), usedFallback: true }
  try {
    const prompt = `Choose one target for ${monster.name} in an RPG battle. Living players: ${players.filter((p) => p.hp > 0).map((p) => `${p.id}:${p.name}:${p.hp}`).join(', ')}. Reply only with JSON: {"targetId":"player id"}`
    const response = await callOpenAIChat(prompt, apiKey, loadAiProvider())
    const match = response.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) as EnemyAction : undefined
    if (!parsed?.targetId || !players.some((p) => p.id === parsed.targetId && p.hp > 0)) throw new Error('Invalid enemy action')
    return { action: parsed, usedFallback: false }
  } catch {
    return { action: fallbackEnemyAction(monster, players), usedFallback: true }
  }
}

export async function resolveEnemyTurn(state: InteractiveBattleState, apiKey?: string) {
  const next = { ...state, players: state.players.map((p) => ({ ...p })), monsters: state.monsters.map((m) => ({ ...m })), logs: [...state.logs] }
  let usedFallback = false
  for (const monster of next.monsters) {
    if (monster.hp <= 0) continue
    const living = next.players.filter((p) => p.hp > 0)
    if (!living.length) break
    const choice = await chooseEnemyAction(monster, next.players, apiKey)
    usedFallback = usedFallback || choice.usedFallback
    const target = next.players.find((p) => p.id === choice.action.targetId && p.hp > 0) || living[0]
    if (hasStatus(monster, 'confused') && Math.random() < 0.5) {
      addStateLog(next, `${monster.name} is Confused and misses its turn`)
      continue
    }
    let damage = computeMonsterAttackDamage(monster)
    if (hasStatus(target, 'shielded')) damage = Math.max(1, Math.round(damage * 0.5))
    target.hp = Math.max(0, target.hp - damage)
    addStateLog(next, `${monster.name} attacks ${target.name} for ${damage} damage`)
  }
  next.players.forEach(advanceStatuses)
  next.monsters.forEach(advanceStatuses)
  if (!next.players.some((p) => p.hp > 0)) next.phase = 'lost'
  else {
    next.turn += 1
    next.phase = 'players'
    addStateLog(next, `Turn ${next.turn}: choose an action for every living character`)
  }
  return { state: next, usedFallback }
}

export type BattleLog = { turn: number; text: string }[]

export function runBattle(players: Character[], monsters: Monster[], onRound?: (log: BattleLog) => void) {
  const party = cloneChars(players)
  const foes = cloneMonsters(monsters)
  const logs: BattleLog = []
  let turn = 1

  function addLog(text: string) {
    logs.push({ turn, text })
    if (onRound) onRound(logs.slice())
  }

  addLog(`Battle start: ${party.length} vs ${foes.length}`)

  while (turn < 200) {
    // players act
    for (const p of party) {
      if (p.hp <= 0) continue
      const aliveFoes = foes.filter((f) => f.hp > 0)
      if (!aliveFoes.length) break
      const target = aliveFoes[randInt(0, aliveFoes.length - 1)]
      const skill = p.skills && p.skills.length ? p.skills[randInt(0, p.skills.length - 1)] : undefined
      const dmg = computeCharAttackDamage(p, skill)
      target.hp = Math.max(0, (target.hp || 0) - dmg)
      addLog(`${p.name} uses ${skill ? skill.name : 'attack'} on ${target.name} for ${dmg} dmg (hp ${target.hp})`)
    }

    // check victory
    if (!foes.some((f) => f.hp > 0)) {
      addLog('Players win the battle')
      return { winner: 'players', logs, players: party, monsters: foes }
    }

    // monsters act
    for (const m of foes) {
      if (m.hp <= 0) continue
      const alivePlayers = party.filter((p) => p.hp > 0)
      if (!alivePlayers.length) break
      const target = alivePlayers[randInt(0, alivePlayers.length - 1)]
      const dmg = computeMonsterAttackDamage(m)
      target.hp = Math.max(0, target.hp - dmg)
      addLog(`${m.name} hits ${target.name} for ${dmg} dmg (hp ${target.hp})`)
    }

    // check defeat
    if (!party.some((p) => p.hp > 0)) {
      addLog('All players defeated — Game Over')
      return { winner: 'monsters', logs, players: party, monsters: foes }
    }

    turn += 1
  }

  addLog('Battle ended in a draw')
  return { winner: 'draw', logs, players: party, monsters: foes }
}

export function postBattleRewards(winner: 'players' | 'monsters' | 'draw', players: Character[]): { players: Character[]; items: Item[] } {
  const items: Item[] = []
  if (winner !== 'players') return { players, items }

  const nextPlayers = players.map((p) => {
    const nk = { ...p }
    // level up by 1 when winning a stage until max 3
    if (nk.level < 3) {
      nk.level = (nk.level + 1) as 1 | 2 | 3
      const targetSkillCount = nk.level === 2 ? 4 : 5
      const skills = [...nk.skills]
      while (skills.length < targetSkillCount) skills.push({ id: `g-${Date.now()}-${skills.length}`, name: 'Training Strike', description: 'Deal physical damage to one enemy.', formula: 'stamina x 2 + dexterity', target: 'enemy', effect: 'damage', mpCost: 0, active: true })
      nk.skills = skills.slice(0, targetSkillCount).map((skill) => ({ ...skill, active: true }))
    }
    // recompute hp/mp full
    nk.hp = Math.max(1, nk.stats.stamina * 12 + nk.level * 10)
    nk.mp = Math.max(0, nk.stats.intelligence * 12 + nk.stats.empathy * 6 + nk.level * 5)

    // reward item
    const it: Item = { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: `Mystery Trinket`, statBoost: { stamina: 1 } }
    nk.inventory = [...(nk.inventory || []), it]
    items.push(it)

    return nk
  })

  return { players: nextPlayers, items }
}
