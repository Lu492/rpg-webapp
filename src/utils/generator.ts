import { Character, Skill, Stats } from '../models'
import { callOpenAIChat } from '../services/ai'
import { loadAiProvider } from './storage'

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const SKILL_POOL: Skill[] = [
  { id: 's1', name: 'Power Strike', description: 'A powerful physical attack.', formula: 'stamina x 2 + dexterity, x1.6', active: true },
  { id: 's2', name: 'Rapid Shot', description: 'A quick ranged attack.', formula: 'stamina x 2 + dexterity, x1.1', active: true },
  { id: 's3', name: 'Mind Shield', description: 'A focused defensive strike.', formula: 'stamina x 2 + dexterity, x0.8', active: true },
  { id: 's4', name: 'Healing Thought', description: 'Restores health to the character.', formula: 'empathy x 3', active: true },
  { id: 's5', name: 'Sneak', description: 'A precise attack from the shadows.', formula: 'stamina x 2 + dexterity', active: true },
  { id: 's6', name: 'Taunt', description: 'An attack that draws enemy attention.', formula: 'stamina x 2 + dexterity', active: true },
  { id: 's7', name: 'Fortify', description: 'A sturdy defensive attack.', formula: 'stamina x 2 + dexterity', active: true }
]

function pickSkills(count: number): Skill[] {
  const pool = [...SKILL_POOL]
  const picked: Skill[] = []
  while (picked.length < count && pool.length) {
    const i = randInt(0, pool.length - 1)
    picked.push(pool.splice(i, 1)[0])
  }
  return picked
}

function skillsForLevel(level: 1 | 2 | 3, skills: Skill[]) {
  const count = level === 1 ? 2 : level === 2 ? 4 : 5
  const active = skills.filter((skill) => skill.active).slice(0, count)
  return [...active, ...pickSkills(count - active.length)].map((skill) => ({ ...skill, active: true }))
}

function computeHP(stats: Stats, level: number) {
  return stats.stamina * 12 + level * 10
}

function computeMP(stats: Stats, level: number) {
  return stats.intelligence * 12 + stats.empathy * 6 + level * 5
}

function randomName() {
  const syllables = ['an', 'el', 'ar', 'vi', 'do', 'ma', 'ri', 'th', 'zu', 'ka']
  const a = syllables[randInt(0, syllables.length - 1)]
  const b = syllables[randInt(0, syllables.length - 1)]
  return (a + b).replace(/(^.|\s.)/g, (s) => s.toUpperCase())
}

async function aiParseCharacter(description: string, apiKey: string) {
  const prompt = `Create a single JSON object for an RPG character with keys: name (string), level (1-3), stats (stamina,dexterity,intelligence,empathy each 1-10), skills (array of objects with id,name,active boolean). Reply only with the JSON object bounded by the markers JSON_START and JSON_END. Description: ${description}`
  const txt = await callOpenAIChat(prompt, apiKey, loadAiProvider())
  // extract JSON between markers first
  const markerMatch = txt.match(/JSON_START([\s\S]*?)JSON_END/)
  const candidate = markerMatch ? markerMatch[1] : txt
  // try parse JSON inside response
  const jsonMatch = candidate.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      // fallthrough to null
    }
  }
  return null
}

export async function generateCharacters(descriptions: string[]): Promise<Character[]> {
  const apiKey = localStorage.getItem('ai_api_key') || undefined
  const results: Character[] = []

  for (let i = 0; i < 3; i++) {
    const desc = (descriptions[i] || '').trim()
    let name = ''
    let level = 1 as 1 | 2 | 3
    let stats: Stats = { stamina: 5, dexterity: 5, intelligence: 5, empathy: 5 }
    let skills: Skill[] = []

    if (desc && apiKey) {
      try {
        const parsed = await aiParseCharacter(desc, apiKey)
        if (parsed) {
          name = parsed.name || `Char ${i + 1}`
          level = 1
          stats = parsed.stats || stats
          skills = (parsed.skills || []).map((s: any, idx: number) => ({ id: s.id || `ai-${i}-${idx}`, name: s.name || 'Skill', description: s.description || 'An active character skill.', formula: s.formula || 'Base damage + skill modifier', active: s.active !== false }))
        }
      } catch (e) {
        // ignore ai failure
      }
    }

    if (!name) {
      name = desc ? (desc.split(' ')[0].slice(0, 12) + randomName().slice(0, 3)) : randomName()
    }

    if (skills.length === 0) {
      skills = skillsForLevel(level, skills)
    }

    skills = skillsForLevel(level, skills)

    // if stats are default (5) and no AI provided, randomize
    if (!apiKey || !desc) {
      stats = {
        stamina: randInt(3, 10),
        dexterity: randInt(3, 10),
        intelligence: randInt(3, 10),
        empathy: randInt(1, 10)
      }
    }

    const hp = computeHP(stats, level)
    const mp = computeMP(stats, level)

    const char: Character = {
      id: `c-${Date.now()}-${i}`,
      name,
      level,
      stats,
      skills,
      hp,
      mp,
      inventory: []
    }

    results.push(char)
  }

  return results
}
