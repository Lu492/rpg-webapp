// Defines the domain shapes shared by the UI, game systems, and persistence layer.
export type StatName = 'stamina' | 'dexterity' | 'intelligence' | 'empathy'

export interface Stats {
  stamina: number
  dexterity: number
  intelligence: number
  empathy: number
}

export interface Skill {
  id: string
  name: string
  description?: string
  formula?: string
  active: boolean
}

export interface Item {
  id: string
  name: string
  statBoost?: Partial<Stats>
  passiveSkill?: Skill
}

export interface CharacterVersion {
  level: 1 | 2 | 3
  stats: Stats
  skills: Skill[]
  hp: number
  mp: number
}

export interface Character {
  id: string
  name: string
  level: 1 | 2 | 3
  stats: Stats
  skills: Skill[]
  hp: number
  mp: number
  inventory: Item[]
  versions?: CharacterVersion[]
}

export interface Monster {
  id: string
  name: string
  level: number
  stats: Partial<Stats>
  hp: number
  mp: number
  skills: Skill[]
  attackPattern?: 'focus-weakest' | 'focus-lowest-hp' | 'random'
  kind?: 'monster' | 'minion' | 'boss'
}

export interface Bestiary {
  monsters: Monster[]
}
