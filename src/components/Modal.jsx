import { useEffect, useRef } from 'react'

export default function Modal({ tieuDe, onDong, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => { if (d?.open) d.close() }
  }, [])

  return (
    <dialog
      ref={ref}
      className="hop-thoai"
      onCancel={(e) => { e.preventDefault(); onDong() }}
      onClick={(e) => { if (e.target === ref.current) onDong() }}
      aria-label={tieuDe}
    >
      <div className="hop-thoai-trong">
        <div className="hop-thoai-dau">
          <h2>{tieuDe}</h2>
          <button type="button" className="nut-dong" onClick={onDong} aria-label="Đóng">×</button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
