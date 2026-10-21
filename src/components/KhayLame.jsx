import { layDanhGia } from '../lib/AppContext'
import { TEN_CA, TEN_KET_QUA, ngayVN, so } from '../lib/format'

// Mỗi lượt chạy được vẽ như một lame kính: phần mờ bên trái là nhãn,
// phần nhuộm bên phải đầy dần theo số lame của lượt đó so với công suất máy.
export default function KhayLame({ chuKy, onChonLuot, nho = false }) {
  const luotTheoThuTu = [...(chuKy.xlm_luot_chay || [])].sort((a, b) => a.lan_thu - b.lan_thu)
  const soO = Math.max(chuKy.so_luot_toi_da, luotTheoThuTu.length)
  const o = Array.from({ length: soO }, (_, i) => luotTheoThuTu[i] || null)

  return (
    <ol className={`khay ${nho ? 'khay-nho' : ''}`} aria-label="Các lượt chạy trong chu kỳ">
      {o.map((luot, i) => {
        if (!luot) {
          return (
            <li key={`trong-${i}`} className="o-lame o-trong">
              <div className="lame" aria-hidden="true"><span className="nhan-lame">{i + 1}</span></div>
              <div className="thong-tin-lame">
                <strong>Lượt {i + 1}</strong>
                <span className="mo">Chưa chạy</span>
              </div>
            </li>
          )
        }
        const dg = layDanhGia(luot)
        const tyLe = Math.min(100, Math.round((luot.so_lame / chuKy.lame_toi_da) * 100))
        const Noi = onChonLuot ? 'button' : 'div'
        return (
          <li key={luot.id} className="o-lame">
            <Noi
              className="o-lame-bam"
              {...(onChonLuot ? { type: 'button', onClick: () => onChonLuot(luot) } : {})}
              aria-label={onChonLuot ? `Xem lượt ${luot.lan_thu}` : undefined}
            >
              <div className="lame" aria-hidden="true">
                <span className="nhan-lame">{luot.lan_thu}</span>
                <span className="vung-mo"><span className="mo-nhuom" style={{ width: `${tyLe}%` }} /></span>
              </div>
              <div className="thong-tin-lame">
                <strong>Lượt {luot.lan_thu}</strong>
                <span>{TEN_CA[luot.ca]} {ngayVN(luot.ngay)}</span>
                <span className="so-lame"><b>{so(luot.so_lame)}</b> / {so(chuKy.lame_toi_da)} lame</span>
                <span className={`nhan-kq ${dg ? `kq-${dg.ket_qua}` : 'kq-cho'}`}>
                  {dg ? TEN_KET_QUA[dg.ket_qua] : 'Chờ đánh giá'}
                </span>
              </div>
            </Noi>
          </li>
        )
      })}
    </ol>
  )
}
