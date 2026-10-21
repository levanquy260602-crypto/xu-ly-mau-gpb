import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

export function useApp() {
  return useContext(AppContext)
}

// Quyền theo vai trò
export const quyen = {
  thayHoaChat: (me) => ['ktv', 'quan_tri'].includes(me?.vai_tro),
  ghiLuotChay: (me) => ['ktv', 'quan_tri'].includes(me?.vai_tro),
  suaLuotChay: (me, luot) => me?.vai_tro === 'quan_tri' || (me?.vai_tro === 'ktv' && luot?.nguoi_chay === me.user_id),
  xoaLuotChay: (me) => me?.vai_tro === 'quan_tri',
  danhGia: (me) => ['doc_lame', 'quan_tri'].includes(me?.vai_tro),
  quanTri: (me) => me?.vai_tro === 'quan_tri',
}

// Đánh giá nhúng có thể trả về object hoặc mảng tùy phiên bản PostgREST
export function layDanhGia(luot) {
  const dg = luot?.xlm_danh_gia
  if (!dg) return null
  return Array.isArray(dg) ? dg[0] || null : dg
}
