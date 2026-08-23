// Stores the optional AI API key used by the campaign.
import React, { useState, useEffect } from 'react'
import { saveApiKey, loadApiKey } from '../utils/storage'

export default function Settings() {
  const [key, setKey] = useState('')

  useEffect(() => {
    const k = loadApiKey()
    if (k) setKey(k)
  }, [])

  function save() {
    saveApiKey(key)
    alert('API key saved to localStorage')
  }

  function clearKey() {
    setKey('')
    saveApiKey('')
    alert('API key cleared')
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Settings</h3>
      <p style={{ color: '#9fb0c7' }}>OpenAI API key (optional, stored locally)</p>
      <input
        className="input"
        placeholder="sk-..."
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <div className="row">
        <button className="btn" onClick={save} type="button">
          Save Key
        </button>
        <button className="btn" onClick={clearKey} type="button">
          Clear
        </button>
      </div>
    </div>
  )
}
