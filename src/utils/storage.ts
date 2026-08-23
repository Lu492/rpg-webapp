import { Character, Bestiary, Item } from '../models'
import { defaultCharacters, defaultBestiary, defaultItems } from '../data/seeds'

const PREFIX = 'rpg.'

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
      while (skills.length < skillCount) {
        skills.push({ id: `stored-${character.id}-${skills.length}`, name: `Skill ${skills.length + 1}`, active: true })
      }
      return { ...character, level: character.level || 1, skills }
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
    return JSON.parse(raw)
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
  if (!localStorage.getItem(PREFIX + 'bestiary')) {
    saveBestiary(defaultBestiary())
  }
  if (!localStorage.getItem(PREFIX + 'inventory')) {
    saveInventory(defaultItems())
  }
}
