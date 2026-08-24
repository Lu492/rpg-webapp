import { Character, CharacterVersion, Monster, Skill, Stats } from '../models'
import { callOpenAIChat } from '../services/ai'
import { loadAiProvider, loadApiKey } from './storage'

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const SKILL_POOL: Skill[] = [
  { id: 's1', name: 'Power Strike', description: 'Deal heavy physical damage to one enemy.', formula: 'stamina x 2 + dexterity, x1.6', active: true, target: 'enemy', effect: 'damage', power: 1.6, mpCost: 4 },
  { id: 's2', name: 'Rapid Shot', description: 'Deal quick physical damage to one enemy.', formula: 'stamina x 2 + dexterity, x1.1', active: true, target: 'enemy', effect: 'damage', power: 1.1, mpCost: 2 },
  { id: 's3', name: 'Mind Shield', description: 'Protect one ally, reducing incoming damage for 2 turns.', formula: '50% damage reduction for 2 turns', active: true, target: 'ally', effect: 'shield', power: 0.5, mpCost: 5 },
  { id: 's4', name: 'Healing Thought', description: 'Restore HP to one ally.', formula: 'empathy x 3', active: true, target: 'ally', effect: 'heal', mpCost: 6 },
  { id: 's5', name: 'Sneak Attack', description: 'Strike one enemy with precise physical damage.', formula: 'stamina x 2 + dexterity', active: true, target: 'enemy', effect: 'damage', mpCost: 3 },
  { id: 's6', name: 'Disorienting Taunt', description: 'Damage one enemy and give it a chance to lose its next action.', formula: 'stamina x 2 + dexterity plus Confused for 1 turn', active: true, target: 'enemy', effect: 'confuse', mpCost: 5 },
  { id: 's7', name: 'Fortify', description: 'Protect yourself, reducing incoming damage for 2 turns.', formula: '50% damage reduction for 2 turns', active: true, target: 'self', effect: 'shield', power: 0.5, mpCost: 4 },
  { id: 's8', name: 'Cinder Bolt', description: 'Blast one enemy with focused magical damage.', formula: 'intelligence x 3', active: true, target: 'enemy', effect: 'damage', power: 1.4, mpCost: 7 },
  { id: 's9', name: 'Battle Cry', description: 'Shield the whole party for 1 turn.', formula: '50% damage reduction for 1 turn', active: true, target: 'ally', effect: 'shield', power: 0.5, mpCost: 8 }
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
  const prompt = `Create a single JSON object for a turn-based JRPG party character. Return name, level (1-3), stats (stamina,dexterity,intelligence,empathy each 1-10), and 2-5 skills. Every skill must have name, description, formula, active, target (enemy, ally, or self), effect (damage, heal, shield, or confuse), and mpCost (1-20). Include a mix of roles such as damage, healing, defense, and status control when appropriate. Never use placeholder names like Skill 1 or New Skill. Reply only with JSON between JSON_START and JSON_END. Description: ${description}`
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
  const apiKey = loadApiKey() || undefined
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
          skills = (parsed.skills || []).map((s: any, idx: number) => ({ ...SKILL_POOL[idx % SKILL_POOL.length], id: s.id || `ai-${i}-${idx}`, name: s.name || SKILL_POOL[idx % SKILL_POOL.length].name, description: s.description || SKILL_POOL[idx % SKILL_POOL.length].description, formula: s.formula || SKILL_POOL[idx % SKILL_POOL.length].formula, target: s.target || SKILL_POOL[idx % SKILL_POOL.length].target, effect: s.effect || SKILL_POOL[idx % SKILL_POOL.length].effect, mpCost: Number.isFinite(s.mpCost) ? s.mpCost : SKILL_POOL[idx % SKILL_POOL.length].mpCost, active: s.active !== false }))
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
    const versions: CharacterVersion[] = ([1, 2, 3] as const).map((versionLevel) => ({
      level: versionLevel,
      stats: { ...stats },
      skills: skillsForLevel(versionLevel, skills),
      hp: computeHP(stats, versionLevel),
      mp: computeMP(stats, versionLevel)
    }))

    const char: Character = {
      id: `c-${Date.now()}-${i}`,
      name,
      level,
      stats,
      skills,
      hp,
      mp,
      inventory: [],
      versions
    }

    results.push(char)
  }

  return results
}

const MONSTER_SKILLS: Skill[] = [
  { id: 'monster-bite', name: 'Rending Bite', description: 'Deal physical damage to one hero.', formula: 'stamina x 2 + dexterity', target: 'enemy', effect: 'damage', active: true, mpCost: 0 },
  { id: 'monster-hex', name: 'Dread Hex', description: 'Damage one hero and give them a chance to lose their next action.', formula: 'intelligence x 2 plus Confused for 1 turn', target: 'enemy', effect: 'confuse', active: true, mpCost: 6 },
  { id: 'monster-guard', name: 'Hardened Hide', description: 'Reduce incoming damage for 2 turns.', formula: '50% damage reduction for 2 turns', target: 'self', effect: 'shield', power: 0.5, active: true, mpCost: 4 }
]

export async function generateMonsters(stage: number, count: number): Promise<Monster[]> {
  const apiKey = loadApiKey() || undefined
  let parsed: any[] = []
  if (apiKey) {
    try {
      const prompt = `Create ${count} distinct enemies for a turn-based JRPG encounter at stage ${stage}. Return a JSON array. Each object needs a memorable original name, level, stats (stamina,dexterity,intelligence), hp, mp, kind (monster, minion, or boss), attackPattern (focus-weakest, focus-lowest-hp, or random), and 2-3 skills. Each skill needs name, description, formula, target (enemy or self), effect (damage, shield, or confuse), and mpCost. Make roles varied: bruiser, caster, defender, or controller. Never use Generated Monster, Monster 1, or placeholder names.`
      const text = await callOpenAIChat(prompt, apiKey, loadAiProvider())
      const match = text.match(/\[[\s\S]*\]/)
      if (match) parsed = JSON.parse(match[0])
    } catch {
      parsed = []
    }
  }
  return Array.from({ length: count }, (_, index) => {
    const entry = parsed[index] || {}
    const kind = stage === 4 ? (index === 0 ? 'boss' : 'minion') : 'monster'
    const fallbackNames = ['Ashfang', 'Mire Stalker', 'Ironback', 'Gloom Witch', 'Rift Hound', 'Thorn Revenant']
    const skills = Array.isArray(entry.skills) && entry.skills.length ? entry.skills.map((skill: any, skillIndex: number) => ({ ...MONSTER_SKILLS[skillIndex % MONSTER_SKILLS.length], ...skill, id: skill.id || `monster-skill-${Date.now()}-${index}-${skillIndex}`, active: true })) : MONSTER_SKILLS.map((skill, skillIndex) => ({ ...skill, id: `${skill.id}-${Date.now()}-${index}-${skillIndex}` }))
    return {
      id: `stage-${Date.now()}-${index}`,
      name: entry.name && !/generated monster|monster \d+/i.test(entry.name) ? entry.name : `${fallbackNames[index % fallbackNames.length]} ${stage}`,
      level: stage,
      stats: entry.stats || { stamina: stage + 3, dexterity: stage + 2, intelligence: stage + 1 },
      hp: entry.hp || (kind === 'boss' ? 120 : 20 + stage * 15),
      mp: entry.mp || (kind === 'boss' ? 40 : 12),
      skills,
      attackPattern: entry.attackPattern || (stage % 2 === 0 ? 'focus-lowest-hp' : 'focus-weakest'),
      kind
    } as Monster
  })
}
