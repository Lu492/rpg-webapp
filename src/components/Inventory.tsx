import React, { useState } from 'react'
import { Item } from '../models'
import { loadInventory, saveInventory } from '../utils/storage'

export default function Inventory() {
  const [items, setItems] = useState<Item[]>(() => loadInventory())
  const [name, setName] = useState('')

  function addItem() {
    if (!name) return alert('Enter item name')
    const it: Item = { id: `i-${Date.now()}`, name, statBoost: { stamina: 1 } }
    const next = [...items, it]
    setItems(next)
    saveInventory(next)
    setName('')
  }

  function remove(id: string) {
    const next = items.filter((i) => i.id !== id)
    setItems(next)
    saveInventory(next)
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Inventory</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" onClick={addItem} type="button">
          Add
        </button>
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            {it.name} <button style={{ marginLeft: 8 }} onClick={() => remove(it.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
