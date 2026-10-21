import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { useApp, layDanhGia } from '../lib/AppContext'
import { homNay, congNgay, dauNgayVN, ngayVN, loiDeHieu, so, taiCSV, TEN_KET_QUA } from '../lib/format'

export default function BaoCao() {
  const { cauHinh } = useApp()
  const [tu, setTu] = useState(homNay().slice(0, 8) + '01')
  const [den, setDen] = useState(homNay())
  const [luot, setLuot] = useState(undefined)
  const [chuKy, setChuKy] = useState([])
  const [loi, setLoi] = useState('')

  const tai = useCallback(async () => {
    if (!tu || !den || tu > den) return
    const [a, b] = await Promise.all([
      supabase.from('xlm_luot_chay').select('*, xlm_danh_gia(*), xlm_chu_ky(lame_toi_da)')
        .gte('ngay', tu).lte('ngay', den).order('ngay'),
      supabase.from('xlm_chu_ky').select('*')
        .gte('ngay_thay', dauNgayVN(tu)).lt('ngay_thay', dauNgayVN(congNgay(den, 1))),
    ])
    if (a.error || b.error) { setLoi(loiDeHieu(a.error || b.error)); return }
    setLoi(''); setLuot(a.data); setChuKy(b.data)
  }, [tu, den])

  useEffect(() => { tai() }, [tai])

  const t = useMemo(() => {
    if (!luot) return null
    const kq = { dat: 0, khong_dat: 0, cho: 0 }
    let tongLame = 0, tongCongSuat = 0, thuongQuy = 0, tangCa = 0
    const theoNgay = {}
    for (const l of luot) {
      tongLame += l.so_lame
      tongCongSuat += l.xlm_chu_ky?.lame_toi_da || cauHinh?.lame_toi_da || 110
      if (l.loai_lich === 'tang_ca') tangCa++; else thuongQuy++
      const dg = layDanhGia(l)
      kq[dg ? dg.ket_qua : 'cho']++
      theoNgay[l.ngay] = (theoNgay[l.ngay] || 0) + l.so_lame
    }
    const daDg = kq.dat + kq.khong_dat
    return {
      soLuot: luot.length, tongLame, thuongQuy, tangCa, kq,
      tyLeDat: daDg ? (kq.dat / daDg) * 100 : null,
      congSuat: tongCongSuat ? (tongLame / tongCongSuat) * 100 : null,
      tbLame: luot.length ? tongLame / luot.length : 0,
      soLanThay: chuKy.length,
      con: chuKy.reduce((s, c) => s + Number(c.con_lit), 0),
      xylen: chuKy.reduce((s, c) => s + Number(c.xylen_lit), 0),
      sap: chuKy.reduce((s, c) => s + Number(c.sap_kg), 0),
      theoNgay: Object.entries(theoNgay),
    }
  }, [luot, chuKy, cauHinh])

  const maxNgay = t ? Math.max(1, ...t.theoNgay.map(([, v]) => v)) : 1

  function xuat() {
    const tieuDe = `Báo cáo xử lý mẫu từ ${ngayVN(tu)} đến ${ngayVN(den)}`
    taiCSV(`bao-cao-xu-ly-mau-${tu}-den-${den}.csv`, [tieuDe, ''], [
      ['Số lần thay hóa chất', t.soLanThay],
      ['Cồn đã dùng (lít)', so(t.con, 2)],
      ['Xylen đã dùng (lít)', so(t.xylen, 2)],
      ['Sáp đã dùng (kg)', so(t.sap, 2)],
      ['Số lượt chạy', t.soLuot],
      ['Lượt thường quy', t.thuongQuy],
      ['Lượt tăng ca', t.tangCa],
      ['Tổng số lame', t.tongLame],
      ['Trung bình lame mỗi lượt', so(t.tbLame, 1)],
      ['Công suất sử dụng máy (%)', t.congSuat == null ? '' : so(t.congSuat, 1)],
      [`Lượt ${TEN_KET_QUA.dat.toLowerCase()}`, t.kq.dat],
      [`Lượt ${TEN_KET_QUA.khong_dat.toLowerCase()}`, t.kq.khong_dat],
      ['Lượt chờ đánh giá', t.kq.cho],
      ['Tỷ lệ đạt (%)', t.tyLeDat == null ? '' : so(t.tyLeDat, 1)],
      [],
      ['Ngày', 'Số lame'],
      ...t.theoNgay.map(([d, v]) => [ngayVN(d), v]),
    ])
  }

  return (
    <div className="trang">
      <div className="thanh-loc">
        <h1>Báo cáo</h1>
        <label className="truong truong-ngang">
          <span>Từ ngày</span>
          <input type="date" value={tu} max={den} onChange={(e) => e.target.value && setTu(e.target.value)} />
        </label>
        <label className="truong truong-ngang">
          <span>Đến ngày</span>
          <input type="date" value={den} min={tu} onChange={(e) => e.target.value && setDen(e.target.value)} />
        </label>
        {t && <button className="nut nut-phu" onClick={xuat}>Xuất file Excel (CSV)</button>}
      </div>

      {loi && <p className="loi" role="alert">{loi}</p>}
      {!t && !loi && <p className="mo">Đang tải…</p>}

      {t && (
        <>
          <div className="luoi-bao-cao">
            <section className="khoi">
              <h2>Hóa chất</h2>
              <p className="chi-so"><b>{t.soLanThay}</b> lần thay hóa chất</p>
              <dl className="danh-sach-tt">
                <dt>Cồn</dt><dd>{so(t.con, 2)} lít</dd>
                <dt>Xylen</dt><dd>{so(t.xylen, 2)} lít</dd>
                <dt>Sáp</dt><dd>{so(t.sap, 2)} kg</dd>
              </dl>
            </section>
            <section className="khoi">
              <h2>Lượt chạy</h2>
              <p className="chi-so"><b>{so(t.tongLame)}</b> lame trong {t.soLuot} lượt</p>
              <dl className="danh-sach-tt">
                <dt>Thường quy</dt><dd>{t.thuongQuy} lượt</dd>
                <dt>Tăng ca</dt><dd>{t.tangCa} lượt</dd>
                <dt>Trung bình</dt><dd>{so(t.tbLame, 1)} lame mỗi lượt</dd>
                <dt>Công suất máy</dt><dd>{t.congSuat == null ? 'Chưa có dữ liệu' : `${so(t.congSuat, 1)}%`}</dd>
              </dl>
            </section>
            <section className="khoi">
              <h2>Chất lượng lame</h2>
              <p className="chi-so"><b>{t.tyLeDat == null ? 'Chưa có' : `${so(t.tyLeDat, 1)}%`}</b> lượt đạt</p>
              <div className="thanh-ty-le" aria-hidden="true">
                <span className="phan-dat" style={{ flexGrow: t.kq.dat }} />
                <span className="phan-khong-dat" style={{ flexGrow: t.kq.khong_dat }} />
                <span className="phan-cho" style={{ flexGrow: t.kq.cho }} />
              </div>
              <dl className="danh-sach-tt">
                <dt>Đạt</dt><dd>{t.kq.dat} lượt</dd>
                <dt>Không đạt</dt><dd>{t.kq.khong_dat} lượt</dd>
                <dt>Chờ đánh giá</dt><dd>{t.kq.cho} lượt</dd>
              </dl>
            </section>
          </div>

          <section className="khoi">
            <h2>Số lame theo ngày</h2>
            {t.theoNgay.length === 0 ? (
              <p className="trong">Không có lượt chạy nào trong khoảng thời gian này.</p>
            ) : (
              <div className="bieu-do-ngay">
                {t.theoNgay.map(([d, v]) => (
                  <div key={d} className="cot-ngay">
                    <span className="ngay-nhan">{ngayVN(d).slice(0, 5)}</span>
                    <span className="thanh-ngay"><span style={{ width: `${(v / maxNgay) * 100}%` }} /></span>
                    <span className="gia-tri">{so(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
