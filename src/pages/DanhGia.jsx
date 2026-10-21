import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useApp, quyen, layDanhGia } from '../lib/AppContext'
import { TEN_CA, TEN_LICH, TEN_KET_QUA, thuNgayVN, gioNgayVN, loiDeHieu, so } from '../lib/format'

export default function DanhGia() {
  const { me } = useApp()
  const [choDg, setChoDg] = useState(undefined)
  const [daDg, setDaDg] = useState([])
  const [loi, setLoi] = useState('')

  const tai = useCallback(async () => {
    const [cho, da] = await Promise.all([
      supabase.from('xlm_luot_chay')
        .select('*, xlm_danh_gia(*)')
        .is('xlm_danh_gia', null)
        .order('ngay', { ascending: true })
        .order('lan_thu', { ascending: true })
        .limit(200),
      supabase.from('xlm_luot_chay')
        .select('*, xlm_danh_gia!inner(*)')
        .order('ngay', { ascending: false })
        .order('id', { ascending: false })
        .limit(20),
    ])
    if (cho.error || da.error) { setLoi(loiDeHieu(cho.error || da.error)); return }
    setLoi('')
    setChoDg(cho.data)
    setDaDg(da.data)
  }, [])

  useEffect(() => { tai() }, [tai])

  if (loi) return <p className="loi" role="alert">{loi}</p>
  if (choDg === undefined) return <p className="mo">Đang tải…</p>

  const duocDanhGia = quyen.danhGia(me)

  return (
    <div className="trang">
      <section aria-labelledby="tieu-de-cho">
        <h1 id="tieu-de-cho">Chờ đánh giá {choDg.length > 0 && <span className="dem">{choDg.length}</span>}</h1>
        {!duocDanhGia && <p className="mo">Bạn chỉ xem được. Người đọc lame hoặc quản trị mới được đánh giá.</p>}
        {choDg.length === 0 ? (
          <p className="trong">Không còn lượt nào chờ đánh giá.</p>
        ) : (
          <div className="ds-the">
            {choDg.map((l) => <TheDanhGia key={l.id} luot={l} duocSua={duocDanhGia} onDaLuu={tai} />)}
          </div>
        )}
      </section>

      {daDg.length > 0 && (
        <section aria-labelledby="tieu-de-da">
          <h2 id="tieu-de-da">Đánh giá gần đây</h2>
          <div className="ds-the">
            {daDg.map((l) => <TheDanhGia key={l.id} luot={l} duocSua={duocDanhGia} onDaLuu={tai} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function TheDanhGia({ luot, duocSua, onDaLuu }) {
  const { tenNguoi, thongBao } = useApp()
  const dg = layDanhGia(luot)
  const [ketQua, setKetQua] = useState(dg?.ket_qua || '')
  const [ghiChu, setGhiChu] = useState(dg?.ghi_chu || '')
  const [dangSua, setDangSua] = useState(!dg)
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)

  async function luu(e) {
    e.preventDefault()
    if (!ketQua) return setLoi('Chọn Đạt hoặc Không đạt.')
    setDangLuu(true); setLoi('')
    const { error } = await supabase.from('xlm_danh_gia').upsert(
      { luot_chay_id: luot.id, ket_qua: ketQua, ghi_chu: ghiChu.trim() || null },
      { onConflict: 'luot_chay_id' },
    )
    setDangLuu(false)
    if (error) return setLoi(loiDeHieu(error))
    thongBao(`Đã lưu đánh giá lượt ${luot.lan_thu} (${TEN_KET_QUA[ketQua]}).`)
    setDangSua(false)
    onDaLuu()
  }

  const ten = `danh-gia-${luot.id}`

  return (
    <article className={`the-dg ${dg ? `the-${dg.ket_qua}` : ''}`}>
      <header>
        <strong>Lượt {luot.lan_thu}, chu kỳ số {luot.chu_ky_id}</strong>
        <span>{TEN_CA[luot.ca]}, {thuNgayVN(luot.ngay)}</span>
        <span className="mo nho">{so(luot.so_lame)} lame, {TEN_LICH[luot.loai_lich].toLowerCase()}, {tenNguoi(luot.nguoi_chay)} chạy</span>
        {luot.ghi_chu && <span className="mo nho giu-dong">Ghi chú khi chạy: {luot.ghi_chu}</span>}
      </header>

      {duocSua && dangSua ? (
        <form onSubmit={luu}>
          <fieldset className="chon-kq">
            <legend className="an-nhan">Kết quả</legend>
            <label className="kq-dat">
              <input type="radio" name={ten} value="dat" checked={ketQua === 'dat'} onChange={() => setKetQua('dat')} />
              <span>Đạt</span>
            </label>
            <label className="kq-khong_dat">
              <input type="radio" name={ten} value="khong_dat" checked={ketQua === 'khong_dat'} onChange={() => setKetQua('khong_dat')} />
              <span>Không đạt</span>
            </label>
          </fieldset>
          <label className="truong">
            <span>Ghi chú</span>
            <textarea rows="3" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)}
              placeholder={ketQua === 'khong_dat' ? 'Nhận xét để kỹ thuật viên cài lại quy trình' : ''} />
          </label>
          {loi && <p className="loi" role="alert">{loi}</p>}
          <div className="hang-nut">
            <button className="nut nut-chinh" disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu đánh giá'}</button>
            {dg && <button type="button" className="nut nut-phu" onClick={() => { setDangSua(false); setKetQua(dg.ket_qua); setGhiChu(dg.ghi_chu || '') }}>Hủy</button>}
          </div>
        </form>
      ) : dg ? (
        <div>
          <p><span className={`nhan-kq kq-${dg.ket_qua}`}>{TEN_KET_QUA[dg.ket_qua]}</span></p>
          {dg.ghi_chu && <p className="giu-dong">{dg.ghi_chu}</p>}
          <p className="mo nho">{tenNguoi(dg.nguoi_danh_gia)}, {gioNgayVN(dg.updated_at)}</p>
          {duocSua && <button className="nut nut-nho nut-phu" onClick={() => setDangSua(true)}>Sửa đánh giá</button>}
        </div>
      ) : (
        <p className="mo">Chưa có đánh giá.</p>
      )}
    </article>
  )
}
