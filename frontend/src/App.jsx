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
  
  // Debug logging
  console.log('useAuth state:', { token: token ? 'present' : 'missing', isAuthed, hasHeaders: !!Object.keys(headers).length })
  
  const setTokenWithStorage = (newToken) => {
    console.log('Setting token:', newToken ? 'present' : 'missing')
    if (newToken) {
      localStorage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
    }
    setToken(newToken)
  }
  
  return { token, setToken: setTokenWithStorage, isAuthed, headers }
}

function Nav() {
  const { isAuthed } = useAuth()
  
  return (
    <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <a href="#/leaderboard">Leaderboard</a>
      {isAuthed && (
        <>
          <a href="#/rerank">ReRank</a>
          <a href="#/admin">Admin</a>
        </>
      )}
      <a href="#/auth" style={{ 
        backgroundColor: isAuthed ? '#dc3545' : '#28a745',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        textDecoration: 'none',
        fontWeight: 'bold'
      }}>
        {isAuthed ? 'Logout' : 'Login'}
      </a>
    </nav>
  )
}

function AuthPage({ onToken }) {
  const { isAuthed } = useAuth()
  const [email, setEmail] = useState('demo@example.com')
  const [password, setPassword] = useState('demo1234')
  const [msg, setMsg] = useState('')
  
  async function submit(path) {
    setMsg('...')
    console.log(`Attempting ${path} with:`, { email, password })
    console.log('API_BASE:', API_BASE)
    
    try {
      const res = await fetch(`${API_BASE}/auth/${path}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email, password }) 
      })
      console.log('Auth response status:', res.status)
      
      const data = await res.json()
      console.log('Auth response data:', data)
      
      if (!res.ok) { 
        setMsg(data.detail || 'error'); 
        console.log('Auth failed:', data.detail || 'error')
        return 
      }
      
      console.log('Auth successful, setting token:', data.access_token)
      onToken(data.access_token)
      setMsg('Login successful!')
      // Redirect to rerank page after successful login
      setTimeout(() => {
        console.log('Redirecting to rerank page')
        window.location.hash = '#/rerank'
      }, 1000)
    } catch (error) {
      console.error('Auth request error:', error)
      setMsg('Network error: ' + error.message)
    }
  }
  
  function logout() {
    onToken('')
    window.location.hash = '#/leaderboard'
  }
  
  if (isAuthed) {
    return (
      <div className="card">
        <h2>Logout</h2>
        <p>You are currently logged in.</p>
        <button onClick={logout}>Logout</button>
      </div>
    )
  }
  
  return (
    <div className="card">
      <h2>Login</h2>
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
  const { isAuthed } = useAuth()
  const [year, setYear] = useState('2002')
  const [team, setTeam] = useState('Oklahoma State')
  const [busy, setBusy] = useState(false)
  const [recruits, setRecruits] = useState([])
  const [meta, setMeta] = useState(null)
  const [rerank, setRerank] = useState(null)
  const [rerankPlayers, setRerankPlayers] = useState([])
  const [message, setMessage] = useState('')

  if (!isAuthed) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '2px solid #dee2e6'
      }}>
        <h2 style={{ color: '#495057', marginBottom: '20px' }}>Authentication Required</h2>
        <p style={{ color: '#6c757d', marginBottom: '20px' }}>
          You need to be logged in to access the ReRank features.
        </p>
        <a 
          href="#/auth" 
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
            display: 'inline-block'
          }}
        >
          Login to Continue
        </a>
      </div>
    )
  }

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
      setRows(data.rows)
    } catch (error) {
      alert(`Error loading leaderboard: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [year])

  function handleTeamClick(team) {
    window.location.hash = `#/team/${year}/${encodeURIComponent(team)}`
  }

  return (
    <div>
      <h1>🏆 College Football Recruiting Leaderboard</h1>
      <div style={{ marginBottom: 16 }}>
        <label>Year: <input value={year} onChange={e => setYear(e.target.value)} type="number" min="1990" max="2030" /></label>
        <button onClick={loadLeaderboard} disabled={busy} style={{ marginLeft: 8 }}>
          {busy ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {rows.length > 0 ? (
        <div style={{ display: 'grid', gap: '8px' }}>
          {rows.map(row => {
            const teamColors = getTeamColors(row.team)
            return (
              <div 
                key={row.team}
                onClick={() => handleTeamClick(row.team)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: teamColors.primaryBg,
                  border: `2px solid ${teamColors.primary}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: '#000000' // Ensure black text for visibility
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  backgroundColor: teamColors.primary,
                  color: teamColors.accent,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  marginRight: '12px'
                }}>
                  {row.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold',
                    color: teamColors.primary
                  }}>
                    {row.team}
                  </div>
                  <div style={{ fontSize: '14px', color: '#333333' }}>
                    {row.has_rerank ? 
                      `${row.total_points} points • ${row.avg_points} avg • ${row.commits} commits` :
                      'No data available'
                    }
                  </div>
                </div>
                <div style={{ 
                  padding: '4px 8px',
                  backgroundColor: row.has_rerank ? teamColors.primary : '#ccc',
                  color: row.has_rerank ? teamColors.accent : '#666',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {row.has_rerank ? 'RERANKED' : 'PENDING'}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p>No teams found for {year}</p>
      )}
    </div>
  )
}

function TeamPage() {
  const [year, setYear] = useState('')
  const [team, setTeam] = useState('')
  const [teamData, setTeamData] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/#\/team\/(\d+)\/(.+)/)
    if (match) {
      const [, yearParam, teamParam] = match
      setYear(yearParam)
      setTeam(decodeURIComponent(teamParam))
    }
  }, [])

  useEffect(() => {
    if (year && team) {
      loadTeamData()
    }
  }, [year, team])

  async function loadTeamData() {
    setBusy(true)
    try {
      const teamData = {
        year: parseInt(year),
        team: team,
        meta: null,
        recruits: [],
        rerank_meta: null,
        rerank_players: []
      }

      console.log(`Loading team data for ${team} in ${year}`)

      // Load class meta
      try {
        const metaUrl = `${API_BASE}/class/meta?year=${year}&team=${encodeURIComponent(team)}`
        console.log('Fetching meta from:', metaUrl)
        const metaRes = await fetch(metaUrl)
        console.log('Meta response status:', metaRes.status)
        if (metaRes.ok) {
          teamData.meta = await metaRes.json()
          console.log('Meta data loaded:', teamData.meta)
        } else {
          console.log('Meta request failed:', metaRes.status, metaRes.statusText)
        }
      } catch (error) {
        console.log('Meta request error:', error)
      }

      // Load recruits
      try {
        const recruitsUrl = `${API_BASE}/recruits/${year}/${encodeURIComponent(team)}`
        console.log('Fetching recruits from:', recruitsUrl)
        const recruitsRes = await fetch(recruitsUrl)
        console.log('Recruits response status:', recruitsRes.status)
        if (recruitsRes.ok) {
          teamData.recruits = await recruitsRes.json()
          console.log('Recruits data loaded:', teamData.recruits.length, 'recruits')
        } else {
          console.log('Recruits request failed:', recruitsRes.status, recruitsRes.statusText)
        }
      } catch (error) {
        console.log('Recruits request error:', error)
      }

      // Load rerank meta
      try {
        const rerankMetaUrl = `${API_BASE}/rerank/meta?year=${year}&team=${encodeURIComponent(team)}`
        console.log('Fetching rerank meta from:', rerankMetaUrl)
        const rerankMetaRes = await fetch(rerankMetaUrl)
        console.log('Rerank meta response status:', rerankMetaRes.status)
        if (rerankMetaRes.ok) {
          teamData.rerank_meta = await rerankMetaRes.json()
          console.log('Rerank meta loaded:', teamData.rerank_meta)
          
          // Load rerank players if we have rerank data
          if (teamData.rerank_meta.class_id) {
            try {
              const playersUrl = `${API_BASE}/admin/classes/${teamData.rerank_meta.class_id}`
              console.log('Fetching rerank players from:', playersUrl)
              const playersRes = await fetch(playersUrl)
              if (playersRes.ok) {
                const classData = await playersRes.json()
                teamData.rerank_players = (classData.players || []).sort((a, b) => b.points - a.points)
                console.log('Rerank players loaded:', teamData.rerank_players.length, 'players')
              }
            } catch (error) {
              console.log('Rerank players request error:', error)
            }
          }
        } else {
          console.log('Rerank meta request failed:', rerankMetaRes.status, rerankMetaRes.statusText)
        }
      } catch (error) {
        console.log('Rerank meta request error:', error)
      }

      console.log('Final team data:', teamData)
      setTeamData(teamData)
    } catch (error) {
      console.error('Error loading team data:', error)
      alert(`Error loading team data: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  if (busy) {
    return <div>Loading team data...</div>
  }

  if (!teamData) {
    return <div>No team data available</div>
  }

  const teamColors = getTeamColors(team)

  return (
    <div style={{ 
      backgroundColor: teamColors.primaryBg,
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: `3px solid ${teamColors.primary}`
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: `2px solid ${teamColors.primary}`
        }}>
          <button 
            onClick={() => window.location.hash = '#/leaderboard'}
            style={{
              backgroundColor: teamColors.primary,
              color: teamColors.accent,
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginRight: '16px'
            }}
          >
            ← Back to Leaderboard
          </button>
          <h1 style={{ 
            color: teamColors.primary,
            margin: 0,
            fontSize: '32px',
            fontWeight: 'bold'
          }}>
            {team} - {year}
          </h1>
        </div>

        {teamData.meta && (
          <div style={{ 
            backgroundColor: teamColors.primaryBg,
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: `1px solid ${teamColors.primaryLight}`
          }}>
            <h3 style={{ color: teamColors.primary, marginTop: 0 }}>Original Class (CFBD)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', color: '#000000' }}>
              <div><strong>National Rank:</strong> {teamData.meta.national_rank}</div>
              <div><strong>Points:</strong> {teamData.meta.points}</div>
              <div><strong>Avg Rating:</strong> {teamData.meta.avg_rating}</div>
              <div><strong>Avg Stars:</strong> {teamData.meta.avg_stars}</div>
              <div><strong>Commits:</strong> {teamData.meta.commits}</div>
            </div>
          </div>
        )}

        {teamData.recruits && teamData.recruits.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: teamColors.primary }}>Original Recruits</h3>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ backgroundColor: teamColors.primary, color: teamColors.accent }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Pos</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Stars</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {teamData.recruits.map((r, index) => (
                  <tr key={r.id} style={{ 
                    backgroundColor: index % 2 === 0 ? teamColors.secondaryLight : teamColors.secondary,
                    color: teamColors.primaryDark
                  }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.rank}</td>
                    <td style={{ padding: '12px' }}>{r.name}</td>
                    <td style={{ padding: '12px' }}>{r.position}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.stars}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        backgroundColor: r.outcome ? teamColors.primary : '#ccc',
                        color: r.outcome ? teamColors.accent : '#666',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {r.outcome || 'Not Assigned'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {teamData.rerank_meta && (
          <div style={{ 
            backgroundColor: teamColors.primaryBg,
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: `1px solid ${teamColors.primaryLight}`
          }}>
            <h3 style={{ color: teamColors.primary, marginTop: 0 }}>ReRank Results</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px', color: '#000000' }}>
              <div><strong>National Rank:</strong> {teamData.rerank_meta.rank || 'N/A'}</div>
              <div><strong>Total Points:</strong> {teamData.rerank_meta.total_points}</div>
              <div><strong>Avg Points:</strong> {teamData.rerank_meta.avg_points}</div>
              <div><strong>Commits:</strong> {teamData.rerank_meta.commits || 'N/A'}</div>
            </div>
            
            {teamData.rerank_players && teamData.rerank_players.length > 0 && (
              <div>
                <h4 style={{ color: teamColors.primary }}>Final Rankings</h4>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: teamColors.primary, color: teamColors.accent }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Rank</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Player</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Points</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamData.rerank_players.map((p, index) => (
                      <tr key={index} style={{ 
                        backgroundColor: index % 2 === 0 ? teamColors.secondaryLight : teamColors.secondary,
                        color: teamColors.primaryDark
                      }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{index + 1}</td>
                        <td style={{ padding: '12px' }}>{p.name}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.points}</td>
                        <td style={{ padding: '12px' }}>{p.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!teamData.meta && !teamData.recruits && !teamData.rerank_meta && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: '#000000'
          }}>
            <h3>No data available for {team} in {year}</h3>
            <p>This team hasn't been imported or reranked yet.</p>
            <div style={{ marginTop: '20px' }}>
              <a 
                href="#/auth" 
                style={{
                  backgroundColor: teamColors.primary,
                  color: teamColors.accent,
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginRight: '10px'
                }}
              >
                Login to ReRank
              </a>
              <a 
                href="#/rerank" 
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}
              >
                Go to ReRank Page
              </a>
            </div>
          </div>
        )}

        {/* Show action buttons for teams with original data but no rerank */}
        {teamData.meta && teamData.recruits && !teamData.rerank_meta && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px',
            backgroundColor: teamColors.primaryBg,
            borderRadius: '8px',
            marginTop: '20px',
            border: `1px solid ${teamColors.primaryLight}`
          }}>
            <h4 style={{ color: teamColors.primary, marginBottom: '10px' }}>Ready to ReRank?</h4>
            <p style={{ color: '#000000', marginBottom: '15px' }}>
              This team has original recruiting data but hasn't been reranked yet.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <a 
                href="#/auth" 
                style={{
                  backgroundColor: teamColors.primary,
                  color: teamColors.accent,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Login to ReRank
              </a>
              <a 
                href="#/rerank" 
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Go to ReRank Page
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminPage({ auth }) {
  const { isAuthed } = useAuth()
  const [year, setYear] = useState('2002')
  const [team, setTeam] = useState('Oklahoma State')
  const [recruits, setRecruits] = useState([])
  const [csvText, setCsvText] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isAuthed) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '2px solid #dee2e6'
      }}>
        <h2 style={{ color: '#495057', marginBottom: '20px' }}>Authentication Required</h2>
        <p style={{ color: '#6c757d', marginBottom: '20px' }}>
          You need to be logged in to access the Admin features.
        </p>
        <a 
          href="#/auth" 
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
            display: 'inline-block'
          }}
        >
          Login to Continue
        </a>
      </div>
    )
  }

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
      {route.startsWith('#/team/') && <TeamPage />}
      {route.startsWith('#/rerank') && isAuthed && <RerankPage />}
      {route.startsWith('#/admin') && isAuthed && <AdminPage auth={{ headers }} />}
      {route.startsWith('#/auth') && <AuthPage onToken={setToken} />}
      
      {!route.startsWith('#/') && <LeaderboardPage />}
    </div>
  )
}

export default App
