import { useState, type ChangeEvent } from 'react'

export interface Anexo {
  nome: string
  tipo: string
  dataUrl: string
}

export function FileAttach({
  value,
  onChange,
  accept,
  label,
  maxSizeMB = 8,
}: {
  value: Anexo | null
  onChange: (anexo: Anexo | null) => void
  accept?: string
  label: string
  maxSizeMB?: number
}) {
  const [erro, setErro] = useState('')

  async function selecionar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErro('')
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErro(`Arquivo muito grande — o limite do protótipo é ${maxSizeMB}MB.`)
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    onChange({ nome: file.name, tipo: file.type, dataUrl })
  }

  const inputCls = 'rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-[13.5px] outline-none focus:border-blue'

  if (value) {
    const ehImagem = value.tipo.startsWith('image/')
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper-raised p-2.5">
        {ehImagem ? (
          <img src={value.dataUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-paper-sunken text-[10px] font-bold text-muted">
            ARQUIVO
          </div>
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{value.nome}</span>
        <button type="button" onClick={() => onChange(null)} className="flex-shrink-0 text-[12px] font-bold text-red">
          Remover
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className={`${inputCls} flex cursor-pointer items-center justify-center text-center text-muted`}>
        {label}
        <input autoComplete="off" type="file" accept={accept} className="hidden" onChange={selecionar} />
      </label>
      {erro && <p className="mt-1 text-[11.5px] font-semibold text-red">{erro}</p>}
    </div>
  )
}
