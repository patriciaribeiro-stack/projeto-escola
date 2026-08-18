import { useRef, useState, type PointerEvent } from 'react'

export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const desenhou = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  const getCtx = () => canvasRef.current?.getContext('2d')

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = point(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = point(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#2e7fb8'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    if (!desenhou.current) {
      desenhou.current = true
      setHasSignature(true)
    }
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    if (desenhou.current) onChange(canvasRef.current?.toDataURL('image/png') ?? null)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    desenhou.current = false
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border-[1.5px] border-dashed border-line bg-paper-sunken">
        <canvas
          ref={canvasRef}
          width={400}
          height={140}
          className="h-[110px] w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-faint">
            Assine com o dedo aqui
          </div>
        )}
      </div>
      {hasSignature && (
        <button type="button" onClick={clear} className="mt-2 text-xs font-semibold text-muted underline">
          Limpar assinatura
        </button>
      )}
    </div>
  )
}
