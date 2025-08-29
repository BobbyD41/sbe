import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { getTeamColors, TEAM_COLORS } from './teamColors'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const OUTCOMES = [
  'Bust','4 Year Contributor','College Starter','All Conference','All American',
  'Undrafted NFL Roster','NFL Drafted','NFL Starter','NFL Pro Bowl'
]

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const isAuthed = !!token
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])
  return { token, setToken, isAuthed, headers }
}

function Nav() {
  return (
    <nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
      <a href="#/analyze">Analyze</a>
      <a href="#/programs">Programs</a>
      <a href="#/rerank">ReRank</a>
      <a href="#/leaderboard">Leaderboard</a>
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

function AnalyzePage({ auth }) {
  const [player, setPlayer] = useState('Test Player')
  const [hs, setHs] = useState('Example HS')
  const [out, setOut] = useState(null)
  const [fits, setFits] = useState([])
  async function run() {
    const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth.headers }, body: JSON.stringify({ player_name: player, high_school: hs, links: [], max_items: 10 }) })
    const data = await res.json()
    setOut(data)
    const m = await fetch(`${API_BASE}/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scores: data.scores, top_k: 6 }) })
    setFits((await m.json()).fits || [])
  }
  return (
    <div className="card">
      <h2>Analyze</h2>
      <input value={player} onChange={e=>setPlayer(e.target.value)} placeholder="Player" />
      <input value={hs} onChange={e=>setHs(e.target.value)} placeholder="High School" />
      <button onClick={run}>Analyze</button>
      {out && (
        <div style={{ marginTop: 12 }}>
          <div><strong>Summary:</strong> {out.summary}</div>
          <pre>{JSON.stringify(out.scores, null, 2)}</pre>
          <h4>Best Fits</h4>
          {fits.map(f => <div key={f.program}>{f.program}: <strong>{f.fit}%</strong></div>)}
        </div>
      )}
    </div>
  )
}

function ProgramsPage() {
  const [programs, setPrograms] = useState([])
  useEffect(() => { fetch(`${API_BASE}/programs`).then(r=>r.json()).then(d=>setPrograms(d.programs||[])) }, [])
  return (
    <div className="card">
      <h2>Programs</h2>
      <ul>
        {programs.map(p => <li key={p}>{p}</li>)}
      </ul>
    </div>
  )
}

function RerankPage({ auth }) {
  const [year, setYear] = useState('2002')
  const [team, setTeam] = useState('Oklahoma State')
  const [summary, setSummary] = useState(null)
  const [busy, setBusy] = useState(false)
  const [recruits, setRecruits] = useState([])
  const [meta, setMeta] = useState(null)
  const [rerank, setRerank] = useState(null)
  const [rerankPlayers, setRerankPlayers] = useState([])

  const nameToOutcome = useMemo(() => Object.fromEntries((recruits||[]).map(r => [r.name, r.outcome || ''])), [recruits])

  async function load() {
    const res = await fetch(`${API_BASE}/rerank/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
    setSummary(res.ok ? await res.json() : null)
    const rr = await fetch(`${API_BASE}/recruits/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
    setRecruits(rr.ok ? await rr.json() : [])
    const cm = await fetch(`${API_BASE}/class/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
    setMeta(cm.ok ? await cm.json() : null)
  }
  async function find() {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/find?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`, { method:'POST' })
      if (!res.ok) { const t = await res.text(); throw new Error(t) }
      await load()
      setRerank(null); setRerankPlayers([])
      alert('Imported class (teams+players) & recalculated')
    } finally { setBusy(false) }
  }

  function setOutcome(id, outcome) {
    setRecruits(recruits.map(r => r.id === id ? { ...r, outcome } : r))
  }
  async function saveOutcomes() {
    const updates = recruits.filter(r => OUTCOMES.includes(r.outcome || '')).map(r => ({ id: r.id, outcome: r.outcome }))
    if (!updates.length) { alert('No changes'); return }
    const res = await fetch(`${API_BASE}/recruits/outcomes`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ year: Number(year), team, updates }) })
    if (!res.ok) { alert('Save failed'); return }
    alert('Outcomes saved')
    await load()
  }
  async function rerankFromOutcomes() {
    const res = await fetch(`${API_BASE}/recruits/recalc/${encodeURIComponent(year)}/${encodeURIComponent(team)}`, { method:'POST' })
    if (!res.ok) { alert('Recalc failed'); return }
    const data = await res.json()
    // Fetch the rerank snapshot players by class id
    const detail = await fetch(`${API_BASE}/admin/classes/${encodeURIComponent(data.class_id)}`)
    const detailJson = detail.ok ? await detail.json() : null
    // Fetch rerank meta (national rank, commits) for this team/year
    const metaRes = await fetch(`${API_BASE}/rerank/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
    const metaJson = metaRes.ok ? await metaRes.json() : null
    setRerank({ total_points: data.total_points, avg_points: data.avg_points, rank: metaJson?.rank || null, commits: metaJson?.commits || null })
    const players = (detailJson?.players || []).slice().sort((a,b) => b.points - a.points)
    setRerankPlayers(players)
    await load()
    alert('ReRank snapshot created')
  }

  useEffect(() => { load() }, [])

  return (
    <div className="card">
      <h2>ReRank</h2>
      <div style={{ display:'flex', gap:8 }}>
        <input value={year} onChange={e=>setYear(e.target.value)} />
        <input value={team} onChange={e=>setTeam(e.target.value)} />
        <button onClick={load}>Load</button>
        <button onClick={find} disabled={busy}>Find</button>
      </div>

      {meta && (
        <div className="card" style={{ marginTop:12 }}>
          <h3>Original Class (CFBD)</h3>
          <div>National Rank: <strong>{meta.national_rank}</strong></div>
          <div>Points: <strong>{meta.points}</strong></div>
          <div>Avg Rating: <strong>{meta.avg_rating}</strong></div>
          <div>Avg Stars: <strong>{meta.avg_stars}</strong></div>
          <div>Commits: <strong>{meta.commits}</strong></div>
        </div>
      )}

      <div style={{ marginTop:12 }}>
        <h3>Original Recruits (edit outcomes, then Save & ReRank)</h3>
        <div>
          {recruits.length ? (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Pos</th><th>Stars</th><th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {recruits.map(r => (
                  <tr key={r.id}>
                    <td>{r.rank}</td>
                    <td>{r.name}</td>
                    <td>{r.position}</td>
                    <td>{r.stars}</td>
                    <td>
                      <select value={r.outcome || ''} onChange={e=>setOutcome(r.id, e.target.value)}>
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
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={saveOutcomes}>Save Outcomes</button>
          <button onClick={rerankFromOutcomes}>ReRank From Outcomes</button>
        </div>
      </div>

      {rerank && (
        <div style={{ marginTop:12 }}>
          <div className="card" style={{ marginBottom:12 }}>
            <h3>ReRank Class</h3>
            <div>National Rank: <strong>{rerank.rank ?? '-'}</strong></div>
            <div>Points: <strong>{rerank.total_points}</strong></div>
            <div>Avg Outcome Points: <strong>{rerank.avg_points}</strong></div>
            <div>Commits: <strong>{rerank.commits ?? '-'}</strong></div>
          </div>
          <h3>ReRank Recruits</h3>
          {rerankPlayers.length ? (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Outcome</th><th>Points</th>
                </tr>
              </thead>
              <tbody>
                {rerankPlayers.map((p, idx) => (
                  <tr key={p.name + idx}>
                    <td>{idx + 1}</td>
                    <td>{p.name}</td>
                    <td>{nameToOutcome[p.name] || ''}</td>
                    <td>{p.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <em>No rerank snapshot yet</em>}
        </div>
      )}

      {/* Removed legacy Final Rankings list; ReRank panel below now covers this */}
    </div>
  )
}

function LeaderboardPage() {
  const [year, setYear] = useState('2002')
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)

  // Removed unused load function
  
  async function loadAllTeams() {
    setBusy(true)
    try {
      // Get all teams with colors
      const allTeams = Object.keys(TEAM_COLORS).filter(team => team !== 'default')
      
      // Try to get actual data for each team
      const teamDataPromises = allTeams.map(async (team) => {
        try {
          // First try to get existing class meta data
          let metaRes = await fetch(`${API_BASE}/class/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
          let meta = null
          
          if (metaRes.ok) {
            meta = await metaRes.json()
          } else {
            // If no data exists, try to import it from CFBD automatically
            try {
              const importRes = await fetch(`${API_BASE}/import/cfbd/class?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`, { method: 'POST' })
              if (importRes.ok) {
                // After import, fetch the meta data again
                metaRes = await fetch(`${API_BASE}/class/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
                if (metaRes.ok) {
                  meta = await metaRes.json()
                }
              }
            } catch (importError) {
              console.log(`Failed to import data for ${team}:`, importError)
            }
          }
          
          if (meta) {
            return {
              team,
              rank: 0, // Will be calculated after sorting
              total_points: 0,
              avg_points: 0,
              commits: meta.commits || 0,
              hasData: true,
              national_rank: meta.national_rank
            }
          }
        } catch (error) {
          console.log(`Failed to get data for ${team}:`, error)
        }
        
        return {
          team,
          rank: 0,
          total_points: 0,
          avg_points: 0,
          commits: 0,
          hasData: false
        }
      })
      
      const teamData = await Promise.all(teamDataPromises)
      
      // Try to get rerank data for teams that have it
      const rerankPromises = teamData.map(async (teamData) => {
        try {
          const rerankRes = await fetch(`${API_BASE}/rerank/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(teamData.team)}`)
          if (rerankRes.ok) {
            const rerank = await rerankRes.json()
            return {
              ...teamData,
              total_points: rerank.total_points || 0,
              avg_points: rerank.avg_points || 0,
              commits: rerank.commits || teamData.commits || 0,
              rank: rerank.rank || 0
            }
          }
        } catch (error) {
          console.log(`Failed to get rerank data for ${teamData.team}:`, error)
        }
        return teamData
      })
      
      const finalData = await Promise.all(rerankPromises)
      
      // Sort by: 1) Has rerank data (points), 2) Number of commits, 3) Alphabetical
      const sortedData = finalData.sort((a, b) => {
        // First priority: teams with rerank data (points > 0)
        if (a.total_points > 0 && b.total_points === 0) return -1
        if (a.total_points === 0 && b.total_points > 0) return 1
        
        // Second priority: number of commits
        if (a.commits !== b.commits) return b.commits - a.commits
        
        // Third priority: alphabetical
        return a.team.localeCompare(b.team)
      })
      
      // Assign ranks
      sortedData.forEach((row, index) => {
        row.rank = index + 1
      })
      
      setRows(sortedData)
    } finally { 
      setBusy(false) 
    }
  }
  
  async function importAll() {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/import/cfbd/all/${encodeURIComponent(year)}`, { method: 'POST' })
      if (!res.ok) { const t = await res.text(); throw new Error(t) }
      await loadAllTeams()
      alert('Imported all teams for the year')
    } finally { setBusy(false) }
  }
  
  useEffect(() => { loadAllTeams() }, [year])

  return (
    <div className="card">
      <h2>Leaderboard (ReRank)</h2>
      <div style={{ display:'flex', gap:8, alignItems: 'center' }}>
        <label>Year: </label>
        <select value={year} onChange={e=>setYear(e.target.value)}>
          {Array.from({length: 24}, (_, i) => 2002 + i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button onClick={loadAllTeams} disabled={busy}>Load All Teams</button>
        <button onClick={importAll} disabled={busy}>Import All Teams</button>
      </div>
      <div style={{ marginTop:12 }}>
        {rows.length ? (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th>Rank</th><th>Team</th><th>Total Points</th><th>Avg Outcome</th><th>Commits</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.team}>
                  <td>{r.rank}</td>
                  <td><a href={`#/team/${encodeURIComponent(year)}/${encodeURIComponent(r.team)}`}>{r.team}</a></td>
                  <td>{r.total_points > 0 ? r.total_points : '-'}</td>
                  <td>{r.avg_points > 0 ? r.avg_points : '-'}</td>
                  <td>{r.commits > 0 ? r.commits : '-'}</td>
                  <td>{r.total_points > 0 ? 'Reranked' : r.hasData ? 'Has Data' : 'No Data'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <em>Loading teams...</em>}
      </div>
    </div>
  )
}

function TeamPage() {
  const [year, setYear] = useState('')
  const [team, setTeam] = useState('')
  const [meta, setMeta] = useState(null)
  const [recruits, setRecruits] = useState([])
  const [rerank, setRerank] = useState(null)
  const [players, setPlayers] = useState([])

  // parse from hash: #/team/{year}/{team}
  useEffect(() => {
    const parts = (window.location.hash || '').split('/')
    if (parts.length >= 4) {
      const y = decodeURIComponent(parts[2] || '')
      const t = decodeURIComponent(parts.slice(3).join('/') || '')
      setYear(y)
      setTeam(t)
    }
  }, [])

  useEffect(() => {
    if (!year || !team) return
    async function load() {
      // First try to get existing class meta
      let cm = await fetch(`${API_BASE}/class/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
      let metaData = cm.ok ? await cm.json() : null
      
      // If no meta data exists, try to import it from CFBD
      if (!metaData) {
        try {
          const importRes = await fetch(`${API_BASE}/import/cfbd/class?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`, { method: 'POST' })
          if (importRes.ok) {
            // After import, fetch the meta data again
            cm = await fetch(`${API_BASE}/class/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
            metaData = cm.ok ? await cm.json() : null
          }
        } catch (error) {
          console.log('Failed to import class data:', error)
        }
      }
      
      setMeta(metaData)
      
      // Get recruits data
      const rr = await fetch(`${API_BASE}/recruits/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
      setRecruits(rr.ok ? await rr.json() : [])
      
      // Get rerank data
      const rm = await fetch(`${API_BASE}/rerank/meta?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`)
      const rmJson = rm.ok ? await rm.json() : null
      setRerank(rmJson)
      
      if (rmJson?.class_id) {
        const detail = await fetch(`${API_BASE}/admin/classes/${encodeURIComponent(rmJson.class_id)}`)
        const detailJson = detail.ok ? await detail.json() : null
        setPlayers((detailJson?.players || []).slice().sort((a,b) => b.points - a.points))
      }
    }
    load()
  }, [year, team])

  const nameToOutcome = useMemo(() => Object.fromEntries((recruits||[]).map(r => [r.name, r.outcome || ''])), [recruits])
  const nameToPos = useMemo(() => Object.fromEntries((recruits||[]).map(r => [r.name, r.position || ''])), [recruits])
  
  const colors = getTeamColors(team)
  const teamStyle = {
    backgroundColor: colors.primaryBg,
    border: `3px solid ${colors.primary}`,
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
    color: colors.primaryDark
  }
  const headerStyle = {
    color: colors.primary,
    borderBottom: `2px solid ${colors.secondary}`,
    paddingBottom: '10px',
    marginBottom: '20px'
  }
  const cardStyle = {
    backgroundColor: colors.secondary,
    border: `1px solid ${colors.primaryLight}`,
    borderRadius: '6px',
    padding: '15px',
    margin: '15px 0',
    boxShadow: `0 2px 4px ${colors.primaryLight}20`
  }
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: colors.secondary,
    border: `1px solid ${colors.primary}`
  }
  const thStyle = {
    backgroundColor: colors.primary,
    color: colors.accent,
    padding: '10px',
    textAlign: 'left',
    borderBottom: `2px solid ${colors.primaryDark}`
  }
  const tdStyle = {
    padding: '8px 10px',
    borderBottom: `1px solid ${colors.primaryLight}`,
    color: colors.primaryDark
  }

  return (
    <div style={teamStyle}>
      <h2 style={headerStyle}>{year} {team}</h2>
      <div style={cardStyle}>
        <h3 style={{ color: colors.primary, marginTop: 0 }}>Original Class (CFBD)</h3>
        {meta ? (
          <>
            <div>National Rank: <strong>{meta.national_rank}</strong></div>
            <div>Points: <strong>{meta.points}</strong></div>
            <div>Avg Rating: <strong>{meta.avg_rating}</strong></div>
            <div>Avg Stars: <strong>{meta.avg_stars}</strong></div>
            <div>Commits: <strong>{meta.commits}</strong></div>
          </>
        ) : (
          <em>No original class data available</em>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <h3 style={{ color: colors.primary }}>ReRank Class</h3>
        {rerank ? (
          <div style={cardStyle}>
            <div>National Rank: <strong>{rerank.rank ?? '-'}</strong></div>
            <div>Points: <strong>{rerank.total_points}</strong></div>
            <div>Avg Outcome Points: <strong>{rerank.avg_points}</strong></div>
            <div>Commits: <strong>{rerank.commits ?? '-'}</strong></div>
          </div>
        ) : (
          <div style={cardStyle}>
            <em>No rerank snapshot available</em>
          </div>
        )}
        
        <h3 style={{ color: colors.primary }}>ReRank Recruits</h3>
        {players.length ? (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Pos</th>
                <th style={thStyle}>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <tr key={p.name + idx}>
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{nameToPos[p.name] || ''}</td>
                  <td style={tdStyle}>{nameToOutcome[p.name] || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={cardStyle}>
            <em>No rerank players available</em>
          </div>
        )}
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
      <h2>Admin – Manage Recruits</h2>
      <div style={{ display:'flex', gap:8 }}>
        <input value={year} onChange={e=>setYear(e.target.value)} />
        <input value={team} onChange={e=>setTeam(e.target.value)} />
        <button onClick={load}>Load</button>
        <button onClick={importCfbd} disabled={busy}>Import CFBD</button>
        <button onClick={recalc} disabled={busy}>Recalc Class</button>
      </div>
      <div style={{ marginTop:12 }}>
        <textarea rows={6} style={{ width:'100%' }} placeholder="CSV: name,position,stars,rank,outcome,points,note,source" value={csvText} onChange={e=>setCsvText(e.target.value)} />
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={uploadCsv} disabled={busy}>Upload CSV</button>
        </div>
      </div>
      <div style={{ marginTop:12 }}>
        <h3>Recruits</h3>
        <ul>
          {recruits.map(r => <li key={r.id}>{r.rank}. {r.name} – {r.position} – {r.stars}★ – pts:{r.points} – {r.outcome}</li>)}
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/rerank')
  const auth = useAuth()
  useEffect(() => { const onHash = () => setRoute(window.location.hash || '#/rerank'); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash) }, [])
  useEffect(() => { if (auth.token) localStorage.setItem('token', auth.token) }, [auth.token])
  return (
    <div style={{ padding: 16 }}>
      <Nav />
      {route.startsWith('#/auth') && <AuthPage onToken={auth.setToken} />}
      {route.startsWith('#/analyze') && <AnalyzePage auth={auth} />}
      {route.startsWith('#/programs') && <ProgramsPage />}
      {route.startsWith('#/rerank') && <RerankPage auth={auth} />}
      {route.startsWith('#/leaderboard') && <LeaderboardPage />}
      {route.startsWith('#/team/') && <TeamPage />}
      {route.startsWith('#/admin') && <AdminPage auth={auth} />}
    </div>
  )
}
