import { Character, Bestiary, Item, CharacterVersion, Skill } from '../models'
import { defaultCharacters, defaultBestiary, defaultItems } from '../data/seeds'

const PREFIX = 'rpg.'

function makeVersions(character: Character): CharacterVersion[] {
  const sourceSkills = (character.skills || []).filter((skill) => skill.active)
  return ([1, 2, 3] as const).map((level) => {
    const count = level === 1 ? 2 : level === 2 ? 4 : 5
    const skills: Skill[] = sourceSkills.slice(0, count).map((skill) => ({ ...skill, active: true }))
    while (skills.length < count) skills.push({ id: `version-${character.id}-${level}-${skills.length}`, name: 'Basic Attack', description: 'Deal physical damage to one enemy.', formula: 'stamina x 2 + dexterity', target: 'enemy', effect: 'damage', mpCost: 0, active: true })
    return {
      level,
      stats: { ...character.stats },
      skills,
      hp: character.stats.stamina * 12 + level * 10,
      mp: character.stats.intelligence * 12 + character.stats.empathy * 6 + level * 5
    }
  })
}

export function saveCharacters(chars: Character[]) {
  localStorage.setItem(PREFIX + 'characters', JSON.stringify(chars))
}

export function loadCharacters(): Character[] {
  const raw = localStorage.getItem(PREFIX + 'characters')
  if (!raw) return []
  try {
    return (JSON.parse(raw) as Character[]).map((character) => {
      const skillCount = character.level === 1 ? 2 : character.level === 2 ? 4 : 5
      const skills = (character.skills || []).filter((skill) => skill.active).slice(0, skillCount)
      return { ...character, level: character.level || 1, skills, versions: character.versions || makeVersions({ ...character, skills }) }
    })
  } catch (e) {
    return []
  }
}

export function saveBestiary(b: Bestiary) {
  localStorage.setItem(PREFIX + 'bestiary', JSON.stringify(b))
}

export function loadBestiary(): Bestiary {
  const raw = localStorage.getItem(PREFIX + 'bestiary')
  if (!raw) return { monsters: [] }
  try {
    const bestiary = JSON.parse(raw) as Bestiary
    const normalized = {
      monsters: bestiary.monsters.map((monster) => ({
        ...monster,
        kind: monster.kind || (monster.id.startsWith('b-') ? 'boss' : monster.id.startsWith('minion-') ? 'minion' : 'monster')
      }))
    }
    return normalized
  } catch (e) {
    return { monsters: [] }
  }
}

export function saveInventory(items: Item[]) {
  localStorage.setItem(PREFIX + 'inventory', JSON.stringify(items))
}

export function loadInventory(): Item[] {
  const raw = localStorage.getItem(PREFIX + 'inventory')
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

export function saveApiKey(key: string) {
  localStorage.setItem(PREFIX + 'ai_api_key', key)
}

export function loadApiKey(): string | null {
  return localStorage.getItem(PREFIX + 'ai_api_key')
}

export type AiProvider = 'openai' | 'deepseek'

export function saveAiProvider(provider: AiProvider) {
  localStorage.setItem(PREFIX + 'ai_provider', provider)
}

export function loadAiProvider(): AiProvider {
  return localStorage.getItem(PREFIX + 'ai_provider') === 'deepseek' ? 'deepseek' : 'openai'
}

export function initializeDefaults() {
  // ensure characters
  if (!localStorage.getItem(PREFIX + 'characters')) {
    saveCharacters(defaultCharacters())
  }
  const storedBestiary = loadBestiary()
  const seededBestiary = defaultBestiary()
  const existingIds = new Set(storedBestiary.monsters.map((monster) => monster.id))
  const missingFallbacks = seededBestiary.monsters.filter((monster) => !existingIds.has(monster.id))
  if (!localStorage.getItem(PREFIX + 'bestiary') || missingFallbacks.length) {
    saveBestiary({ monsters: [...storedBestiary.monsters, ...missingFallbacks] })
  }
  if (!localStorage.getItem(PREFIX + 'inventory')) {
    saveInventory(defaultItems())
  }
}
