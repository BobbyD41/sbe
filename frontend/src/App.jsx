import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { getTeamColors, TEAM_COLORS } from './teamColors'

// Use environment variable if set, otherwise default to /api (like localhost)
// Ensure it always ends with /api for consistency
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '') + '/api'



const OUTCOMES = [
  'Left Team/Little Contribution/Bust','4 Year Contributor','College Starter','All Conference','All American',
  'Undrafted but made NFL Roster','NFL Drafted','NFL Starter','NFL Pro Bowl'
]

const OUTCOME_POINTS = {
  'Left Team/Little Contribution/Bust': 0,
  '4 Year Contributor': 1,
  'College Starter': 2,
  'All Conference': 3,
  'All American': 4,
  'Undrafted but made NFL Roster': 5,
  'NFL Drafted': 6,
  'NFL Starter': 7,
  'NFL Pro Bowl': 8
}

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const isAuthed = !!token
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])
  return { token, setToken, isAuthed, headers }
}

function Nav() {
  return (
    <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <a href="#/leaderboard">Leaderboard</a>
      <a href="#/rerank">ReRank</a>
      <a href="#/admin">Admin</a>
      <a href="#/auth">Auth</a>
    </nav>
  )
}

function AuthPage({ onToken }) {
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('demo1234')
  const [msg, setMsg] = useState('')
  async function submit(path) {
    setMsg('...')
    const res = await fetch(`${API_BASE}/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await res.json()
    if (!res.ok) { setMsg(data.detail || 'error'); return }
    onToken(data.access_token)
    setMsg('ok')
  }
  return (
    <div className="card">
      <h2>Auth</h2>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
      <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={()=>submit('register')}>Register</button>
        <button onClick={()=>submit('login')}>Login</button>
        <span>{msg}</span>
      </div>
    </div>
  )
}

function RerankPage() {
  const [year, setYear] = useState('2002')
  const [team, setTeam] = useState('Oklahoma State')
  const [busy, setBusy] = useState(false)
  const [recruits, setRecruits] = useState([])
  const [meta, setMeta] = useState(null)
  const [rerank, setRerank] = useState(null)
  const [rerankPlayers, setRerankPlayers] = useState([])
  const [message, setMessage] = useState('')

  async function loadClassData() {
    // Load class meta
    const metaRes = await fetch(`${API_BASE}/class/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
    if (metaRes.ok) {
      setMeta(await metaRes.json())
    }

    // Load recruits
    const recruitsRes = await fetch(`${API_BASE}/recruits/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
    if (recruitsRes.ok) {
      setRecruits(await recruitsRes.json())
    } else {
      setRecruits([])
    }

    // Load rerank data if it exists
    await loadRerankData()
  }

  async function loadRerankData() {
    const rerankMetaRes = await fetch(`${API_BASE}/rerank/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
    if (rerankMetaRes.ok) {
      const rerankData = await rerankMetaRes.json()
      setRerank(rerankData)
      
      // Load rerank players
      if (rerankData.class_id) {
        const playersRes = await fetch(`${API_BASE}/admin/classes/${rerankData.class_id}`)
        if (playersRes.ok) {
          const classData = await playersRes.json()
          setRerankPlayers((classData.players || []).sort((a, b) => b.points - a.points))
        }
      }
    } else {
      setRerank(null)
      setRerankPlayers([])
    }
  }

  async function findClass() {
    if (!year || !team) {
      setMessage('Please enter both year and team')
      return
    }

    setBusy(true)
    setMessage('Finding class...')

    try {
      // Import from CFBD API
      const importRes = await fetch(`${API_BASE}/import/cfbd/class?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`, { 
        method: 'POST' 
      })
      
      if (!importRes.ok) {
        throw new Error(`Failed to import: ${importRes.statusText}`)
      }

      // Load the imported data
      await loadClassData()
      
      setMessage('Class imported successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function loadExisting() {
    if (!year || !team) {
      setMessage('Please enter both year and team')
      return
    }

    setBusy(true)
    setMessage('Loading class...')

    try {
      await loadClassData()
      setMessage('Class loaded successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  function setOutcome(id, outcome) {
    setRecruits(recruits.map(r => r.id === id ? { ...r, outcome } : r))
  }

  async function saveAndRerank() {
    if (!recruits || recruits.length === 0) {
      setMessage('No recruits to save')
      return
    }

    setBusy(true)
    setMessage('Saving outcomes and calculating rerank...')

    try {
      // Save outcomes
      const updates = recruits
        .filter(r => r.outcome && OUTCOMES.includes(r.outcome))
        .map(r => ({ 
          id: r.id, 
          outcome: r.outcome,
          points: OUTCOME_POINTS[r.outcome]
        }))

      if (updates.length === 0) {
        setMessage('No outcomes to save. Please assign outcomes to recruits first.')
        return
      }

      const saveRes = await fetch(`${API_BASE}/recruits/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          year: Number(year), 
          team, 
          updates 
        })
      })

      if (!saveRes.ok) {
        throw new Error('Failed to save outcomes')
      }

      // Recalculate rerank
      const recalcRes = await fetch(`${API_BASE}/recruits/recalc/${encodeURIComponent(year)}/${encodeURIComponent(team)}`, {
        method: 'POST'
      })

      if (!recalcRes.ok) {
        throw new Error('Failed to recalculate rerank')
      }

      // Reload data to show updated results
      await loadClassData()
      
      setMessage('Outcomes saved and rerank calculated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { 
    // Check for URL parameters
    const hash = window.location.hash
    if (hash.includes('team/')) {
      const parts = hash.split('/')
      if (parts.length >= 4) {
        const y = decodeURIComponent(parts[2] || '')
        const t = decodeURIComponent(parts.slice(3).join('/') || '')
        setYear(y)
        setTeam(t)
        // Auto-load if coming from leaderboard
        setTimeout(() => loadExisting(), 100)
      }
    }
  }, [])

  return (
    <div className="card">
      <h2>ReRank</h2>
      
      {message && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '1rem', 
          borderRadius: '4px',
          backgroundColor: message.includes('Error') ? '#ffebee' : '#e8f5e8',
          color: message.includes('Error') ? '#d32f2f' : '#2e7d32'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={year} onChange={e=>setYear(e.target.value)} placeholder="Year" />
        <input value={team} onChange={e=>setTeam(e.target.value)} placeholder="Team" />
        <button onClick={findClass} disabled={busy}>Find Class</button>
        <button onClick={loadExisting} disabled={busy}>Load Existing</button>
      </div>

      {meta && (
        <div className="card" style={{ 
          marginTop: 12,
          backgroundColor: getTeamColors(team).primaryBg,
          borderLeft: `4px solid ${getTeamColors(team).primary}`,
          color: getTeamColors(team).primaryDark
        }}>
          <h3 style={{ color: getTeamColors(team).primary }}>Original Class (CFBD)</h3>
          <div>National Rank: <strong>{meta.national_rank}</strong></div>
          <div>Points: <strong>{meta.points}</strong></div>
          <div>Avg Rating: <strong>{meta.avg_rating}</strong></div>
          <div>Avg Stars: <strong>{meta.avg_stars}</strong></div>
          <div>Commits: <strong>{meta.commits}</strong></div>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <h3 style={{ color: getTeamColors(team).primary }}>Original Recruits (edit outcomes, then Save & ReRank)</h3>
        <div>
          {recruits.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: getTeamColors(team).primary, color: getTeamColors(team).accent }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Pos</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Stars</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {recruits.map((r, index) => (
                  <tr key={r.id} style={{ 
                    backgroundColor: index % 2 === 0 ? getTeamColors(team).secondaryLight : getTeamColors(team).secondary,
                    color: getTeamColors(team).primaryDark
                  }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{r.rank}</td>
                    <td style={{ padding: '8px' }}>{r.name}</td>
                    <td style={{ padding: '8px' }}>{r.position}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{r.stars}</td>
                    <td style={{ padding: '8px' }}>
                      <select 
                        value={r.outcome || ''} 
                        onChange={e=>setOutcome(r.id, e.target.value)}
                        style={{ 
                          backgroundColor: getTeamColors(team).secondary,
                          color: getTeamColors(team).primaryDark,
                          border: `1px solid ${getTeamColors(team).primaryLight}`,
                          padding: '4px',
                          borderRadius: '4px'
                        }}
                      >
                        <option value=''>Select outcome…</option>
                        {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <em>No recruits loaded</em>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button 
            onClick={saveAndRerank} 
            disabled={busy} 
            style={{ 
              backgroundColor: getTeamColors(team).primary, 
              color: getTeamColors(team).accent,
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1
            }}
          >
            💾 Save & ReRank
          </button>
        </div>
      </div>

      {rerank && (
        <div className="card" style={{ 
          marginTop: 12, 
          backgroundColor: getTeamColors(team).primaryBg, 
          borderLeft: `4px solid ${getTeamColors(team).primary}`,
          color: getTeamColors(team).primaryDark
        }}>
          <h3 style={{ color: getTeamColors(team).primary }}>ReRank Results</h3>
          <div>National Rank: <strong>{rerank.rank || 'N/A'}</strong></div>
          <div>Total Points: <strong>{rerank.total_points}</strong></div>
          <div>Avg Points: <strong>{rerank.avg_points}</strong></div>
          <div>Commits: <strong>{rerank.commits || 'N/A'}</strong></div>
          
          {rerankPlayers.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ color: getTeamColors(team).primary }}>Final Rankings</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: getTeamColors(team).primary, color: getTeamColors(team).accent }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Rank</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Player</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Points</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rerankPlayers.map((p, index) => (
                    <tr key={index} style={{ 
                      backgroundColor: index % 2 === 0 ? getTeamColors(team).secondaryLight : getTeamColors(team).secondary,
                      color: getTeamColors(team).primaryDark
                    }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{index + 1}</td>
                      <td style={{ padding: '8px' }}>{p.name}</td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{p.points}</td>
                      <td style={{ padding: '8px' }}>{p.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LeaderboardPage() {
  const [year, setYear] = useState('2002')
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)

  async function loadLeaderboard() {
    if (!year) {
      alert('Please enter a year')
      return
    }

    setBusy(true)
    try {
      const url = `${API_BASE}/leaderboard/rerank/${year}`
      
      const res = await fetch(url)
      
      if (!res.ok) {
        throw new Error(`Failed to load leaderboard: ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      
      // Sort by: 1) Has rerank data (points > 0), 2) Number of commits, 3) Alphabetical
      const sortedData = data.rows.sort((a, b) => {
        // First priority: teams with rerank data (points > 0)
        if (a.total_points > 0 && b.total_points === 0) return -1
        if (a.total_points === 0 && b.total_points > 0) return 1
        
        // Second priority: number of commits
        if (a.commits !== b.commits) return b.commits - a.commits
        
        // Third priority: alphabetical
        return a.team.localeCompare(b.team)
      })
      
      setRows(sortedData)
    } catch (error) {
      alert(`Error loading leaderboard: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  return (
    <div className="card">
      <h2>Leaderboard</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={year} onChange={e=>setYear(e.target.value)} placeholder="Year" />
        <button onClick={loadLeaderboard} disabled={busy}>Load Leaderboard</button>
      </div>

      <div>
        {rows.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Rank</th><th>Team</th><th>Total Points</th><th>Avg Points</th><th>Commits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.team}>
                  <td>{row.rank}</td>
                  <td>
                    <a href={`#/rerank/team/${row.year}/${encodeURIComponent(row.team)}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                      {row.team}
                    </a>
                  </td>
                  <td>{row.total_points}</td>
                  <td>{row.avg_points.toFixed(2)}</td>
                  <td>{row.commits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <em>Loading teams...</em>}
      </div>
    </div>
  )
}

function AdminPage({ auth }) {
  const [year, setYear] = useState('2002')
  const [team, setTeam] = useState('Oklahoma State')
  const [recruits, setRecruits] = useState([])
  const [csvText, setCsvText] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const res = await fetch(`${API_BASE}/recruits/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
    setRecruits(res.ok ? await res.json() : [])
  }
  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean)
    const header = lines[0].split(',').map(s=>s.trim().toLowerCase())
    return lines.slice(1).map(line => {
      const cols = line.split(',')
      const o = {}
      header.forEach((h,i) => o[h] = (cols[i]||'').trim())
      o.stars = Number(o.stars||0); o.rank = Number(o.rank||0); o.points = Number(o.points||0)
      return o
    })
  }
  async function uploadCsv() {
    setBusy(true)
    try {
      const recruits = parseCsv(csvText)
      const res = await fetch(`${API_BASE}/recruits/upload`, { method:'POST', headers:{ 'Content-Type':'application/json', ...auth.headers }, body: JSON.stringify({ year:Number(year), team, recruits }) })
      if (!res.ok) throw new Error('upload failed')
      await load()
      alert('Uploaded')
    } finally { setBusy(false) }
  }
  async function importCfbd() {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/import/cfbd/${encodeURIComponent(year)}/${encodeURIComponent(team)}`, { method:'POST' })
      if (!res.ok) { const t = await res.text(); throw new Error(t) }
      await load()
      alert('Imported from CFBD')
    } finally { setBusy(false) }
  }
  async function recalc() {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/recruits/recalc/${encodeURIComponent(year)}/${encodeURIComponent(team)}`, { method:'POST' })
      if (!res.ok) throw new Error('recalc failed')
      alert('ReRank snapshot created')
    } finally { setBusy(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="card">
      <h2>Admin</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={year} onChange={e=>setYear(e.target.value)} placeholder="Year" />
        <input value={team} onChange={e=>setTeam(e.target.value)} placeholder="Team" />
        <button onClick={load}>Load</button>
        <button onClick={importCfbd} disabled={busy}>Import CFBD</button>
        <button onClick={recalc} disabled={busy}>Recalc</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3>CSV Upload</h3>
        <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} placeholder="CSV data..." style={{ width: '100%', height: 100 }} />
        <button onClick={uploadCsv} disabled={busy}>Upload CSV</button>
      </div>

      <div>
        <h3>Recruits ({recruits.length})</h3>
        {recruits.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Name</th><th>Position</th><th>Stars</th><th>Outcome</th><th>Points</th>
              </tr>
            </thead>
            <tbody>
              {recruits.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.position}</td>
                  <td>{r.stars}</td>
                  <td>{r.outcome}</td>
                  <td>{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <em>No recruits</em>}
      </div>
    </div>
  )
}

function App() {
  const { token, setToken, isAuthed, headers } = useAuth()
  const [route, setRoute] = useState('')

  useEffect(() => {
    const hash = window.location.hash || '#/leaderboard'
    setRoute(hash)
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/leaderboard')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <h1>Stars to Stats</h1>
      <Nav />
      
      {route.startsWith('#/leaderboard') && <LeaderboardPage />}
      {route.startsWith('#/rerank') && <RerankPage />}
      {route.startsWith('#/admin') && <AdminPage auth={{ headers }} />}
      {route.startsWith('#/auth') && <AuthPage onToken={setToken} />}
      
      {!route.startsWith('#/') && <LeaderboardPage />}
    </div>
  )
}

export default App
