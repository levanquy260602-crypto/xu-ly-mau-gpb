import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useApp } from '../lib/AppContext'
import { TEN_VAI_TRO, gioNgayVN, loiDeHieu } from '../lib/format'

const MUC = [
  { id: 'nguoi-dung', ten: 'Người dùng' },
  { id: 'dinh-muc', ten: 'Định mức' },
  { id: 'nhat-ky', ten: 'Nhật ký thao tác' },
]

export default function QuanTri() {
  const [muc, setMuc] = useState('nguoi-dung')
  return (
    <div className="trang">
      <h1>Quản trị</h1>
      <div className="tab-con" role="tablist">
        {MUC.map((m) => (
          <button key={m.id} role="tab" aria-selected={muc === m.id} onClick={() => setMuc(m.id)}>{m.ten}</button>
        ))}
      </div>
      {muc === 'nguoi-dung' && <NguoiDung />}
      {muc === 'dinh-muc' && <DinhMuc />}
      {muc === 'nhat-ky' && <NhatKy />}
    </div>
  )
}

function NguoiDung() {
  const { me, nguoiDung, taiNguoiDung, thongBao } = useApp()
  const [form, setForm] = useState({ email: '', ho_ten: '', vai_tro: 'ktv' })
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)
  const ds = Object.values(nguoiDung).sort((a, b) => Number(b.hoat_dong) - Number(a.hoat_dong) || a.ho_ten.localeCompare(b.ho_ten, 'vi'))

  async function capQuyen(e) {
    e.preventDefault()
    setDangLuu(true); setLoi('')
    const { error } = await supabase.rpc('xlm_cap_quyen', {
      p_email: form.email, p_ho_ten: form.ho_ten, p_vai_tro: form.vai_tro,
    })
    setDangLuu(false)
    if (error) return setLoi(loiDeHieu(error))
    thongBao(`Đã cấp quyền cho ${form.ho_ten}.`)
    setForm({ email: '', ho_ten: '', vai_tro: 'ktv' })
    taiNguoiDung()
  }

  async function capNhat(u, thayDoi) {
    const { error } = await supabase.from('xlm_nguoi_dung').update(thayDoi).eq('user_id', u.user_id)
    if (error) return thongBao(loiDeHieu(error), 'loi')
    thongBao(`Đã cập nhật ${u.ho_ten}.`)
    taiNguoiDung()
  }

  return (
    <>
      <section className="khoi">
        <h2>Cấp quyền cho người dùng</h2>
        <p className="mo nho">
          Tạo tài khoản đăng nhập trước trong Supabase (Authentication, Users, Add user), sau đó nhập email đó ở đây để cấp quyền dùng phần mềm.
        </p>
        <form className="luoi-form" onSubmit={capQuyen}>
          <label className="truong"><span>Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="truong"><span>Họ tên</span>
            <input required value={form.ho_ten} onChange={(e) => setForm({ ...form, ho_ten: e.target.value })} />
          </label>
          <label className="truong"><span>Vai trò</span>
            <select value={form.vai_tro} onChange={(e) => setForm({ ...form, vai_tro: e.target.value })}>
              {Object.entries(TEN_VAI_TRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {loi && <p className="loi truong-rong" role="alert">{loi}</p>}
          <div className="truong-rong">
            <button className="nut nut-chinh" disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Cấp quyền'}</button>
          </div>
        </form>
      </section>

      <section className="khoi">
        <h2>Danh sách người dùng</h2>
        <div className="cuon-ngang">
          <table className="bang">
            <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {ds.map((u) => (
                <tr key={u.user_id} className={u.hoat_dong ? '' : 'dong-khoa'}>
                  <td>{u.ho_ten}{u.user_id === me.user_id && <span className="mo"> (bạn)</span>}</td>
                  <td>{u.email}</td>
                  <td>
                    <select aria-label={`Vai trò của ${u.ho_ten}`} value={u.vai_tro}
                      disabled={u.user_id === me.user_id}
                      onChange={(e) => capNhat(u, { vai_tro: e.target.value })}>
                      {Object.entries(TEN_VAI_TRO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    {u.user_id === me.user_id ? 'Đang hoạt động' : (
                      <button className="nut nut-nho nut-phu" onClick={() => capNhat(u, { hoat_dong: !u.hoat_dong })}>
                        {u.hoat_dong ? 'Khóa tài khoản' : 'Mở khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function DinhMuc() {
  const { cauHinh, taiCauHinh, thongBao } = useApp()
  const [form, setForm] = useState(null)
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)

  useEffect(() => {
    if (cauHinh) setForm({
      con_lit: String(cauHinh.con_lit), xylen_lit: String(cauHinh.xylen_lit), sap_kg: String(cauHinh.sap_kg),
      lame_toi_da: String(cauHinh.lame_toi_da), so_luot_chu_ky: String(cauHinh.so_luot_chu_ky),
    })
  }, [cauHinh])

  if (!form) return <p className="mo">Đang tải…</p>

  async function luu(e) {
    e.preventDefault()
    const gt = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)]))
    if (Object.values(gt).some((v) => !(v > 0))) return setLoi('Các giá trị phải là số lớn hơn 0.')
    if (!Number.isInteger(gt.lame_toi_da) || !Number.isInteger(gt.so_luot_chu_ky)) return setLoi('Số lame và số lượt phải là số nguyên.')
    setDangLuu(true); setLoi('')
    const { error } = await supabase.from('xlm_cau_hinh').update({ ...gt, updated_at: new Date().toISOString() }).eq('id', 1)
    setDangLuu(false)
    if (error) return setLoi(loiDeHieu(error))
    thongBao('Đã lưu định mức.')
    taiCauHinh()
  }

  const truong = (k, nhan, buoc = '0.01') => (
    <label className="truong"><span>{nhan}</span>
      <input type="number" min="0" step={buoc} required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  )

  return (
    <section className="khoi">
      <h2>Định mức một lần thay hóa chất</h2>
      <p className="mo nho">Thay đổi chỉ áp dụng cho các lần thay hóa chất từ nay về sau. Các chu kỳ cũ giữ nguyên số liệu đã ghi.</p>
      <form className="luoi-form" onSubmit={luu}>
        {truong('con_lit', 'Cồn (lít)')}
        {truong('xylen_lit', 'Xylen (lít)')}
        {truong('sap_kg', 'Sáp (kg)')}
        {truong('lame_toi_da', 'Số lame tối đa mỗi lượt', '1')}
        {truong('so_luot_chu_ky', 'Số lượt chạy mỗi lần thay', '1')}
        {loi && <p className="loi truong-rong" role="alert">{loi}</p>}
        <div className="truong-rong">
          <button className="nut nut-chinh" disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu định mức'}</button>
        </div>
      </form>
    </section>
  )
}

const TEN_BANG = {
  xlm_chu_ky: 'Chu kỳ hóa chất', xlm_luot_chay: 'Lượt chạy', xlm_danh_gia: 'Đánh giá',
  xlm_nguoi_dung: 'Người dùng', xlm_cau_hinh: 'Định mức',
}
const TEN_HANH_DONG = { INSERT: 'Thêm', UPDATE: 'Sửa', DELETE: 'Xóa' }
const BO_QUA = new Set(['updated_at', 'created_at'])

function tomTat(dong) {
  if (dong.hanh_dong === 'UPDATE' && dong.du_lieu_cu && dong.du_lieu_moi) {
    const doi = Object.keys(dong.du_lieu_moi).filter(
      (k) => !BO_QUA.has(k) && JSON.stringify(dong.du_lieu_cu[k]) !== JSON.stringify(dong.du_lieu_moi[k]))
    return doi.map((k) => `${k}: ${dong.du_lieu_cu[k] ?? '(trống)'} thành ${dong.du_lieu_moi[k] ?? '(trống)'}`).join('; ') || 'Không đổi nội dung'
  }
  const d = dong.du_lieu_moi || dong.du_lieu_cu || {}
  if (dong.bang === 'xlm_luot_chay') return `Lượt ${d.lan_thu}, chu kỳ ${d.chu_ky_id}, ${d.so_lame} lame, ngày ${d.ngay}`
  if (dong.bang === 'xlm_danh_gia') return `Lượt chạy mã ${d.luot_chay_id}: ${d.ket_qua === 'dat' ? 'Đạt' : 'Không đạt'}`
  if (dong.bang === 'xlm_chu_ky') return `Chu kỳ số ${d.id}`
  if (dong.bang === 'xlm_nguoi_dung') return `${d.ho_ten} (${d.email})`
  return ''
}

function NhatKy() {
  const { tenNguoi } = useApp()
  const [ds, setDs] = useState(undefined)
  const [loi, setLoi] = useState('')

  const tai = useCallback(async () => {
    const { data, error } = await supabase.from('xlm_nhat_ky').select('*')
      .order('thoi_diem', { ascending: false }).limit(200)
    if (error) return setLoi(loiDeHieu(error))
    setDs(data)
  }, [])

  useEffect(() => { tai() }, [tai])

  if (loi) return <p className="loi" role="alert">{loi}</p>
  if (!ds) return <p className="mo">Đang tải…</p>

  return (
    <section className="khoi">
      <h2>200 thao tác gần nhất</h2>
      <p className="mo nho">Nhật ký được ghi tự động và không ai sửa, xóa được từ phần mềm.</p>
      <div className="cuon-ngang">
        <table className="bang">
          <thead><tr><th>Thời điểm</th><th>Người</th><th>Thao tác</th><th>Nội dung</th></tr></thead>
          <tbody>
            {ds.map((d) => (
              <tr key={d.id}>
                <td className="khong-xuong-dong">{gioNgayVN(d.thoi_diem)}</td>
                <td>{d.nguoi ? tenNguoi(d.nguoi) : 'Hệ thống'}</td>
                <td>{TEN_HANH_DONG[d.hanh_dong]} {TEN_BANG[d.bang]?.toLowerCase()}</td>
                <td>{tomTat(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
