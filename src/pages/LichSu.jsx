import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useApp, layDanhGia } from '../lib/AppContext'
import { homNay, dauNgayVN, gioNgayVN, ngayVN, loiDeHieu, so, taiCSV, TEN_CA, TEN_LICH, TEN_KET_QUA } from '../lib/format'
import KhayLame from '../components/KhayLame'
import ChiTietLuot from '../components/ChiTietLuot'

function khoangThang(thang) {
  const [y, m] = thang.split('-').map(Number)
  const ketThuc = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { tu: dauNgayVN(`${thang}-01`), den: dauNgayVN(ketThuc) }
}

export default function LichSu() {
  const { tenNguoi } = useApp()
  const [thang, setThang] = useState(homNay().slice(0, 7))
  const [ds, setDs] = useState(undefined)
  const [loi, setLoi] = useState('')
  const [dangXem, setDangXem] = useState(null)

  const tai = useCallback(async () => {
    const { tu, den } = khoangThang(thang)
    const { data, error } = await supabase
      .from('xlm_chu_ky')
      .select('*, xlm_luot_chay(*, xlm_danh_gia(*))')
      .gte('ngay_thay', tu).lt('ngay_thay', den)
      .order('ngay_thay', { ascending: false })
    if (error) { setLoi(loiDeHieu(error)); return }
    setLoi(''); setDs(data)
  }, [thang])

  useEffect(() => { setDs(undefined); tai() }, [tai])

  function xuat() {
    const dong = []
    for (const ck of ds || []) {
      const luot = [...(ck.xlm_luot_chay || [])].sort((a, b) => a.lan_thu - b.lan_thu)
      if (luot.length === 0) {
        dong.push([ck.id, gioNgayVN(ck.ngay_thay), tenNguoi(ck.nguoi_thay), '', '', '', '', '', '', '', '', ''])
      }
      for (const l of luot) {
        const dg = layDanhGia(l)
        dong.push([
          ck.id, gioNgayVN(ck.ngay_thay), tenNguoi(ck.nguoi_thay),
          l.lan_thu, ngayVN(l.ngay), TEN_CA[l.ca], TEN_LICH[l.loai_lich], l.so_lame, tenNguoi(l.nguoi_chay),
          dg ? TEN_KET_QUA[dg.ket_qua] : 'Chờ đánh giá', dg ? tenNguoi(dg.nguoi_danh_gia) : '', dg?.ghi_chu || '',
        ])
      }
    }
    taiCSV(`lich-su-xu-ly-mau-${thang}.csv`,
      ['Chu kỳ', 'Thời điểm thay hóa chất', 'Người thay', 'Lượt', 'Ngày chạy', 'Ca', 'Lịch', 'Số lame',
        'Người chạy', 'Đánh giá', 'Người đánh giá', 'Ghi chú đánh giá'], dong)
  }

  return (
    <div className="trang">
      <div className="thanh-loc">
        <h1>Lịch sử</h1>
        <label className="truong truong-ngang">
          <span>Tháng</span>
          <input type="month" value={thang} max={homNay().slice(0, 7)} onChange={(e) => e.target.value && setThang(e.target.value)} />
        </label>
        {ds?.length > 0 && <button className="nut nut-phu" onClick={xuat}>Xuất file Excel (CSV)</button>}
      </div>
      <p className="mo nho">Hiển thị các chu kỳ có ngày thay hóa chất trong tháng đã chọn. Bấm vào một lượt để xem chi tiết.</p>

      {loi && <p className="loi" role="alert">{loi}</p>}
      {ds === undefined && !loi && <p className="mo">Đang tải…</p>}
      {ds?.length === 0 && <p className="trong">Tháng này chưa có lần thay hóa chất nào.</p>}

      {ds?.map((ck) => {
        const tong = (ck.xlm_luot_chay || []).reduce((s, l) => s + l.so_lame, 0)
        return (
          <section key={ck.id} className="khoi khoi-lich-su">
            <div className="chu-ky-dau">
              <div>
                <h2>Chu kỳ số {ck.id} {ck.trang_thai === 'dang_dung' && <span className="nhan-dang-dung">Đang dùng</span>}</h2>
                <p className="mo nho">
                  Thay lúc {gioNgayVN(ck.ngay_thay)} bởi {tenNguoi(ck.nguoi_thay)}.
                  {' '}{(ck.xlm_luot_chay || []).length}/{ck.so_luot_toi_da} lượt, {so(tong)} lame.
                </p>
                {ck.ghi_chu && <p className="nho giu-dong">Ghi chú: {ck.ghi_chu}</p>}
              </div>
            </div>
            <KhayLame chuKy={ck} nho onChonLuot={(l) => setDangXem({ luot: l, lameToiDa: ck.lame_toi_da })} />
          </section>
        )
      })}

      {dangXem && (
        <ChiTietLuot luot={dangXem.luot} lameToiDa={dangXem.lameToiDa}
          onDong={() => setDangXem(null)} onDaThayDoi={tai} />
      )}
    </div>
  )
}
