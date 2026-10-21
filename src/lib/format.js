const TZ = 'Asia/Ho_Chi_Minh'

// Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD
export function homNay() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
}

// Ca mặc định theo giờ hiện tại
export function caHienTai() {
  const gio = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  return gio < 12 ? 'sang' : 'chieu'
}

function toDate(d) {
  return typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00+07:00') : new Date(d)
}

export function ngayVN(d) {
  if (!d) return ''
  return toDate(d).toLocaleDateString('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function thuNgayVN(d) {
  if (!d) return ''
  const thu = toDate(d).toLocaleDateString('vi-VN', { timeZone: TZ, weekday: 'long' })
  return `${thu.charAt(0).toUpperCase()}${thu.slice(1)}, ${ngayVN(d)}`
}

export function gioNgayVN(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('vi-VN', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// Mốc đầu ngày theo giờ Việt Nam (để lọc trường timestamptz)
export function dauNgayVN(yyyyMmDd) {
  return new Date(yyyyMmDd + 'T00:00:00+07:00').toISOString()
}

export function congNgay(yyyyMmDd, n) {
  const d = new Date(yyyyMmDd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const so = (n, digits = 0) =>
  Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: digits })

export const TEN_CA = { sang: 'Sáng', chieu: 'Chiều' }
export const TEN_LICH = { thuong_quy: 'Thường quy', tang_ca: 'Tăng ca' }
export const TEN_KET_QUA = { dat: 'Đạt', khong_dat: 'Không đạt' }
export const TEN_VAI_TRO = { ktv: 'Kỹ thuật viên', doc_lame: 'Người đọc lame', quan_tri: 'Quản trị' }

// Thông báo lỗi dễ hiểu từ lỗi Supabase
export function loiDeHieu(err) {
  if (!err) return ''
  const m = err.message || String(err)
  if (/row-level security|permission denied/i.test(m)) return 'Tài khoản của bạn không có quyền làm thao tác này.'
  if (/Invalid login credentials/i.test(m)) return 'Email hoặc mật khẩu không đúng.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
  return m
}

// Xuất CSV mở được bằng Excel (có BOM để giữ tiếng Việt)
export function taiCSV(tenFile, cot, dong) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const noiDung = [cot.map(esc).join(','), ...dong.map((r) => r.map(esc).join(','))].join('\r\n')
  const blob = new Blob(['\ufeff' + noiDung], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = tenFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
