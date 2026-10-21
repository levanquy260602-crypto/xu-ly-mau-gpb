import { useState } from 'react'
import { supabase } from '../supabase'
import { useApp, quyen, layDanhGia } from '../lib/AppContext'
import { TEN_CA, TEN_LICH, TEN_KET_QUA, thuNgayVN, gioNgayVN, loiDeHieu, so } from '../lib/format'
import Modal from './Modal'

export default function ChiTietLuot({ luot, lameToiDa, onDong, onDaThayDoi }) {
  const { me, tenNguoi, thongBao } = useApp()
  const [dangSua, setDangSua] = useState(false)
  const [form, setForm] = useState({
    ngay: luot.ngay, ca: luot.ca, loai_lich: luot.loai_lich,
    so_lame: String(luot.so_lame), ghi_chu: luot.ghi_chu || '',
  })
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)
  const dg = layDanhGia(luot)
  const duocSua = quyen.suaLuotChay(me, luot)
  const duocXoa = quyen.xoaLuotChay(me)

  async function luu(e) {
    e.preventDefault()
    const soLame = Number(form.so_lame)
    if (!Number.isInteger(soLame) || soLame < 1) return setLoi('Số lame phải là số nguyên lớn hơn 0.')
    if (lameToiDa && soLame > lameToiDa) return setLoi(`Mỗi lượt chạy tối đa ${lameToiDa} lame.`)
    setDangLuu(true); setLoi('')
    const { error } = await supabase.from('xlm_luot_chay').update({
      ngay: form.ngay, ca: form.ca, loai_lich: form.loai_lich,
      so_lame: soLame, ghi_chu: form.ghi_chu.trim() || null,
    }).eq('id', luot.id)
    setDangLuu(false)
    if (error) return setLoi(loiDeHieu(error))
    thongBao(`Đã lưu thay đổi lượt ${luot.lan_thu}.`)
    onDaThayDoi(); onDong()
  }

  async function xoa() {
    if (!window.confirm(`Xóa lượt ${luot.lan_thu}${dg ? ' và kết quả đánh giá của lượt này' : ''}? Thao tác vẫn được lưu trong nhật ký.`)) return
    setDangLuu(true)
    const { error } = await supabase.from('xlm_luot_chay').delete().eq('id', luot.id)
    setDangLuu(false)
    if (error) return setLoi(loiDeHieu(error))
    thongBao(`Đã xóa lượt ${luot.lan_thu}.`)
    onDaThayDoi(); onDong()
  }

  return (
    <Modal tieuDe={`Lượt ${luot.lan_thu}`} onDong={onDong}>
      {!dangSua ? (
        <>
          <dl className="danh-sach-tt">
            <dt>Thời gian</dt><dd>{TEN_CA[luot.ca]}, {thuNgayVN(luot.ngay)}</dd>
            <dt>Số lame</dt><dd>{so(luot.so_lame)}{lameToiDa ? ` / ${so(lameToiDa)}` : ''}</dd>
            <dt>Lịch</dt><dd>{TEN_LICH[luot.loai_lich]}</dd>
            <dt>Người chạy</dt><dd>{tenNguoi(luot.nguoi_chay)}</dd>
            {luot.ghi_chu && (<><dt>Ghi chú</dt><dd className="giu-dong">{luot.ghi_chu}</dd></>)}
          </dl>
          <div className="khoi-danh-gia">
            <h3>Đánh giá chất lượng</h3>
            {dg ? (
              <>
                <p><span className={`nhan-kq kq-${dg.ket_qua}`}>{TEN_KET_QUA[dg.ket_qua]}</span></p>
                {dg.ghi_chu && <p className="giu-dong">{dg.ghi_chu}</p>}
                <p className="mo nho">{tenNguoi(dg.nguoi_danh_gia)}, {gioNgayVN(dg.updated_at)}</p>
              </>
            ) : (
              <p className="mo">Chưa có đánh giá.</p>
            )}
          </div>
          {loi && <p className="loi" role="alert">{loi}</p>}
          {(duocSua || duocXoa) && (
            <div className="hang-nut">
              {duocSua && <button className="nut nut-phu" onClick={() => setDangSua(true)}>Sửa lượt chạy</button>}
              {duocXoa && <button className="nut nut-nguy-hiem" onClick={xoa} disabled={dangLuu}>Xóa lượt chạy</button>}
            </div>
          )}
        </>
      ) : (
        <form onSubmit={luu} className="luoi-form">
          <TruongLuotChay form={form} setForm={setForm} lameToiDa={lameToiDa} />
          {loi && <p className="loi" role="alert">{loi}</p>}
          <div className="hang-nut">
            <button className="nut nut-chinh" disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            <button type="button" className="nut nut-phu" onClick={() => setDangSua(false)}>Hủy</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// Các ô nhập dùng chung cho thêm mới và sửa lượt chạy
export function TruongLuotChay({ form, setForm, lameToiDa }) {
  const dat = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <>
      <label className="truong">
        <span>Ngày chạy</span>
        <input type="date" required value={form.ngay} onChange={dat('ngay')} />
      </label>
      <fieldset className="truong">
        <legend>Ca</legend>
        <div className="chon-doan">
          {Object.entries(TEN_CA).map(([k, v]) => (
            <label key={k}><input type="radio" name="ca" value={k} checked={form.ca === k} onChange={dat('ca')} /><span>{v}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset className="truong">
        <legend>Lịch</legend>
        <div className="chon-doan">
          {Object.entries(TEN_LICH).map(([k, v]) => (
            <label key={k}><input type="radio" name="loai_lich" value={k} checked={form.loai_lich === k} onChange={dat('loai_lich')} /><span>{v}</span></label>
          ))}
        </div>
      </fieldset>
      <label className="truong">
        <span>Số lame{lameToiDa ? ` (tối đa ${lameToiDa})` : ''}</span>
        <input type="number" inputMode="numeric" min="1" max={lameToiDa || undefined} step="1" required
          value={form.so_lame} onChange={dat('so_lame')} />
      </label>
      <label className="truong truong-rong">
        <span>Ghi chú</span>
        <textarea rows="2" value={form.ghi_chu} onChange={dat('ghi_chu')} />
      </label>
    </>
  )
}
