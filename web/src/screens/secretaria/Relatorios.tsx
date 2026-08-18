import { useState } from 'react'
import { RelatorioPasseios, PeriodoPicker, type Periodo } from '../coordenacao/Relatorios'

export default function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>({ inicio: '', fim: '' })

  return (
    <div className="flex flex-col gap-4">
      <PeriodoPicker periodo={periodo} onChange={setPeriodo} />
      <RelatorioPasseios periodo={periodo} />
    </div>
  )
}
