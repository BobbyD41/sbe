import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

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
  async function load() {
    const res = await fetch(`${API_BASE}/rerank/${encodeURIComponent(year)}/${encodeURIComponent(team)}`)
    setSummary(res.ok ? await res.json() : null)
  }
  async function saveDemo() {
    const res = await fetch(`${API_BASE}/rerank`, { method: 'POST', headers: { 'Content-Type':'application/json', ...auth.headers }, body: JSON.stringify({ year:Number(year), team, players:[{ name:'Demo', points:3, note:'All Conference'}] }) })
    alert(res.ok ? 'Saved' : 'Save failed')
  }
  return (
    <div className="card">
      <h2>ReRank</h2>
      <div style={{ display:'flex', gap:8 }}>
        <input value={year} onChange={e=>setYear(e.target.value)} />
        <input value={team} onChange={e=>setTeam(e.target.value)} />
        <button onClick={load}>Load</button>
        <button onClick={saveDemo}>Save Demo</button>
      </div>
      {summary && (
        <div style={{ marginTop:12 }}>
          <div><strong>Total:</strong> {summary.total_points} • <strong>Avg:</strong> {summary.avg_points}</div>
          <ul>
            {(summary.players||[]).map(p => <li key={p.name}>{p.name} – {p.points} – {p.note}</li>)}
          </ul>
        </div>
      )}
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
    </div>
  )
}
