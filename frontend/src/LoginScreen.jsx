import { useState } from 'react'
import axios from 'axios'
import { Camera, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'

function LoginScreen({ apiUrl, onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${apiUrl}/auth/login`, form)
      onLogin(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-hero">
          <div className="login-mark"><Camera size={28} /></div>
          <div>
            <p className="login-eyebrow">CCTV Exception Monitoring</p>
            <h1>Monitoring shift CCTV yang ringan dan jelas.</h1>
            <p className="login-copy">Masuk untuk mencatat pengecekan, mengunggah bukti, dan melihat issue harian tanpa data yang berisik.</p>
          </div>
          <div className="login-highlights">
            <span><ShieldCheck size={16} /> Role access</span>
            <span><Camera size={16} /> Bukti visual</span>
          </div>
        </div>

        <form className="login-panel" onSubmit={submit}>
          <div className="login-panel-head">
            <div>
              <span>Masuk dashboard</span>
              <strong>Gunakan akun operasional</strong>
            </div>
            <ShieldCheck size={22} />
          </div>

          <label className="login-field">
            Email
            <span>
              <Mail size={18} />
              <input
                required
                autoComplete="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="nama@perusahaan.co.id"
              />
            </span>
          </label>

          <label className="login-field">
            Password
            <span>
              <LockKeyhole size={18} />
              <input
                required
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Masukkan password"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="button primary login-submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default LoginScreen
