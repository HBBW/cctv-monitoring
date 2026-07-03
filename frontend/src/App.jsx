import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Users,
  Wrench,
} from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl()
const STORAGE_KEY = 'cctv_monitoring_auth'
const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7)

function defaultApiUrl() {
  const localHosts = ['localhost', '127.0.0.1']
  if (localHosts.includes(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`
  }

  return `${window.location.origin}/api`
}

const issueTypes = [
  ['camera_offline', 'Kamera mati'],
  ['blur', 'Gambar blur'],
  ['position_shifted', 'Posisi bergeser'],
  ['storage_full', 'Storage penuh'],
  ['network_issue', 'Gangguan jaringan'],
  ['other', 'Lainnya'],
]

const roleLabels = {
  admin: 'Admin',
  petugas: 'Petugas',
  viewer: 'Viewer',
}

const shiftPresets = [
  { label: 'Shift 1', time: '06:00-15:00', hours: rangeHours(6, 15) },
  { label: 'Shift 2', time: '15:00-23:00', hours: rangeHours(15, 23) },
  { label: 'Shift 3', time: '23:00-06:00', hours: [...rangeHours(23, 24), ...rangeHours(0, 6)] },
]

function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [view, setView] = useState('dashboard')
  const [date, setDate] = useState(today)
  const [month, setMonth] = useState(currentMonth)
  const [matrix, setMatrix] = useState(null)
  const [monthlyReport, setMonthlyReport] = useState(null)
  const [cctvs, setCctvs] = useState([])
  const [issues, setIssues] = useState([])
  const [checks, setChecks] = useState([])
  const [users, setUsers] = useState([])
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [selectedCheck, setSelectedCheck] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const api = useMemo(() => {
    const client = axios.create({ baseURL: API_URL })
    client.interceptors.request.use((config) => {
      if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`
      return config
    })
    return client
  }, [auth])

  const canEdit = auth?.user?.role === 'admin' || auth?.user?.role === 'petugas'
  const isAdmin = auth?.user?.role === 'admin'

  async function loadAll() {
    if (!auth) return
    setLoading(true)
    try {
      const [matrixRes, monthlyRes, cctvRes, issueRes, checkRes, userRes] = await Promise.all([
        api.get('/reports/daily', { params: { date } }),
        api.get('/reports/monthly', { params: { month } }),
        api.get('/cctvs'),
        api.get('/issues', { params: { date } }),
        api.get('/checks', { params: { date } }),
        isAdmin ? api.get('/users') : Promise.resolve({ data: [] }),
      ])
      setMatrix(matrixRes.data)
      setMonthlyReport(monthlyRes.data)
      setCctvs(cctvRes.data)
      setIssues(issueRes.data.data || issueRes.data)
      setChecks(checkRes.data.data || checkRes.data)
      setUsers(userRes.data)
    } catch (error) {
      setMessage(error.response?.data?.message || 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth, date, month])

  function persistAuth(nextAuth) {
    setAuth(nextAuth)
    if (nextAuth) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth))
    else localStorage.removeItem(STORAGE_KEY)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Token may already be invalid; local logout should still continue.
    }
    persistAuth(null)
  }

  async function reportBlob(scope, format, period, preview = false) {
    const paramName = scope === 'monthly' ? 'month' : 'date'
    const url = `${API_URL}/reports/${scope}.${format}?${paramName}=${period}`
    const response = await axios.get(url, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    const href = URL.createObjectURL(response.data)
    if (preview) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }
    const link = document.createElement('a')
    link.href = href
    link.download = `laporan-cctv-${scope === 'monthly' ? 'bulanan' : 'harian'}-${period}.${format}`
    link.click()
    URL.revokeObjectURL(href)
  }

  function downloadReport(format) {
    return reportBlob('daily', format, date)
  }

  const selectedDay = Number(date.slice(8, 10))
  const availableDays = daysInMonth(month)

  function changeDashboardMonth(nextMonth) {
    const day = Math.min(selectedDay || 1, daysInMonth(nextMonth).length)
    setMonth(nextMonth)
    setDate(`${nextMonth}-${String(day).padStart(2, '0')}`)
  }

  function changeDashboardDay(nextDay) {
    setDate(`${month}-${String(nextDay).padStart(2, '0')}`)
  }

  if (!auth) {
    return <LoginScreen onLogin={persistAuth} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Camera size={28} />
          <div>
            <strong>CCTV Monitor</strong>
            <span>Exception Reporting</span>
          </div>
        </div>
        <nav>
          <NavButton icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavButton icon={AlertTriangle} label="Issue" active={view === 'issues'} onClick={() => setView('issues')} />
          <NavButton icon={FileText} label="Laporan" active={view === 'reports'} onClick={() => setView('reports')} />
          {isAdmin && <NavButton icon={Camera} label="CCTV" active={view === 'cctvs'} onClick={() => setView('cctvs')} />}
          {isAdmin && <NavButton icon={Users} label="User" active={view === 'users'} onClick={() => setView('users')} />}
        </nav>
        <div className="profile">
          <Shield size={18} />
          <div>
            <strong>{auth.user.name}</strong>
            <span>{roleLabels[auth.user.role]}</span>
          </div>
          <button className="icon-button" title="Logout" onClick={logout}><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>{viewTitle(view)}</h1>
            <p>{date}</p>
          </div>
          <div className="toolbar">
            {view !== 'reports' && (
              <>
                <input type="month" value={month} onChange={(event) => changeDashboardMonth(event.target.value)} />
                <select value={selectedDay} onChange={(event) => changeDashboardDay(event.target.value)}>
                  {availableDays.map((day) => <option key={day} value={day}>Tanggal {day}</option>)}
                </select>
              </>
            )}
            <button className="icon-button" title="Muat ulang" onClick={loadAll}><RefreshCw size={18} /></button>
            {view !== 'reports' && <button className="button secondary" onClick={() => downloadReport('csv')}><Download size={16} /> CSV</button>}
            {view !== 'reports' && <button className="button secondary" onClick={() => downloadReport('pdf')}><Download size={16} /> PDF</button>}
          </div>
        </header>

        {message && <div className="notice" onClick={() => setMessage('')}>{message}</div>}
        {loading && <div className="loading">Memuat data...</div>}

        {view === 'dashboard' && (
          <Dashboard matrix={matrix} onSelectIssue={setSelectedIssue} onSelectCheck={setSelectedCheck} />
        )}
        {view === 'issues' && (
          <IssueWorkspace
            api={api}
            cctvs={cctvs}
            issues={issues}
            checks={checks}
            date={date}
            canEdit={canEdit}
            onChanged={loadAll}
            onSelectIssue={setSelectedIssue}
            onSelectCheck={setSelectedCheck}
            setMessage={setMessage}
          />
        )}
        {view === 'reports' && (
          <ReportPanel
            date={date}
            setDate={setDate}
            month={month}
            setMonth={setMonth}
            matrix={matrix}
            monthlyReport={monthlyReport}
            issues={issues}
            onDownload={(scope, format, period) => reportBlob(scope, format, period)}
            onPreview={(scope, period) => reportBlob(scope, 'pdf', period, true)}
          />
        )}
        {view === 'cctvs' && isAdmin && <CctvManager api={api} cctvs={cctvs} onChanged={loadAll} setMessage={setMessage} />}
        {view === 'users' && isAdmin && <UserManager api={api} users={users} onChanged={loadAll} setMessage={setMessage} />}
      </main>

      {selectedIssue && (
        <IssueDetail
          api={api}
          issue={selectedIssue}
          canEdit={canEdit}
          onClose={() => setSelectedIssue(null)}
          onChanged={() => {
            setSelectedIssue(null)
            loadAll()
          }}
          setMessage={setMessage}
        />
      )}
      {selectedCheck && <CheckDetail check={selectedCheck} onClose={() => setSelectedCheck(null)} />}
    </div>
  )
}

function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await axios.post(`${API_URL}/auth/login`, form)
      onLogin(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <div className="login-brand"><Camera size={34} /><span>CCTV Exception Monitoring</span></div>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="button primary" disabled={loading}>{loading ? 'Masuk...' : 'Masuk'}</button>
      </form>
    </main>
  )
}

function Dashboard({ matrix, onSelectIssue, onSelectCheck }) {
  if (!matrix) return null
  const totals = matrix.rows.reduce((acc, row) => {
    row.hours.forEach((hour) => { acc[hour.status] = (acc[hour.status] || 0) + 1 })
    return acc
  }, {})
  const checkedHours = matrix.checks?.length || 0

  return (
    <section className="stack">
      <div className="metrics">
        <Metric label="CCTV aktif" value={matrix.rows.length} />
        <Metric label="Jam belum dicek" value={24 - checkedHours} />
        <Metric label="Jam dicek OK" value={checkedHours} tone="ok" />
        <Metric label="Masalah terbuka" value={totals.issue || 0} tone="danger" />
        <Metric label="Selesai" value={totals.resolved || 0} tone="info" />
      </div>
      <div className="status-legend">
        <span><i className="legend-box unchecked">0</i> Belum dicek</span>
        <span><i className="legend-box checked"><CheckCircle2 size={13} /></i> Sudah dicek</span>
        <span><i className="legend-box issue"><AlertTriangle size={13} /></i> Issue terbuka</span>
        <span><i className="legend-box resolved"><AlertTriangle size={13} /></i> Issue selesai</span>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="sticky-col">CCTV</th>
              {Array.from({ length: 24 }, (_, hour) => <th key={hour}>{hour}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.id}>
                <td className="sticky-col">
                  <strong>{row.name}</strong>
                  <span>{row.location_point}</span>
                </td>
                {row.hours.map((hour) => (
                  <td key={hour.hour}>
                    <button
                      className={`cell ${hour.status}`}
                      title={hour.issue?.description || hour.check?.notes || (hour.status === 'checked' ? 'Sudah dicek normal' : 'Belum dicek')}
                      onClick={() => {
                        if (hour.issue) onSelectIssue(hour.issue)
                        else if (hour.check) onSelectCheck(hour.check)
                      }}
                    >
                      {hour.status === 'unchecked' ? '0' : hour.status === 'checked' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function IssueWorkspace({ api, cctvs, issues, checks, date, canEdit, onChanged, onSelectIssue, onSelectCheck, setMessage }) {
  return (
    <section className="split-layout">
      {canEdit && (
        <div className="stack">
          <NormalCheckForm api={api} date={date} onChanged={onChanged} setMessage={setMessage} />
          <IssueForm api={api} cctvs={cctvs.filter((cctv) => cctv.is_active)} date={date} onChanged={onChanged} setMessage={setMessage} />
        </div>
      )}
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Aktivitas Hari Ini</h2>
            <p className="panel-subtitle">{checks.length} jam OK / {issues.length} issue</p>
          </div>
          <RefreshCw size={18} />
        </div>
        <div className="table-list">
          {checks.map((check) => (
            <button key={`check-${check.id}`} className="issue-row" onClick={() => onSelectCheck(check)}>
              <span className="status-dot checked" />
              <strong>Semua CCTV</strong>
              <span>{check.hour_block}:00</span>
              <span>OK</span>
              <small>Shift</small>
            </button>
          ))}
          {issues.map((issue) => (
            <button key={issue.id} className="issue-row" onClick={() => onSelectIssue(issue)}>
              <span className={`status-dot ${issue.is_resolved ? 'resolved' : 'issue'}`} />
              <strong>{issue.cctv?.name}</strong>
              <span>{issue.hour_block}:00</span>
              <span>{labelIssue(issue.issue_type)}</span>
              <small>{issue.is_resolved ? 'Selesai' : 'Terbuka'}</small>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function NormalCheckForm({ api, date, onChanged, setMessage }) {
  const [form, setForm] = useState({ check_date: date, hour_blocks: [new Date().getHours()], notes: '', evidence: null })

  useEffect(() => setForm((current) => ({ ...current, check_date: date })), [date])

  function toggleHour(hour) {
    setForm((current) => {
      const selected = current.hour_blocks.includes(hour)
        ? current.hour_blocks.filter((item) => item !== hour)
        : [...current.hour_blocks, hour].sort((a, b) => a - b)

      return { ...current, hour_blocks: selected }
    })
  }

  async function submit(event) {
    event.preventDefault()
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'hour_blocks') {
        value.forEach((hour) => payload.append('hour_blocks[]', hour))
        return
      }
      if (value !== null && value !== '') payload.append(key, value)
    })
    try {
      await api.post('/checks', payload)
      setForm({ ...form, notes: '', evidence: null })
      setMessage('Pengecekan OK berhasil disimpan.')
      onChanged()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Gagal menyimpan pengecekan.')
    }
  }

  return (
    <form className="panel form-grid action-panel check-panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <h2>Check Shift</h2>
          <p className="panel-subtitle">Satu bukti foto untuk semua CCTV pada jam terpilih</p>
        </div>
        <CheckCircle2 size={20} />
      </div>
      <label>Tanggal<input type="date" value={form.check_date} onChange={(event) => setForm({ ...form, check_date: event.target.value })} /></label>
      <div className="shift-preset-grid">
        {shiftPresets.map((shift) => (
          <button
            key={shift.label}
            type="button"
            className={`shift-card ${sameHours(form.hour_blocks, shift.hours) ? 'selected' : ''}`}
            onClick={() => setForm({ ...form, hour_blocks: shift.hours })}
          >
            <strong>{shift.label}</strong>
            <span>{shift.time}</span>
          </button>
        ))}
      </div>
      <div className="checklist-heading">
        <strong>Centang jam yang sudah dicek</strong>
        <div>
          <button type="button" className="mini-button" onClick={() => setForm({ ...form, hour_blocks: Array.from({ length: 24 }, (_, hour) => hour) })}>Semua</button>
          <button type="button" className="mini-button" onClick={() => setForm({ ...form, hour_blocks: [] })}>Kosongkan</button>
        </div>
      </div>
      <div className="hour-check-grid">
        {Array.from({ length: 24 }, (_, hour) => (
          <label key={hour} className={`hour-check ${form.hour_blocks.includes(hour) ? 'selected' : ''}`}>
            <input type="checkbox" checked={form.hour_blocks.includes(hour)} onChange={() => toggleHour(hour)} />
            <span>{hour}:00</span>
          </label>
        ))}
      </div>
      <label>Catatan<textarea rows="2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      <CameraField
        label="Bukti foto mewakili semua CCTV"
        file={form.evidence}
        onChange={(file) => setForm({ ...form, evidence: file })}
      />
      <button className="button primary"><Save size={16} /> Simpan {form.hour_blocks.length} Jam Check</button>
    </form>
  )
}

function IssueForm({ api, cctvs, date, onChanged, setMessage }) {
  const [form, setForm] = useState({ cctv_id: '', issue_date: date, hour_block: new Date().getHours(), issue_type: 'camera_offline', description: '', evidence: null })

  useEffect(() => setForm((current) => ({ ...current, issue_date: date })), [date])

  async function submit(event) {
    event.preventDefault()
    const payload = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== '') payload.append(key, value)
    })
    try {
      await api.post('/issues', payload)
      setForm({ ...form, description: '', evidence: null })
      setMessage('Issue berhasil disimpan.')
      onChanged()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Gagal menyimpan issue.')
    }
  }

  return (
    <form className="panel form-grid action-panel issue-panel" onSubmit={submit}>
      <div className="panel-heading">
        <div>
          <h2>Input Issue</h2>
          <p className="panel-subtitle">Catat CCTV yang bermasalah pada jam pengecekan</p>
        </div>
        <AlertTriangle size={20} />
      </div>
      <label>CCTV<select required value={form.cctv_id} onChange={(event) => setForm({ ...form, cctv_id: event.target.value })}>
        <option value="">Pilih CCTV</option>
        {cctvs.map((cctv) => <option key={cctv.id} value={cctv.id}>{cctv.name}</option>)}
      </select></label>
      <div className="form-two">
        <label>Tanggal<input type="date" value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value })} /></label>
        <label>Jam<select value={form.hour_block} onChange={(event) => setForm({ ...form, hour_block: event.target.value })}>
          {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{hour}:00</option>)}
        </select></label>
      </div>
      <label>Tipe<select value={form.issue_type} onChange={(event) => setForm({ ...form, issue_type: event.target.value })}>
        {issueTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Deskripsi<textarea required rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <CameraField
        label="Bukti visual"
        file={form.evidence}
        onChange={(file) => setForm({ ...form, evidence: file })}
      />
      <button className="button primary"><Save size={16} /> Simpan issue</button>
    </form>
  )
}

function CameraField({ label, file, onChange }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false

    async function startCamera() {
      stopCamera()
      setCameraError('')
      try {
        if (!window.isSecureContext) {
          setCameraError('Kamera diblok browser karena aplikasi dibuka lewat HTTP. Pakai HTTPS atau gunakan Pilih File.')
          return
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Browser tidak mendukung akses kamera di alamat ini. Gunakan Pilih File.')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        setCameraError('Kamera tidak bisa dibuka. Izinkan akses kamera, pakai HTTPS, atau gunakan Pilih File.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [open, facingMode])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function closeCamera() {
    stopCamera()
    setOpen(false)
  }

  async function capturePhoto() {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return
      const photo = new File([blob], `bukti-cctv-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onChange(photo)
      closeCamera()
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="camera-field">
      <div className="camera-field-header">
        <strong>{label}</strong>
        {file && <span>{file.name}</span>}
      </div>
      <div className="camera-actions">
        <button type="button" className="button secondary" onClick={() => setOpen(true)}><Camera size={16} /> Buka Kamera</button>
        <label className="file-fallback">
          Pilih File
          <input required={!file} type="file" accept="image/png,image/jpeg" capture="environment" onChange={(event) => onChange(event.target.files[0])} />
        </label>
      </div>
      {file && <div className="file-pill"><CheckCircle2 size={15} /> Foto siap diupload</div>}

      {open && (
        <div className="camera-modal">
          <div className="camera-sheet">
            <div className="panel-heading">
              <div>
                <h2>Kamera Bukti</h2>
                <p className="panel-subtitle">{facingMode === 'environment' ? 'Kamera belakang' : 'Kamera depan'}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeCamera}>x</button>
            </div>
            <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
            {cameraError && <div className="form-error">{cameraError}</div>}
            <div className="camera-toolbar">
              <button type="button" className="button secondary" onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}>
                <RefreshCw size={16} /> Ganti Kamera
              </button>
              <button type="button" className="button primary" onClick={capturePhoto}><Camera size={16} /> Ambil Foto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReportPanel({ date, setDate, month, setMonth, matrix, monthlyReport, issues, onDownload, onPreview }) {
  const [mode, setMode] = useState('monthly')
  const monthlyTotals = monthlyReport?.rows.reduce((acc, row) => {
    row.days.forEach((day) => {
      acc.total += day.issue_count
      acc.open += day.open_count
      acc.resolved += day.resolved_count
      acc.checked += day.checked_count
      if (day.status === 'unchecked') acc.uncheckedDays += 1
    })
    return acc
  }, { total: 0, open: 0, resolved: 0, checked: 0, uncheckedDays: 0 }) || { total: 0, open: 0, resolved: 0, checked: 0, uncheckedDays: 0 }
  const dailyTotals = matrix?.rows.reduce((acc, row) => {
    row.hours.forEach((hour) => { acc[hour.status] = (acc[hour.status] || 0) + 1 })
    return acc
  }, {}) || {}
  const period = mode === 'monthly' ? month : date

  return (
    <section className="stack">
      <div className="panel report-filter">
        <div className="segmented">
          <button className={mode === 'daily' ? 'active' : ''} onClick={() => setMode('daily')}>Per hari</button>
          <button className={mode === 'monthly' ? 'active' : ''} onClick={() => setMode('monthly')}>Per bulan</button>
        </div>
        {mode === 'daily' && <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />}
        {mode === 'monthly' && <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />}
      </div>
      <div className="metrics">
        <Metric label="CCTV aktif" value={matrix?.rows.length || 0} />
        <Metric label={mode === 'monthly' ? 'Jam dicek OK' : 'Jam dicek OK'} value={mode === 'monthly' ? (monthlyReport?.shift_check_count || 0) : (matrix?.checks?.length || 0)} tone="ok" />
        <Metric label={mode === 'monthly' ? 'Hari belum dicek' : 'Jam belum dicek'} value={mode === 'monthly' ? monthlyTotals.uncheckedDays : (24 - (matrix?.checks?.length || 0))} />
        <Metric label="Total issue" value={mode === 'monthly' ? monthlyTotals.total : issues.length} tone="danger" />
      </div>
      <div className="panel report-actions">
        <button className="button secondary" onClick={() => onPreview(mode, period)}><Eye size={18} /> Preview PDF</button>
        <button className="button secondary" onClick={() => onDownload(mode, 'csv', period)}><Download size={18} /> Unduh CSV</button>
        <button className="button secondary" onClick={() => onDownload(mode, 'pdf', period)}><FileText size={18} /> Unduh PDF</button>
      </div>
      {mode === 'daily' && <DailyReportMatrix matrix={matrix} />}
      {mode === 'monthly' && <MonthlyMatrix report={monthlyReport} />}
    </section>
  )
}

function DailyReportMatrix({ matrix }) {
  if (!matrix) return null

  return (
    <div className="matrix-wrap">
      <table className="matrix report-matrix">
        <thead>
          <tr>
            <th className="sticky-col">CCTV</th>
            {Array.from({ length: 24 }, (_, hour) => <th key={hour}>{hour}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.id}>
              <td className="sticky-col">
                <strong>{row.name}</strong>
                <span>{row.location_point}</span>
              </td>
              {row.hours.map((hour) => (
                <td key={hour.hour}>
                  <span
                    className={`report-cell ${hour.status}`}
                    title={hour.issue ? `${hour.issue_label}: ${hour.issue.description}` : (hour.check ? 'Sudah dicek normal' : 'Belum dicek')}
                  >
                    {hour.issue ? hour.issue_label : (hour.check ? 'OK' : '0')}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MonthlyMatrix({ report }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!report) return null
  const totalIssues = report.issue_details?.length || 0
  const openIssues = report.issue_details?.filter((issue) => !issue.is_resolved).length || 0
  const resolvedIssues = report.issue_details?.filter((issue) => issue.is_resolved).length || 0
  const affectedCctvs = new Set((report.issue_details || []).map((issue) => issue.cctv_name).filter(Boolean)).size

  return (
    <section className="stack">
      <div className="matrix-wrap">
        <table className="matrix monthly-matrix">
          <thead>
            <tr>
              <th className="sticky-col">CCTV</th>
              {Array.from({ length: report.days_in_month }, (_, index) => <th key={index + 1}>{index + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.id}>
                <td className="sticky-col">
                  <strong>{row.name}</strong>
                  <span>{row.location_point}</span>
                </td>
                {row.days.map((day) => (
                  <td key={day.date}>
                    <span
                      className={`day-cell ${day.status}`}
                      title={day.issue_count > 0 ? `${day.date}: ${day.issue_summary}` : (day.checked_count > 0 ? `${day.date}: ${day.checked_count} jam sudah dicek` : `${day.date}: belum dicek`)}
                    >
                      {day.issue_count > 0 ? `${day.issue_count} issue` : (day.checked_count > 0 ? 'OK' : '0')}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <div className="panel-heading">
          <h2>Daftar Bulan Kejadian</h2>
          <span>{totalIssues} issue</span>
        </div>
        {totalIssues > 0 ? (
          <button className="month-issue-row" onClick={() => setShowDetails(true)}>
            <div>
              <strong>{formatMonthLabel(report.month)}</strong>
              <span>{affectedCctvs} CCTV terdampak</span>
            </div>
            <div className="month-issue-stats">
              <span>{totalIssues} issue</span>
              <span>{openIssues} terbuka</span>
              <span>{resolvedIssues} selesai</span>
            </div>
            <span className="button secondary">Detail</span>
          </button>
        ) : (
          <p className="panel-subtitle">Tidak ada issue pada bulan ini.</p>
        )}
        {showDetails && <MonthlyIssueDetailModal report={report} onClose={() => setShowDetails(false)} />}
      </div>
    </section>
  )
}

function MonthlyIssueDetailModal({ report, onClose }) {
  return (
    <div className="modal-backdrop center" onClick={onClose}>
      <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <div>
            <h2>Detail Issue {formatMonthLabel(report.month)}</h2>
            <p className="panel-subtitle">{report.issue_details?.length || 0} issue tercatat</p>
          </div>
          <button className="icon-button" onClick={onClose}>x</button>
        </div>
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jam</th>
                <th>CCTV</th>
                <th>Lokasi</th>
                <th>Tipe</th>
                <th>Status</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {(report.issue_details || []).map((issue) => (
                <tr key={issue.id}>
                  <td>{issue.date}</td>
                  <td>{issue.hour_label}</td>
                  <td>{issue.cctv_name}</td>
                  <td>{issue.location_point}</td>
                  <td>{issue.issue_label}</td>
                  <td>{issue.is_resolved ? 'Selesai' : 'Terbuka'}</td>
                  <td>{issue.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function CctvManager({ api, cctvs, onChanged, setMessage }) {
  const [form, setForm] = useState({ name: '', location_point: '', notes: '' })

  async function submit(event) {
    event.preventDefault()
    await api.post('/cctvs', { ...form, is_active: true })
    setForm({ name: '', location_point: '', notes: '' })
    setMessage('CCTV berhasil ditambahkan.')
    onChanged()
  }

  async function toggle(cctv) {
    await api.patch(`/cctvs/${cctv.id}`, { is_active: !cctv.is_active })
    onChanged()
  }

  return (
    <section className="split-layout">
      <form className="panel form-grid" onSubmit={submit}>
        <div className="panel-heading"><h2>Master CCTV</h2><Plus size={18} /></div>
        <label>Nama<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Lokasi<input required value={form.location_point} onChange={(event) => setForm({ ...form, location_point: event.target.value })} /></label>
        <label>Catatan<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <button className="button primary"><Save size={16} /> Simpan CCTV</button>
      </form>
      <div className="panel table-list">
        {cctvs.map((cctv) => (
          <div className="entity-row" key={cctv.id}>
            <div><strong>{cctv.name}</strong><span>{cctv.location_point}</span></div>
            <button className="button secondary" onClick={() => toggle(cctv)}>{cctv.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
          </div>
        ))}
      </div>
    </section>
  )
}

function UserManager({ api, users, onChanged, setMessage }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' })

  async function submit(event) {
    event.preventDefault()
    await api.post('/users', form)
    setForm({ name: '', email: '', password: '', role: 'viewer' })
    setMessage('User berhasil ditambahkan.')
    onChanged()
  }

  return (
    <section className="split-layout">
      <form className="panel form-grid" onSubmit={submit}>
        <div className="panel-heading"><h2>User</h2><Users size={18} /></div>
        <label>Nama<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input required type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
        <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="admin">Admin</option>
          <option value="petugas">Petugas</option>
          <option value="viewer">Viewer</option>
        </select></label>
        <button className="button primary"><Save size={16} /> Simpan user</button>
      </form>
      <div className="panel table-list">
        {users.map((user) => (
          <div className="entity-row" key={user.id}>
            <div><strong>{user.name}</strong><span>{user.email}</span></div>
            <small>{roleLabels[user.role]}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

function IssueDetail({ api, issue, canEdit, onClose, onChanged, setMessage }) {
  const [note, setNote] = useState('')

  async function resolve() {
    try {
      await api.patch(`/issues/${issue.id}/resolve`, { resolution_note: note })
      setMessage('Issue ditandai selesai.')
      onChanged()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Gagal menyelesaikan issue.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <h2>{issue.cctv?.name}</h2>
          <button className="icon-button" onClick={onClose}>x</button>
        </div>
        <div className="detail-grid">
          <span>Tanggal</span><strong>{issue.issue_date}</strong>
          <span>Jam</span><strong>{issue.hour_block}:00</strong>
          <span>Tipe</span><strong>{labelIssue(issue.issue_type)}</strong>
          <span>Status</span><strong>{issue.is_resolved ? 'Selesai' : 'Terbuka'}</strong>
        </div>
        <p className="description">{issue.description}</p>
        {issue.evidence_url && <img className="evidence" src={absoluteStorageUrl(issue.evidence_url)} alt="Bukti visual CCTV" />}
        {issue.resolution_note && <p className="resolution"><Wrench size={16} /> {issue.resolution_note}</p>}
        {canEdit && !issue.is_resolved && (
          <div className="resolve-box">
            <textarea rows="3" placeholder="Catatan perbaikan" value={note} onChange={(event) => setNote(event.target.value)} />
            <button className="button primary" onClick={resolve}><CheckCircle2 size={16} /> Tandai selesai</button>
          </div>
        )}
      </aside>
    </div>
  )
}

function CheckDetail({ check, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="panel-heading">
          <h2>Check Shift Semua CCTV</h2>
          <button className="icon-button" onClick={onClose}>x</button>
        </div>
        <div className="detail-grid">
          <span>Tanggal</span><strong>{check.check_date}</strong>
          <span>Jam</span><strong>{check.hour_block}:00</strong>
          <span>Status</span><strong>OK / mewakili semua CCTV</strong>
          <span>Petugas</span><strong>{check.checker?.name || '-'}</strong>
        </div>
        {check.notes && <p className="description">{check.notes}</p>}
        {check.evidence_url && <img className="evidence" src={absoluteStorageUrl(check.evidence_url)} alt="Bukti pengecekan normal CCTV" />}
      </aside>
    </div>
  )
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={18} /> {label}</button>
}

function Metric({ label, value, tone = '' }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>
}

function labelIssue(type) {
  return issueTypes.find(([value]) => value === type)?.[1] || type
}

function viewTitle(view) {
  return {
    dashboard: 'Dashboard Harian',
    issues: 'Issue CCTV',
    reports: 'Laporan',
    cctvs: 'Master CCTV',
    users: 'Manajemen User',
  }[view]
}

function absoluteStorageUrl(url) {
  if (!url || url.startsWith('http')) return url
  return API_URL.replace('/api', '') + url
}

function formatMonthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1))
}

function rangeHours(start, end) {
  return Array.from({ length: end - start }, (_, index) => start + index)
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number)
  const total = new Date(year, monthNumber, 0).getDate()
  return Array.from({ length: total }, (_, index) => index + 1)
}

function sameHours(a, b) {
  return a.length === b.length && [...a].sort((x, y) => x - y).every((hour, index) => hour === [...b].sort((x, y) => x - y)[index])
}

export default App
