import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, thieuCauHinh } from './supabase'
import { AppContext, quyen } from './lib/AppContext'
import { TEN_VAI_TRO, loiDeHieu } from './lib/format'
import DangNhap, { DatMatKhauMoi } from './pages/DangNhap'
import TongQuan from './pages/TongQuan'
import DanhGia from './pages/DanhGia'
import LichSu from './pages/LichSu'
import BaoCao from './pages/BaoCao'
import QuanTri from './pages/QuanTri'

const TRANG = [
  { id: 'tong-quan', ten: 'Tổng quan', Comp: TongQuan },
  { id: 'danh-gia', ten: 'Đánh giá lame', Comp: DanhGia },
  { id: 'lich-su', ten: 'Lịch sử', Comp: LichSu },
  { id: 'bao-cao', ten: 'Báo cáo', Comp: BaoCao },
  { id: 'quan-tri', ten: 'Quản trị', Comp: QuanTri, chiQuanTri: true },
]

function trangTuHash() {
  const h = window.location.hash.replace('#', '')
  return TRANG.some((t) => t.id === h) ? h : 'tong-quan'
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [dangKhoiPhuc, setDangKhoiPhuc] = useState(false)
  const [me, setMe] = useState(undefined)
  const [nguoiDung, setNguoiDung] = useState({})
  const [cauHinh, setCauHinh] = useState(null)
  const [trang, setTrang] = useState(trangTuHash)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (thieuCauHinh) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setDangKhoiPhuc(true)
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onHash = () => setTrang(trangTuHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const taiNguoiDung = useCallback(async () => {
    const { data, error } = await supabase.from('xlm_nguoi_dung').select('*').order('ho_ten')
    if (error) return
    setNguoiDung(Object.fromEntries((data || []).map((u) => [u.user_id, u])))
  }, [])

  const taiCauHinh = useCallback(async () => {
    const { data } = await supabase.from('xlm_cau_hinh').select('*').eq('id', 1).maybeSingle()
    if (data) setCauHinh(data)
  }, [])

  useEffect(() => {
    if (!session) { setMe(session === null ? null : undefined); return }
    let huy = false
    ;(async () => {
      const { data, error } = await supabase
        .from('xlm_nguoi_dung').select('*').eq('user_id', session.user.id).maybeSingle()
      if (huy) return
      if (error) { setMe({ loi: loiDeHieu(error) }); return }
      setMe(data || { chuaCapQuyen: true })
      if (data?.hoat_dong) { taiNguoiDung(); taiCauHinh() }
    })()
    return () => { huy = true }
  }, [session, taiNguoiDung, taiCauHinh])

  const thongBao = useCallback((noiDung, loai = 'ok') => {
    setToast({ noiDung, loai, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const ctx = useMemo(() => ({
    me, nguoiDung, cauHinh, thongBao, taiNguoiDung, taiCauHinh,
    tenNguoi: (id) => nguoiDung[id]?.ho_ten || 'Không rõ',
  }), [me, nguoiDung, cauHinh, thongBao, taiNguoiDung, taiCauHinh])

  if (thieuCauHinh) {
    return (
      <div className="man-don">
        <div className="hop-don">
          <h1>Chưa cấu hình kết nối</h1>
          <p>Thiếu biến môi trường <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code>.
            Thêm hai biến này trong Vercel (Settings, Environment Variables) hoặc file <code>.env</code> khi chạy trên máy, rồi triển khai lại.</p>
        </div>
      </div>
    )
  }

  if (session === undefined || (session && me === undefined)) {
    return <div className="man-don"><p className="mo">Đang tải…</p></div>
  }

  if (dangKhoiPhuc && session) {
    return <DatMatKhauMoi onXong={() => setDangKhoiPhuc(false)} />
  }

  if (!session) return <DangNhap />

  const dangXuat = () => supabase.auth.signOut()

  if (me?.loi || me?.chuaCapQuyen || !me?.hoat_dong) {
    return (
      <div className="man-don">
        <div className="hop-don">
          <h1>{me?.loi ? 'Không tải được tài khoản' : 'Tài khoản chưa được cấp quyền'}</h1>
          <p>
            {me?.loi
              ? me.loi
              : me?.chuaCapQuyen
                ? `Bạn đã đăng nhập bằng ${session.user.email}, nhưng tài khoản này chưa được cấp quyền dùng phần mềm. Nhờ quản trị viên vào mục Quản trị để cấp quyền.`
                : 'Tài khoản của bạn đã bị khóa. Liên hệ quản trị viên nếu cần mở lại.'}
          </p>
          <button className="nut nut-phu" onClick={dangXuat}>Đăng xuất</button>
        </div>
      </div>
    )
  }

  const trangHienThi = TRANG.filter((t) => !t.chiQuanTri || quyen.quanTri(me))
  const TrangHienTai = (trangHienThi.find((t) => t.id === trang) || trangHienThi[0]).Comp

  return (
    <AppContext.Provider value={ctx}>
      <header className="dau-trang">
        <div className="dau-trang-trong">
          <div className="ten-app">
            <span className="logo" aria-hidden="true"><span /></span>
            <div>
              <strong>Xử lý mẫu</strong>
              <small>Khoa Giải phẫu bệnh</small>
            </div>
          </div>
          <div className="tai-khoan">
            <span>{me.ho_ten}<small>{TEN_VAI_TRO[me.vai_tro]}</small></span>
            <button className="nut nut-nho nut-phu" onClick={dangXuat}>Đăng xuất</button>
          </div>
        </div>
        <nav className="dieu-huong" aria-label="Các mục chính">
          {trangHienThi.map((t) => (
            <a key={t.id} href={`#${t.id}`} aria-current={t.id === trang ? 'page' : undefined}>{t.ten}</a>
          ))}
        </nav>
      </header>
      <main className="noi-dung">
        <TrangHienTai />
      </main>
      {toast && (
        <div key={toast.id} className={`toast toast-${toast.loai}`} role="status">{toast.noiDung}</div>
      )}
    </AppContext.Provider>
  )
}
