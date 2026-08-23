// Displays and maintains the locally saved monster catalog.
import React, { useState, useEffect } from 'react'
import { loadBestiary, saveBestiary } from '../utils/storage'
import { loadApiKey } from '../utils/storage'
import { Monster } from '../models'

function randName() {
  const parts = ['Gor', 'ul', 'mar', 'th', 'ix', 'za', 'kor', 'fen']
  return parts[Math.floor(Math.random() * parts.length)] + Math.floor(Math.random() * 90)
}

export default function Bestiary() {
  const [bestiary, setBestiary] = useState(() => loadBestiary())
  const hasApiKey = Boolean(loadApiKey())

  useEffect(() => {
    // no-op
  }, [])

  function addRandom() {
    const m: Monster = {
      id: `m-${Date.now()}`,
      name: randName(),
      level: Math.ceil(Math.random() * 5),
      stats: { stamina: 4, dexterity: 3, intelligence: 2, empathy: 1 },
      hp: 30 + Math.floor(Math.random() * 80),
      mp: 0,
      skills: [],
      kind: 'monster'
    }
    const next = { monsters: [...bestiary.monsters, m] }
    setBestiary(next)
    saveBestiary(next)
  }

  function remove(id: string) {
    const next = { monsters: bestiary.monsters.filter((x) => x.id !== id) }
    setBestiary(next)
    saveBestiary(next)
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Bestiary</h3>
      <div className="row">
          <button className="btn" disabled={!hasApiKey} onClick={addRandom} type="button">
            Add Random Monster{!hasApiKey ? ' (API key required)' : ''}
        </button>
      </div>
      <ul>
        {bestiary.monsters.map((m) => (
          <li key={m.id}>
            <b>{m.name}</b> Lv{m.level} HP {m.hp}
            <button style={{ marginLeft: 8 }} onClick={() => remove(m.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
