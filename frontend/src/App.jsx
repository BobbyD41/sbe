import { useEffect, useMemo, useState } from 'react'
import './App.css'

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

  async function load() {
    const res = await fetch(`${API_BASE}/rerank/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
    setSummary(res.ok ? await res.json() : null)
    const rr = await fetch(`${API_BASE}/recruits/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
    setRecruits(rr.ok ? await rr.json() : [])
  }
  async function saveDemo() {
    const res = await fetch(`${API_BASE}/rerank`, { method: 'POST', headers: { 'Content-Type':'application/json', ...auth.headers }, body: JSON.stringify({ year:Number(year), team, players:[{ name:'Demo', points:3, note:'All Conference'}] }) })
    alert(res.ok ? 'Saved' : 'Save failed')
  }
  async function find() {
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/find?year=${encodeURIComponent(year)}&team=${encodeURIComponent(team)}`, { method:'POST' })
      if (!res.ok) { const t = await res.text(); throw new Error(t) }
      await load()
      alert('Imported & recalculated')
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
        <button onClick={saveDemo}>Save Demo</button>
        <button onClick={find} disabled={busy}>Find</button>
      </div>

      <div style={{ marginTop:12 }}>
        <h3>Original Recruits (edit outcomes, then Save & ReRank)</h3>
        <div>
          {recruits.length ? (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Pos</th><th>Stars</th><th>Rank</th><th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {recruits.map(r => (
                  <tr key={r.id}>
                    <td>{r.rank}</td>
                    <td>{r.name}</td>
                    <td>{r.position}</td>
                    <td>{r.stars}</td>
                    <td>{r.rank}</td>
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

      {summary && (
        <div style={{ marginTop:12 }}>
          <h3>🏈 {summary.year} {summary.team} Recruiting Class – Final Rankings</h3>
          <div><strong>Total:</strong> {summary.total_points} • <strong>Avg:</strong> {summary.avg_points}</div>
          <ul>
            {(summary.players||[]).map(p => <li key={p.name}>{p.name} – {p.points} – {p.note}</li>)}
          </ul>
        </div>
      )}
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
  const [route, setRoute] = useState(window.location.hash || '#/analyze')
  const auth = useAuth()
  useEffect(() => { const onHash = () => setRoute(window.location.hash || '#/analyze'); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash) }, [])
  useEffect(() => { if (auth.token) localStorage.setItem('token', auth.token) }, [auth.token])
  return (
    <div style={{ padding: 16 }}>
      <Nav />
      {route.startsWith('#/auth') && <AuthPage onToken={auth.setToken} />}
      {route.startsWith('#/analyze') && <AnalyzePage auth={auth} />}
      {route.startsWith('#/programs') && <ProgramsPage />}
      {route.startsWith('#/rerank') && <RerankPage auth={auth} />}
      {route.startsWith('#/admin') && <AdminPage auth={auth} />}
    </div>
  )
}
