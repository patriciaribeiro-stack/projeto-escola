import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EventosTab from './EventosTab'
import AchadosTab from './AchadosTab'
import AlimentacaoTab from './AlimentacaoTab'
import AtendimentosTab from './AtendimentosTab'

type Tab = 'eventos' | 'alimentacao' | 'achados' | 'atendimentos'

const TABS: [Tab, string][] = [
  ['eventos', 'Eventos'],
  ['alimentacao', 'Alimentação'],
  ['achados', 'Achados e Perdidos'],
  ['atendimentos', 'Reuniões'],
]

export default function Escola() {
  const [params] = useSearchParams()
  const tabInicial = (params.get('tab') as Tab) || 'eventos'
  const [tab, setTab] = useState<Tab>(tabInicial)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-paper-sunken p-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 whitespace-nowrap rounded-lg border border-line py-2 px-2 text-[12.5px] font-bold transition-colors ${
              tab === key ? 'bg-paper-raised text-ink shadow-sm' : 'bg-green-light text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'eventos' && <EventosTab />}
      {tab === 'alimentacao' && <AlimentacaoTab />}
      {tab === 'achados' && <AchadosTab />}
      {tab === 'atendimentos' && <AtendimentosTab />}
    </div>
  )
}
