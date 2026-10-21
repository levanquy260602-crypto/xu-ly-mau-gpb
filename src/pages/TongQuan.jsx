import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useApp, quyen, layDanhGia } from '../lib/AppContext'
import { homNay, caHienTai, gioNgayVN, loiDeHieu, so } from '../lib/format'
import KhayLame from '../components/KhayLame'
import ChiTietLuot, { TruongLuotChay } from '../components/ChiTietLuot'
import Modal from '../components/Modal'

const formTrong = () => ({ ngay: homNay(), ca: caHienTai(), loai_lich: 'thuong_quy', so_lame: '', ghi_chu: '' })

export default function TongQuan() {
  const { me, cauHinh, tenNguoi, thongBao } = useApp()
  const [chuKy, setChuKy] = useState(undefined)
  const [loiTai, setLoiTai] = useState('')
  const [moThay, setMoThay] = useState(false)
  const [luotDangXem, setLuotDangXem] = useState(null)
  const [form, setForm] = useState(formTrong)
  const [loiForm, setLoiForm] = useState('')
  const [dangLuu, setDangLuu] = useState(false)

  const tai = useCallback(async () => {
    const { data, error } = await supabase
      .from('xlm_chu_ky')
      .select('*, xlm_luot_chay(*, xlm_danh_gia(*))')
      .eq('trang_thai', 'dang_dung')
      .order('ngay_thay', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) { setLoiTai(loiDeHieu(error)); return }
    setLoiTai('')
    setChuKy(data)
  }, [])

  useEffect(() => {
    tai()
    const onFocus = () => tai()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [tai])

  const luot = chuKy?.xlm_luot_chay || []
  const daChay = luot.length
  const toiDaLuot = chuKy?.so_luot_toi_da || cauHinh?.so_luot_chu_ky || 4
  const lameToiDa = chuKy?.lame_toi_da || cauHinh?.lame_toi_da || 110
  const conLuot = Math.max(0, toiDaLuot - daChay)
  const tongLame = luot.reduce((s, l) => s + l.so_lame, 0)
  const choDanhGia = luot.filter((l) => !layDanhGia(l)).length
  const daDu = chuKy && conLuot === 0

  async function ghiLuot(e) {
    e.preventDefault()
    const soLame = Number(form.so_lame)
    if (!Number.isInteger(soLame) || soLame < 1) return setLoiForm('Số lame phải là số nguyên lớn hơn 0.')
    if (soLame > lameToiDa) return setLoiForm(`Mỗi lượt chạy tối đa ${lameToiDa} lame.`)
    setDangLuu(true); setLoiForm('')
    const { error } = await supabase.from('xlm_luot_chay').insert({
      ngay: form.ngay, ca: form.ca, loai_lich: form.loai_lich,
      so_lame: soLame, ghi_chu: form.ghi_chu.trim() || null,
    })
    setDangLuu(false)
    if (error) return setLoiForm(loiDeHieu(error))
    thongBao(`Đã ghi nhận lượt ${daChay + 1} với ${soLame} lame.`)
    setForm({ ...formTrong(), loai_lich: form.loai_lich })
    tai()
  }

  if (loiTai) return <p className="loi" role="alert">{loiTai}</p>
  if (chuKy === undefined) return <p className="mo">Đang tải…</p>

  return (
    <div className="trang">
      <section className="khoi-chu-ky" aria-labelledby="tieu-de-chu-ky">
        <div className="chu-ky-dau">
          <div>
            <h1 id="tieu-de-chu-ky">
              {chuKy ? `Chu kỳ hóa chất số ${chuKy.id}` : 'Chưa có chu kỳ hóa chất'}
            </h1>
            {chuKy ? (
              <p className="mo">Thay lúc {gioNgayVN(chuKy.ngay_thay)}, người thay: {tenNguoi(chuKy.nguoi_thay)}</p>
            ) : (
              <p className="mo">Bấm Thay hóa chất để bắt đầu chu kỳ đầu tiên.</p>
            )}
          </div>
          {quyen.thayHoaChat(me) && (
            <button className={`nut ${daDu || !chuKy ? 'nut-chinh' : 'nut-phu'}`} onClick={() => setMoThay(true)}>
              Thay hóa chất
            </button>
          )}
        </div>

        {chuKy && (
          <>
            <KhayLame chuKy={chuKy} onChonLuot={setLuotDangXem} />
            <div className="so-lieu">
              <p><b>{daChay}/{toiDaLuot}</b> lượt đã chạy</p>
              <p><b>{so(conLuot * lameToiDa)}</b> lame còn chạy được tối đa</p>
              <p><b>{so(tongLame)}</b> lame đã chạy trong chu kỳ</p>
              <p><b>{choDanhGia}</b> lượt chờ đánh giá</p>
            </div>
            <p className="hoa-chat-chu-ky">
              Hóa chất đã dùng cho chu kỳ: cồn {so(chuKy.con_lit, 2)} lít, xylen {so(chuKy.xylen_lit, 2)} lít, sáp {so(chuKy.sap_kg, 2)} kg.
            </p>
            {chuKy.ghi_chu && <p className="giu-dong">Ghi chú: {chuKy.ghi_chu}</p>}
          </>
        )}
      </section>

      {daDu && (
        <p className="canh-bao" role="status">
          Chu kỳ này đã chạy đủ {toiDaLuot} lượt. Cần thay hóa chất trước lượt chạy tiếp theo.
        </p>
      )}
      {chuKy && conLuot === 1 && (
        <p className="canh-bao canh-bao-nhe" role="status">
          Còn 1 lượt nữa là hết chu kỳ. Chuẩn bị hóa chất cho lần thay tiếp theo.
        </p>
      )}

      {quyen.ghiLuotChay(me) && chuKy && !daDu && (
        <section className="khoi" aria-labelledby="tieu-de-ghi-luot">
          <h2 id="tieu-de-ghi-luot">Ghi nhận lượt {daChay + 1}</h2>
          <form className="luoi-form" onSubmit={ghiLuot}>
            <TruongLuotChay form={form} setForm={setForm} lameToiDa={lameToiDa} />
            {loiForm && <p className="loi truong-rong" role="alert">{loiForm}</p>}
            <div className="truong-rong">
              <button className="nut nut-chinh" disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Ghi nhận lượt chạy'}</button>
            </div>
          </form>
        </section>
      )}

      {moThay && (
        <HopThoaiThayHoaChat
          chuKy={chuKy} daChay={daChay} toiDaLuot={toiDaLuot}
          onDong={() => setMoThay(false)}
          onDaThay={() => { setMoThay(false); tai() }}
        />
      )}
      {luotDangXem && (
        <ChiTietLuot luot={luotDangXem} lameToiDa={lameToiDa}
          onDong={() => setLuotDangXem(null)} onDaThayDoi={tai} />
      )}
    </div>
  )
}

function HopThoaiThayHoaChat({ chuKy, daChay, toiDaLuot, onDong, onDaThay }) {
  const { cauHinh, thongBao } = useApp()
  const [ghiChu, setGhiChu] = useState('')
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)
  const thaySom = chuKy && daChay < toiDaLuot

  async function xacNhan(e) {
    e.preventDefault()
    if (thaySom && !ghiChu.trim()) return setLoi('Chu kỳ hiện tại chưa chạy đủ lượt, vui lòng ghi lý do thay sớm.')
    setDangLuu(true); setLoi('')
    // Định mức hóa chất, người thay, thời điểm thay do cơ sở dữ liệu tự điền
    const { error } = await supabase.from('xlm_chu_ky').insert({ ghi_chu: ghiChu.trim() || null })
    setDangLuu(false)
    if (error) return setLoi(loiDeHieu(error))
    thongBao('Đã thay hóa chất và bắt đầu chu kỳ mới.')
    onDaThay()
  }

  return (
    <Modal tieuDe="Thay hóa chất" onDong={onDong}>
      <form onSubmit={xacNhan}>
        <p>Xác nhận đã thay hóa chất cho máy xử lý mô. Phần mềm sẽ ghi nhận theo định mức:</p>
        {cauHinh && (
          <ul className="dinh-muc">
            <li><b>{so(cauHinh.con_lit, 2)}</b> lít cồn</li>
            <li><b>{so(cauHinh.xylen_lit, 2)}</b> lít xylen</li>
            <li><b>{so(cauHinh.sap_kg, 2)}</b> kg sáp</li>
          </ul>
        )}
        {thaySom && (
          <p className="canh-bao canh-bao-nhe">
            Chu kỳ số {chuKy.id} mới chạy {daChay}/{toiDaLuot} lượt. Nếu thay bây giờ, chu kỳ đó sẽ kết thúc sớm.
          </p>
        )}
        <label className="truong">
          <span>{thaySom ? 'Lý do thay sớm' : 'Ghi chú (không bắt buộc)'}</span>
          <textarea rows="2" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </label>
        {loi && <p className="loi" role="alert">{loi}</p>}
        <div className="hang-nut">
          <button className="nut nut-chinh" disabled={dangLuu}>{dangLuu ? 'Đang lưu…' : 'Xác nhận thay hóa chất'}</button>
          <button type="button" className="nut nut-phu" onClick={onDong}>Hủy</button>
        </div>
      </form>
    </Modal>
  )
}
