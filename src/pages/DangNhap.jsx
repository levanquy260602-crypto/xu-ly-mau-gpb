import { useState } from 'react'
import { supabase } from '../supabase'
import { loiDeHieu } from '../lib/format'

export default function DangNhap() {
  const [email, setEmail] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [quenMk, setQuenMk] = useState(false)
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState('')
  const [daGui, setDaGui] = useState(false)

  async function dangNhap(e) {
    e.preventDefault()
    setLoi(''); setDangGui(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: matKhau })
    setDangGui(false)
    if (error) setLoi(loiDeHieu(error))
  }

  async function guiLaiMatKhau(e) {
    e.preventDefault()
    setLoi(''); setDangGui(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setDangGui(false)
    if (error) setLoi(loiDeHieu(error))
    else setDaGui(true)
  }

  return (
    <div className="man-don">
      <form className="hop-don" onSubmit={quenMk ? guiLaiMatKhau : dangNhap}>
        <div className="ten-app ten-app-lon">
          <span className="logo" aria-hidden="true"><span /></span>
          <div>
            <strong>Xử lý mẫu</strong>
            <small>Khoa Giải phẫu bệnh</small>
          </div>
        </div>

        {quenMk && daGui ? (
          <p>Đã gửi email đặt lại mật khẩu tới <strong>{email}</strong>. Mở email và bấm vào liên kết để đặt mật khẩu mới.</p>
        ) : (
          <>
            <label className="truong">
              <span>Email</span>
              <input type="email" required autoComplete="username" value={email}
                onChange={(e) => setEmail(e.target.value)} />
            </label>
            {!quenMk && (
              <label className="truong">
                <span>Mật khẩu</span>
                <input type="password" required autoComplete="current-password" value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)} />
              </label>
            )}
            {loi && <p className="loi" role="alert">{loi}</p>}
            <button className="nut nut-chinh nut-rong" disabled={dangGui}>
              {dangGui ? 'Đang xử lý…' : quenMk ? 'Gửi email đặt lại mật khẩu' : 'Đăng nhập'}
            </button>
          </>
        )}
        <button type="button" className="nut-chu" onClick={() => { setQuenMk(!quenMk); setLoi(''); setDaGui(false) }}>
          {quenMk ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}
        </button>
      </form>
    </div>
  )
}

export function DatMatKhauMoi({ onXong }) {
  const [mk, setMk] = useState('')
  const [mk2, setMk2] = useState('')
  const [loi, setLoi] = useState('')
  const [dangGui, setDangGui] = useState(false)

  async function luu(e) {
    e.preventDefault()
    if (mk.length < 8) return setLoi('Mật khẩu cần ít nhất 8 ký tự.')
    if (mk !== mk2) return setLoi('Hai mật khẩu chưa khớp nhau.')
    setDangGui(true)
    const { error } = await supabase.auth.updateUser({ password: mk })
    setDangGui(false)
    if (error) setLoi(loiDeHieu(error))
    else onXong()
  }

  return (
    <div className="man-don">
      <form className="hop-don" onSubmit={luu}>
        <h1>Đặt mật khẩu mới</h1>
        <label className="truong">
          <span>Mật khẩu mới</span>
          <input type="password" autoComplete="new-password" value={mk} onChange={(e) => setMk(e.target.value)} />
        </label>
        <label className="truong">
          <span>Nhập lại mật khẩu mới</span>
          <input type="password" autoComplete="new-password" value={mk2} onChange={(e) => setMk2(e.target.value)} />
        </label>
        {loi && <p className="loi" role="alert">{loi}</p>}
        <button className="nut nut-chinh nut-rong" disabled={dangGui}>{dangGui ? 'Đang lưu…' : 'Lưu mật khẩu'}</button>
      </form>
    </div>
  )
}
