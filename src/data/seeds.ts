import { Character, Bestiary, Item } from '../models'

export function defaultCharacters(): Character[] {
  return [
    {
      id: 'c-hero-1',
      name: 'Alric',
      level: 1,
      stats: { stamina: 8, dexterity: 6, intelligence: 4, empathy: 3 },
      skills: [ { id: 's1', name: 'Power Strike', description: 'A powerful physical attack.', formula: 'stamina x 2 + dexterity, x1.6', active: true }, { id: 's2', name: 'Rapid Shot', description: 'A quick ranged attack.', formula: 'stamina x 2 + dexterity, x1.1', active: true } ],
      hp: 8 * 12 + 1 * 10,
      mp: 4 * 12 + 3 * 6 + 1 * 5,
      inventory: []
    },
    {
      id: 'c-hero-2',
      name: 'Mira',
      level: 1,
      stats: { stamina: 5, dexterity: 8, intelligence: 6, empathy: 4 },
      skills: [ { id: 's3', name: 'Mind Shield', description: 'A focused defensive strike.', formula: 'stamina x 2 + dexterity, x0.8', active: true }, { id: 's5', name: 'Sneak', description: 'A precise attack from the shadows.', formula: 'stamina x 2 + dexterity', active: true } ],
      hp: 5 * 12 + 1 * 10,
      mp: 6 * 12 + 4 * 6 + 1 * 5,
      inventory: []
    },
    {
      id: 'c-hero-3',
      name: 'Gor',
      level: 1,
      stats: { stamina: 7, dexterity: 4, intelligence: 3, empathy: 2 },
      skills: [ { id: 's6', name: 'Taunt', description: 'An attack that draws enemy attention.', formula: 'stamina x 2 + dexterity', active: true }, { id: 's7', name: 'Fortify', description: 'A sturdy defensive attack.', formula: 'stamina x 2 + dexterity', active: true } ],
      hp: 7 * 12 + 1 * 10,
      mp: 3 * 12 + 2 * 6 + 1 * 5,
      inventory: []
    }
  ]
}

export function defaultBestiary(): Bestiary {
  return {
    monsters: [
      { id: 'm-1', name: 'Goblin', level: 1, stats: { stamina: 4, dexterity: 4 }, hp: 30, mp: 0, skills: [], attackPattern: 'focus-weakest', kind: 'monster' },
      { id: 'm-2', name: 'Wolf', level: 1, stats: { stamina: 5, dexterity: 6 }, hp: 36, mp: 0, skills: [], attackPattern: 'focus-lowest-hp', kind: 'monster' },
      { id: 'm-3', name: 'Skeleton', level: 1, stats: { stamina: 6, dexterity: 3 }, hp: 40, mp: 0, skills: [], attackPattern: 'random', kind: 'monster' },
      // bosses
      { id: 'b-1', name: 'Orc Chieftain', level: 3, stats: { stamina: 10, dexterity: 5 }, hp: 120, mp: 10, skills: [], attackPattern: 'focus-weakest', kind: 'boss' },
      { id: 'b-2', name: 'Wraith Lord', level: 3, stats: { stamina: 6, dexterity: 6, intelligence: 8 }, hp: 100, mp: 80, skills: [], attackPattern: 'focus-lowest-hp', kind: 'boss' },
      { id: 'b-3', name: 'Dragon Sovereign', level: 3, stats: { stamina: 12, dexterity: 7, intelligence: 10 }, hp: 160, mp: 100, skills: [], attackPattern: 'random', kind: 'boss' },
      { id: 'minion-1', name: 'Orc Raider', level: 2, stats: { stamina: 4, dexterity: 4 }, hp: 35, mp: 0, skills: [], attackPattern: 'focus-weakest', kind: 'minion' },
      { id: 'minion-2', name: 'Wraith Servant', level: 2, stats: { stamina: 3, dexterity: 5 }, hp: 30, mp: 20, skills: [], attackPattern: 'focus-lowest-hp', kind: 'minion' }
    ]
  }
}

export function defaultItems(): Item[] {
  return [
    { id: 'it-1', name: 'Stamina Ring', statBoost: { stamina: 2 } },
    { id: 'it-2', name: 'Dexterity Amulet', statBoost: { dexterity: 2 } },
    { id: 'it-3', name: 'Mystery Potion', statBoost: { intelligence: 1, empathy: 1 } }
  ]
}
